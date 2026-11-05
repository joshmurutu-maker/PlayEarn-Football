/** PlayEarn Football local revenue API. Production money movement is deliberately fail-closed. */
import http from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { JsonRpcProvider, Wallet, parseEther, isAddress } from 'ethers';

const PORT = Number(process.env.API_PORT || 8787);
const DATA_FILE = process.env.PEF_LEDGER_FILE || join(process.cwd(), 'data', 'revenue-ledger.json');
const ADMIN_TOKEN = process.env.PEF_ADMIN_TOKEN || '';
const PAYOUT_THRESHOLD_USD = 50;
const DESTINATION = process.env.PEF_PAYOUT_DESTINATION || '0x8ADA31eC4E4B58d6DE5545A4dbd4C4c2b436B8Ea';
const ARBITRUM_ONE_CHAIN_ID = 42161;
const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
const TESTNET_TRANSFER_ENABLED = process.env.PEF_ENABLE_TESTNET_TRANSFERS === 'true';
const TESTNET_MAX_TRANSFER_ETH = '0.001';
const isProduction = process.env.NODE_ENV === 'production';
let ledgerQueue = Promise.resolve();
const rateBuckets = new Map();

function json(res, status, value) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, max-age=0',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    ...(isProduction ? { 'strict-transport-security': 'max-age=31536000; includeSubDomains' } : {})
  });
  res.end(JSON.stringify(value));
}
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 16_384) throw Object.assign(new Error('Request too large'), { statusCode: 413 });
  }
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw Object.assign(new Error('Invalid JSON body'), { statusCode: 400 }); }
}
function authorized(req) {
  if (!ADMIN_TOKEN || (isProduction && ADMIN_TOKEN.length < 32)) return false;
  const supplied = req.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
  const a = Buffer.from(supplied), b = Buffer.from(ADMIN_TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}
function rateLimit(req, res, key, max = 30, windowMs = 60_000) {
  const now = Date.now();
  const bucketKey = `${key}:${req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'}`;
  const current = rateBuckets.get(bucketKey);
  if (!current || now - current.start >= windowMs) rateBuckets.set(bucketKey, { start: now, count: 1 });
  else if (++current.count > max) { json(res, 429, { error: 'Rate limit exceeded. Try again later.' }); return false; }
  return true;
}
async function loadLedger() {
  try {
    const parsed = JSON.parse(await readFile(DATA_FILE, 'utf8'));
    if (!parsed || !Array.isArray(parsed.entries) || !Array.isArray(parsed.payouts)) throw new Error('Invalid ledger format');
    return parsed;
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    return { version: 2, entries: [], payouts: [] };
  }
}
async function saveLedger(data) {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  const temp = `${DATA_FILE}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(data, null, 2), { mode: 0o600 });
  await rename(temp, DATA_FILE);
}
async function mutateLedger(fn) {
  const operation = ledgerQueue.then(async () => { const ledger = await loadLedger(); const result = await fn(ledger); await saveLedger(ledger); return result; });
  ledgerQueue = operation.catch(() => {});
  return operation;
}
function summary(ledger) {
  const settled = ledger.entries.filter(x => x.status === 'settled').reduce((s, x) => s + x.amountUsd, 0);
  const reversed = ledger.entries.filter(x => ['refunded', 'chargeback'].includes(x.status)).reduce((s, x) => s + x.amountUsd, 0);
  const reserves = ledger.entries.filter(x => x.status === 'reserve').reduce((s, x) => s + x.amountUsd, 0);
  const paid = ledger.payouts.filter(x => x.status === 'completed').reduce((s, x) => s + x.amountUsd, 0);
  const eligible = Math.max(0, settled - reversed - reserves - paid);
  return {
    currency: 'USD', grossSettledUsd: +settled.toFixed(2), refundsAndChargebacksUsd: +reversed.toFixed(2),
    reservesUsd: +reserves.toFixed(2), paidOutUsd: +paid.toFixed(2), eligibleBalanceUsd: +eligible.toFixed(2),
    thresholdUsd: PAYOUT_THRESHOLD_USD, thresholdReached: eligible >= PAYOUT_THRESHOLD_USD,
    destination: DESTINATION, network: 'arbitrum-one', chainId: ARBITRUM_ONE_CHAIN_ID, asset: 'ETH',
    livePaymentsEnabled: false, liveConversionEnabled: false, livePayoutsEnabled: false,
    testnetTransfersEnabled: TESTNET_TRANSFER_ENABLED, testnetChainId: ARBITRUM_SEPOLIA_CHAIN_ID
  };
}

export async function handler(req, res) {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return json(res, 200, {
        ok: true, service: 'playearn-revenue-api', mode: isProduction ? 'production-guarded' : 'development',
        productionNetwork: 'arbitrum-one', productionChainId: ARBITRUM_ONE_CHAIN_ID,
        testNetwork: 'arbitrum-sepolia', testChainId: ARBITRUM_SEPOLIA_CHAIN_ID,
        livePaymentsEnabled: false, liveConversionEnabled: false, livePayoutsEnabled: false
      });
    }
    if (url.pathname.startsWith('/api/admin/') && process.env.VERCEL === '1') return json(res, 503, { error: 'Financial API is not enabled on serverless hosting: a durable transactional database and audited payment integrations must be configured first.' });
    if (url.pathname.startsWith('/api/admin/') && !rateLimit(req, res, 'admin', 20)) return;
    if (req.method === 'GET' && url.pathname === '/api/admin/summary') {
      if (!authorized(req)) return json(res, 401, { error: 'Admin authentication required. Configure a random PEF_ADMIN_TOKEN of at least 32 characters.' });
      return json(res, 200, summary(await loadLedger()));
    }
    if (req.method === 'POST' && url.pathname === '/api/dev/settle-payment') {
      if (isProduction || process.env.PEF_ENABLE_DEMO_SETTLEMENTS !== 'true') return json(res, 403, { error: 'Demo settlement is disabled. Set PEF_ENABLE_DEMO_SETTLEMENTS=true only in a local non-production environment.' });
      const input = await readBody(req);
      if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0 || input.amountUsd > 100000) return json(res, 400, { error: 'amountUsd must be a positive number up to 100000.' });
      if (!['website', 'google-play'].includes(input.channel)) return json(res, 400, { error: 'channel must be website or google-play.' });
      const entry = await mutateLedger(ledger => {
        const item = { id: randomUUID(), channel: input.channel, providerReference: `DEMO-${randomUUID()}`, amountUsd: +input.amountUsd.toFixed(2), status: 'settled', createdAt: new Date().toISOString(), note: 'DEMO ONLY — not a real payment' };
        ledger.entries.push(item); return item;
      });
      return json(res, 201, { demo: true, entry, summary: summary(await loadLedger()) });
    }
    if (req.method === 'POST' && url.pathname === '/api/admin/payout/evaluate') {
      if (!authorized(req)) return json(res, 401, { error: 'Admin authentication required.' });
      const s = summary(await loadLedger());
      return json(res, 200, { eligible: s.thresholdReached, eligibleBalanceUsd: s.eligibleBalanceUsd, thresholdUsd: PAYOUT_THRESHOLD_USD, action: 'DRY_RUN_ONLY', network: 'arbitrum-one', chainId: ARBITRUM_ONE_CHAIN_ID, conversionProvider: 'NOT_CONFIGURED', transactionHash: null, message: s.thresholdReached ? 'Threshold reached. No payment provider, verified settlement feed, USDT swap integration, production signer or durable ledger is configured. No conversion or transfer was made.' : 'Threshold not reached. No conversion or transfer was made.' });
    }
    if (req.method === 'POST' && url.pathname === '/api/admin/blockchain/test-transfer') {
      if (!authorized(req)) return json(res, 401, { error: 'Admin authentication required.' });
      if (!rateLimit(req, res, 'test-transfer', 3, 60_000)) return;
      const input = await readBody(req);
      const amountEth = String(input.amountEth || '0.0001');
      let amountWei;
      try { amountWei = parseEther(amountEth); } catch { return json(res, 400, { error: 'amountEth must be a valid positive ETH decimal.' }); }
      if (amountWei <= 0n || amountWei > parseEther(TESTNET_MAX_TRANSFER_ETH)) return json(res, 400, { error: `Test transfer must be greater than zero and no more than ${TESTNET_MAX_TRANSFER_ETH} ETH.` });
      if (!isAddress(DESTINATION)) return json(res, 500, { error: 'Configured destination address is invalid.' });
      if (!TESTNET_TRANSFER_ENABLED) return json(res, 200, { mode: 'DRY_RUN_ONLY', network: 'arbitrum-sepolia', chainId: ARBITRUM_SEPOLIA_CHAIN_ID, destination: DESTINATION, amountEth, transactionHash: null, message: 'No transaction sent. This endpoint is testnet-only; production Arbitrum One transfers are not implemented.' });
      const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL;
      const privateKey = process.env.ARBITRUM_SEPOLIA_PRIVATE_KEY;
      if (!rpcUrl || !privateKey) return json(res, 503, { error: 'Missing server-side Arbitrum Sepolia RPC URL or test signer.' });
      const provider = new JsonRpcProvider(rpcUrl);
      const network = await provider.getNetwork();
      if (network.chainId !== BigInt(ARBITRUM_SEPOLIA_CHAIN_ID)) return json(res, 503, { error: `Refusing to send: RPC chain ID ${network.chainId}; expected ${ARBITRUM_SEPOLIA_CHAIN_ID}.` });
      const signer = new Wallet(privateKey, provider);
      const tx = await signer.sendTransaction({ to: DESTINATION, value: amountWei });
      const receipt = await tx.wait(1);
      if (!receipt || receipt.status !== 1) return json(res, 502, { error: 'Testnet transaction was not confirmed.', transactionHash: tx.hash });
      await mutateLedger(ledger => { ledger.payouts.push({ id: randomUUID(), status: 'testnet_completed', network: 'arbitrum-sepolia', chainId: ARBITRUM_SEPOLIA_CHAIN_ID, asset: 'ETH', amountEth, destination: DESTINATION, transactionHash: tx.hash, blockNumber: receipt.blockNumber, createdAt: new Date().toISOString(), note: 'TESTNET ONLY — no real monetary value' }); });
      return json(res, 200, { mode: 'TESTNET_SENT', network: 'arbitrum-sepolia', chainId: ARBITRUM_SEPOLIA_CHAIN_ID, from: signer.address, destination: DESTINATION, amountEth, transactionHash: tx.hash, blockNumber: receipt.blockNumber, explorerUrl: `https://sepolia.arbiscan.io/tx/${tx.hash}`, message: 'Testnet ETH transfer confirmed. This is not a mainnet payout.' });
    }
    return json(res, 404, { error: 'Not found' });
  } catch (e) {
    return json(res, e.statusCode || 400, { error: e.message || 'Bad request' });
  }
}

if (process.env.VERCEL !== '1') {
  const server = http.createServer((req, res) => { void handler(req, res); });
  server.listen(PORT, () => console.log(`PlayEarn revenue API listening on http://localhost:${PORT}`));
}
