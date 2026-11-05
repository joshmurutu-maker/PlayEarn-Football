# Creator and Participant Wallet — Circle USDC integration requirements

The wallet interface at `/wallet/` is a presentation-only prototype. It does not generate or control deposit addresses, monitor deposits, maintain balances, or send withdrawals.

## Agreed asset and network scope

The product direction is **USDC through Circle**, not USDT through Circle.

Circle's published Circle Mint supported-chains documentation lists USDC Crypto Deposits and Crypto Payouts API support for:
- Arbitrum One (Circle API chain code `ARB`, EVM chain ID 42161)
- Ethereum mainnet (Circle API chain code `ETH`, EVM chain ID 1)
- Polygon PoS (Circle API chain code `POLY`, EVM chain ID 137)

**Tron is not listed** for Circle's USDC Crypto Deposits/Payouts APIs and must remain unavailable in the Circle-powered wallet. Do not accept USDT or bridged/unsupported assets into a Circle Mint deposit flow. Verify current Circle documentation and the specific account's enabled capabilities before launch.

Official reference: https://developers.circle.com/circle-mint/supported-chains-and-currencies

## Circle product and onboarding gate

Circle Mint and Circle's developer wallet products are distinct. The implementation must select the Circle product for which PlayEarn is approved and which actually supports the intended account model, address allocation, deposit notifications and payouts. Do not assume a Circle Mint API credential automatically provides custodial per-user wallets or end-user subaccounts.

Before implementation can move beyond sandbox:
1. Complete Circle business onboarding and obtain approval for the relevant product and supported jurisdictions.
2. Confirm the legal entity, beneficial ownership, Kenya availability, permitted use case, limits, supported payout destinations and compliance requirements directly with Circle.
3. Confirm whether Circle Crypto Deposits/Payouts or Circle developer-controlled wallets are the correct product. Obtain written confirmation of account-specific feature access.
4. Create sandbox credentials first; keep API keys server-side in Vercel environment variables. Never put secrets in Git, frontend bundles, logs, or chat.
5. Configure and verify webhook signatures, idempotency, retry handling and event reconciliation before crediting any account.

## Roles and accounting

- Each authenticated user has a stable internal account ID and an explicit role: creator or participant.
- Creator revenue and participant rewards are separate sub-ledgers.
- Every credit/debit is an immutable, idempotent ledger entry linked to a verified source event.
- Game XP, client-side match results, and browser storage are never cash balances or proof of reward entitlement.
- Deposits are pending until Circle reports a final/settled state and the backend's reconciliation policy is satisfied.
- Never credit a deposit based only on a browser redirect, client callback, unverified webhook, or transaction hash submitted by a user.

## Production backend requirements

1. Authentication and account ownership verification, including role authorization.
2. A durable transactional database; the current file-backed JSON ledger is not suitable for Vercel serverless production.
3. Account-to-Circle-wallet/address mapping with unique constraints and audited provisioning.
4. Circle API adapter with separate sandbox and production base URLs, strict request validation, idempotency keys, timeouts and safe error handling.
5. Verified webhook signature validation, replay protection, event deduplication and reconciliation against Circle's API.
6. Chain/asset allowlists using Circle's exact chain codes and canonical USDC asset identifiers; never identify tokens by symbol alone.
7. Separate creator/participant ledgers, reward eligibility checks, refunds/reserves, limits, disputes and audit trails.
8. Withdrawal controls: KYC/AML and sanctions screening as applicable, allowlisted destinations, MFA, velocity/amount limits, manual review and dual control for sensitive operations.
9. Sandbox tests, failure/retry tests, webhook replay tests, reconciliation tests, independent security review and a limited production canary.

## Payout policy requirements

- Business rule requested: minimum payout threshold of **$50 USD equivalent**.
- Intended destination network: **Arbitrum One**.
- Previously supplied owner destination: `0x8ADA31eC4E4B58d6DE5545A4dbd4C4c2b436B8Ea`.

The destination is a proposed owner revenue destination only. It is not a participant deposit address, not a shared user wallet, and must not be used for participant payouts. Before any transfer, confirm the destination's ownership, recipient eligibility, asset (USDC), network and Circle product support. A $50 threshold is a policy setting, not authorization to automatically send funds.

## Current safety status

- Circle is selected as the intended provider, but no Circle account approval or API connection has been verified.
- No Circle credentials are configured or stored in this repository.
- No account-specific deposit addresses are provisioned.
- No deposits are monitored or credited.
- Creator and participant balances are not connected to a production ledger.
- Withdrawals, conversions and mainnet payouts remain disabled.
- Do not send funds until a unique verified address and exact asset/network instructions are displayed by the live application.

