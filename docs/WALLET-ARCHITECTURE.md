# Creator and Participant Wallet — integration requirements

The initial wallet interface is available at `/wallet/`. It is a presentation layer only; it does not generate, control, or claim to monitor deposit addresses.

## Roles and accounting

- Each authenticated user has a stable internal account ID and an explicit role: creator or participant.
- Creator revenue and participant rewards are separate sub-ledgers.
- Every credit/debit is an immutable, idempotent ledger entry linked to a verified source event.
- Game XP, client-side match results, and browser storage are never cash balances or proof of reward entitlement.
- Deposits are pending until the configured chain-specific confirmation/finality policy is met.

## Multi-chain USDT

Initial network candidates:
- Arbitrum One (chain ID 42161)
- Ethereum mainnet (chain ID 1)
- Polygon PoS (chain ID 137)
- Tron mainnet

Before enabling any network, operators must independently verify the official USDT contract/mint identifier, decimals, chain ID, RPC/indexer, finality policy, and supported deposit/withdrawal behavior. Do not identify tokens by symbol alone. Network-specific addresses and transaction hashes must never be mixed.

## Required production components

1. Authentication and account ownership verification, including role authorization.
2. BitGo custody integration (subject to BitGo enterprise approval and per-asset/network support verification) or reviewed smart-contract deposit architecture that can issue a unique address or memo per user and network. Never derive addresses from a frontend secret or expose signing keys.
3. Chain watchers that verify chain, token contract, destination, amount, transaction success, confirmations/finality, and replay/idempotency.
4. A durable transactional database with unique constraints on (chain, tx_hash, log_index) (or equivalent event identity), ledger balances, pending deposits, withdrawals, reconciliation and audit logs.
5. Payment/reward policy, creator revenue attribution, participant eligibility and anti-cheat checks, refunds/reserves, limits and disputes.
6. Withdrawal approval, sanctions/KYC/AML checks as required by the operating jurisdictions, managed signing, MFA/dual control, limits and alerts.
7. Sepolia/testnet and mainnet-fork tests, independent security review, and a controlled production canary.

## Current safety status

- No real deposit addresses are allocated.
- No deposits are monitored or credited.
- Creator and participant balances are not connected to a production ledger.
- Withdrawals, conversion and mainnet payouts remain disabled.
- Never send funds to the game's owner payout destination as a substitute for an account-specific deposit address.

The wallet page intentionally shows “ADDRESS PENDING” rather than displaying a shared or invented address. Enable deposits only after all required backend controls and network verifications are deployed.


## BitGo provider decision (2026-11-05)

BitGo replaces Circle as the selected custody and wallet infrastructure provider for Creator and Participant wallets. The application must integrate through a server-side BitGo REST API / JavaScript SDK or BitGo Express service; credentials must never be exposed in browser code or VITE-prefixed variables.

### Environment and rollout

- Start in BitGo's test environment at `https://app.bitgo-test.com/api/v2`; production is a separate environment at `https://app.bitgo.com/api/v2` and requires a separately provisioned enterprise and production access token.
- Configure `BITGO_ACCESS_TOKEN`, `BITGO_ENTERPRISE_ID`, and wallet IDs only as server-side secrets. Use least-privilege token scopes, IP restrictions, spending limits, rotation, and separate test/production credentials.
- Create distinct wallet mappings for each supported asset and network. Verify the exact asset coin identifier, token contract/mint, address format, decimals, deposit behavior, withdrawal flow, and network availability in BitGo's current supported-assets catalog before enabling a chain.
- Do not assume all four requested networks (Arbitrum One, Ethereum, Polygon, Tron) or USDT variants are enabled for this enterprise until BitGo confirms each specific asset/network combination.
- Use BitGo webhooks or authenticated polling plus chain confirmation/reconciliation. Verify webhook authenticity and idempotency before crediting balances.
- Use BitGo wallet policies, whitelists, spending limits, approvals, MFA and audit trails. No automatic withdrawal should be enabled until the approval model and payout controls are reviewed.
- Keep the existing USD 50 payout threshold and Arbitrum One owner destination as configuration only; neither is a user deposit address or proof of a live payout route.

### Deployment constraints and current status

The existing Vercel deployment is a frontend plus serverless API scaffold. Do not put BitGo Express, wallet passphrases, signing material, or production tokens in browser code or a transient serverless filesystem. A durable backend service and transactional database are required for wallet provisioning, event processing, reconciliation, and payout orchestration.

**Current status: provider selected; BitGo credentials, enterprise, wallets, webhooks, asset/network verification, and transaction workflows are not configured.** All real-money deposits, conversions, and payouts remain disabled. A successful site build or health check does not establish custody readiness.
