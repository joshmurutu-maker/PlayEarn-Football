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
2. A qualified custody provider or reviewed smart-contract deposit architecture that can issue a unique address or memo per user and network. Never derive addresses from a frontend secret or expose signing keys.
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
