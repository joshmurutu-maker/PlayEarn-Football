# Circle USDC integration runbook

## Current status

Provider selected: Circle. Asset agreed: USDC. Integration status: not connected. Production payments, deposits, withdrawals and payouts remain disabled.

## Scope verified from Circle documentation

Circle's supported-chain matrix lists USDC Crypto Deposits and Crypto Payouts on Arbitrum, Ethereum and Polygon PoS. Tron is not listed for those APIs. Circle documents that its Circle Mint and related APIs support USDC/EURC on listed chains and warns against sending unsupported assets such as USDT or bridged USDC to a Circle Mint address.

Source: https://developers.circle.com/circle-mint/supported-chains-and-currencies

## Required customer actions

1. Apply for the Circle product appropriate to PlayEarn's business model.
2. Complete Circle's KYB/KYC and compliance review. Confirm Kenya eligibility, use-case approval and supported payout destinations with Circle.
3. Obtain sandbox access and use the sandbox first.
4. Add secrets only in Vercel Project Settings → Environment Variables. Never commit or message API keys.
5. Confirm with Circle whether the selected product supports individual end-user address provisioning and the required creator/participant flow. Do not assume Circle Mint provides per-user custody wallets.
6. Supply the Circle product/account selection and sandbox readiness status to the engineering team; do not share secrets.

## Engineering gates

- Implement only documented API endpoints available to the approved account.
- Use a durable database and verified, replay-protected Circle webhooks.
- Ensure event idempotency and reconcile webhook events with Circle API state.
- Never credit user balances from client-side events.
- Keep test and production credentials, URLs and webhooks separate.
- Require explicit operational approval, compliance checks and security review before enabling production.
- Test deposits, payout failures, duplicate webhooks, reversals, rate limits, reconciliation and destination validation.

## Product rules

- Creator and participant balances remain separate.
- Proposed payout threshold: USD 50 equivalent.
- Proposed owner revenue destination network: Arbitrum One.
- The configured owner destination is not a participant wallet and must never be displayed as a deposit address.
- Do not enable USDT or Tron within the Circle integration.
- No automatic swap or ETH conversion is part of this USDC design. Any later conversion requires a separately reviewed provider, quote/slippage controls and explicit approval.
