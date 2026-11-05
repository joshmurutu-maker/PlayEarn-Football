# PlayEarn Football — v0.6 deployment hardening package

This update prepares the playable football prototype for a Vercel static deployment and hardens its local revenue API. It does **not** claim that real-money payments, USDT-to-ETH conversion, or Arbitrum One payouts are live. Those functions remain fail-closed until the required durable database, payment processor/webhook, audited swap path, and managed signing service are connected and tested.

## Network configuration

- **Production target:** Arbitrum One, chain ID `42161`.
- **Test network:** Arbitrum Sepolia, chain ID `421614`.
- **Configured payout destination:** the project owner's supplied address in `.env.example`.
- **Payout threshold:** USD 50.
- **Payout asset target:** native ETH on Arbitrum One.
- Sepolia tokens have no real monetary value. Never use a production private key on Sepolia or a testnet key on mainnet.

Arbitrum's official chain documentation lists the chain IDs and RPC endpoints: https://docs.arbitrum.io/chain-info

## What changed in v0.6

- Added a Vercel catch-all API function and `vercel.json` SPA/API routing.
- Kept the game frontend deployable as a Vite static site.
- Removed implicit access to the demo settlement simulator: it now requires `PEF_ENABLE_DEMO_SETTLEMENTS=true` and is always blocked in production.
- Enforced a 32-character minimum admin token in production and timing-safe token comparison.
- Added API rate limits, request-size limits, JSON validation, security headers, and atomic local ledger writes.
- Separated Arbitrum One production identifiers from Arbitrum Sepolia test-transfer identifiers.
- Kept all real-money flags false and made payout evaluation explicitly dry-run only.
- Replaced floating `latest` dependency tags with explicit dependency versions. A lockfile still needs to be generated in a network-enabled build environment and committed before production release.

## Matchday music

The game includes links to Imagine Dragons playlist searches on Spotify and YouTube Music. PlayEarn Football does not bundle, stream, or redistribute copyrighted recordings; playback is handled by the user’s chosen music service and is subject to regional availability and that service’s terms.

## Local development

Use Node.js 22 or newer.

```bash
npm install
cp .env.example .env
npm run dev
```

In another terminal, start the local API:

```bash
npm run api
```

For demo ledger entries only, set `PEF_ENABLE_DEMO_SETTLEMENTS=true` in a local, non-production environment. Do not set it on Vercel.

Build the frontend:

```bash
npm run build
```

## Vercel deployment

1. Import the GitHub repository into Vercel.
2. Keep the project root at the repository root (`.`).
3. Framework preset: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Use Node.js 22 or newer for Functions.
7. Add environment variables only through Vercel Project Settings. Never commit `.env` or paste secrets into chat.

The frontend can deploy as a static prototype. The API's JSON ledger is local-development storage and is **not durable on Vercel/serverless functions**. Admin revenue and payout operations must not be treated as production-ready until a transactional managed database adapter is implemented and configured. Do not use a serverless filesystem as a financial ledger.

## Production money movement — not yet enabled

A safe real-money pipeline still requires all of the following:

1. A payment provider that has approved the actual game, rewards, country of operation, and crypto conversion business model.
2. Provider-specific checkout and signed webhook verification, including raw-body signature validation, idempotency, settlement confirmation, refunds, chargebacks, and reconciliation. A browser success redirect is never proof of payment.
3. A durable transactional database for payment events, balances, payout reservations, swap records, and immutable audit history.
4. A reviewed USDT contract allowlist on Arbitrum One and a verified deposit watcher. Token symbols alone are not proof of token identity.
5. A reviewed USDT-to-WETH/ETH swap route with quote validation, slippage limits, minimum output, deadline, pool/liquidity checks, and independent contract-address verification.
6. A managed signer (KMS/HSM or qualified custody provider), least-privilege permissions, withdrawal limits, MFA/dual approval, monitoring, and key rotation. Do not put a production private key in source code or frontend environment variables.
7. A reliable USD valuation source and payout policy. The $50 threshold must use reconciled, settled funds net of refunds, reserves, provider fees, gas, and pending withdrawals.
8. Legal, tax, KYC/AML, consumer-protection, platform-policy, and payment-provider approval for the jurisdictions served.
9. Sepolia end-to-end tests, mainnet fork tests, security review, and controlled low-value production canary before enabling payouts.

`PEF_ENABLE_MAINNET_PAYOUTS` is intentionally false and is only a documented placeholder. Setting it to `true` will not enable mainnet transfers in this version. No mainnet signer or swap implementation is present. This is deliberate: enabling a transfer flag without the controls above could irreversibly lose funds.

## Current API behavior

- `GET /api/health` — service/network status; confirms live payments and payouts are disabled.
- `GET /api/admin/summary` — local development ledger summary; requires admin bearer token.
- `POST /api/dev/settle-payment` — local demo only; requires `PEF_ENABLE_DEMO_SETTLEMENTS=true`; blocked in production.
- `POST /api/admin/payout/evaluate` — dry-run threshold evaluation only; no conversion or transfer.
- `POST /api/admin/blockchain/test-transfer` — Arbitrum Sepolia only, disabled by default and capped at `0.001 ETH`.

## Important limitations

- The game currently awards XP locally in browser storage. It is not authoritative and must not determine cash rewards. Server-side accounts, anti-cheat validation, match-result verification, and a reward liability ledger are still needed before cash rewards are offered.
- Google Play purchases require Play Billing and server-side purchase-token verification. Google Play proceeds are not instant USDT deposits.
- A successful Vite build does not prove the API, payment processor, smart contracts, or production signer are safe.
- This package is an engineering prototype, not legal, tax, custody, or investment advice.


## BitGo custody provider (Circle replacement)

BitGo is the selected custody provider for Creator and Participant wallets. The current application does not yet authenticate to BitGo or create wallets; this repository change records the provider decision and server-side configuration contract only.

1. Create a BitGo test account at https://app.bitgo-test.com and provision a test enterprise.
2. Create a least-privilege test access token and obtain the enterprise ID. Store both as server-side secrets only.
3. Verify BitGo support for each exact asset/network combination before configuring wallet IDs. Arbitrum One, Ethereum, Polygon and Tron are requested targets, not yet verified/enabled in this app.
4. Complete test wallet creation, address allocation, webhook verification, deposit confirmation, withdrawal approval and reconciliation tests.
5. Apply separately for production access at https://app.bitgo.com; use separate production credentials and IP restrictions.
6. Deploy the custody orchestration service and durable financial database outside the static frontend. Never expose BitGo credentials or signing secrets to the browser.

The existing $50 threshold and Arbitrum One payout destination remain configuration requirements, not live payout functionality. All real-money movement remains disabled until the full integration and security/compliance review are complete. See [docs/WALLET-ARCHITECTURE.md](docs/WALLET-ARCHITECTURE.md).
