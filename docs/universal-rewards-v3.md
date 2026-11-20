# Universal Rewards V3

## Architecture decision

V3 is a separate protocol adapter alongside V2. The initial settlement network is Polygon (137). A single `UniversalRewards` deployment owns the pool ledger and creates numbered pools; there is no per-pool deployment and it never calls an ERC-721 transfer or approval. A separate, optional `RewardSwapAdapter` is responsible for price observation and restricted router execution. Cross-chain observation is a shared adapter boundary. It adds no reward vault per chain.

### Source review

| Source | Decision |
| --- | --- |
| `projects/smartchef/v2/contracts/NftStake/` at contracts commit `221e2ce` | Preserve existing factory and recovery. V2 `deposit` takes custody, `withdraw` returns the asset, and side rewards depend on the primary payout. V3 replaces all three behaviors for its own pools. |
| `src/features/nftPoolManager/` | Reuse collection validation and presentation assets, chain-scoped wallet management, transaction simulation and receipt verification patterns. V3 needs a new registry, funding planner, and position reader. V2 readiness, stored custody and approvals remain V2 responsibilities. |
| `src/views/NftFarms/components/FarmCard/` | Reuse CoinCollect presentation and card composition. Supply V3-specific eligibility, join, claim and exit actions and display actual token liabilities. |
| `src/features/nftPoolManager/quotes.ts` and the local SDK `Router` | Reuse ERC-20 metadata and indicative route reading. These wallet-facing quotes are neither an execution authorization nor a price oracle. |
| `projects/exchange-protocol/` | The router exposes the factory, wrapped native token, and exact-input swap. The V2-style pair stores cumulative prices and reserves. A settlement adapter may use verified direct pairs and cumulative observations, with no allowance left between transactions. |
| `src/features/poolManager/components/Treasury.tsx` | Reuse the display pattern. V3 pool reserves and committed balances must come from the V3 ledger. |
| `scripts/local-fork-tool/`, `.github/workflows/`, and `src/pages/api/rpc/polygon.ts` | Use the existing local-only Anvil tooling and same-origin Polygon RPC. Keep Vercel. A server-side scheduler can trigger bounded jobs; replay protection belongs on chain. |

## Settlement and ownership

`poolId` is global to the settlement deployment. The NFT identity is `keccak256(abi.encode(sourceChainId, collection, tokenId))`. Exposure and earnings are kept per pool and NFT identity. A wallet claim requires the current ERC-721 owner on Polygon, pays that owner directly, and never moves the NFT. ERC-721 approvals cannot authorize a withdrawal. ERC-1155 is deferred because semi-fungible ownership requires a different quantity and ownership-transfer model.

For normal Polygon transfers, an approved ERC-721 contract executes `ownerOf` on chain in the same transaction as settlement. Accrued value follows the token even if its new owner cannot retain a participation slot. There is no claim expiry. A burned token has no live recipient. Its accrued balance remains reserved, even if the collection never remints that identity.

An ordinary ERC-721 provides no universal hook when it is transferred. V3 settles the preceding interval against the last verified participation roster, then reconciles current owners for the next interval. Permissionless reconciliation can shorten this observation lag. Membership changes release departed wallet slots before admitting successor owners in the existing roster order. An owner above either concurrent wallet or per-wallet NFT cap loses that participation slot, with its vested balance intact. Wallet caps count addresses and make no claim about unique humans. There is a bounded roster per pool so a single checkpoint stays executable.

### Cross-chain guarantees

Base (8453) and Arbitrum One (42161) are source-chain adapters to one Polygon ledger. A source RPC read is display evidence only. An authenticated observation needs a known source chain ID, finalized source block and hash, collection and token, observed owner, validity window, domain bound to the destination chain and adapter, and monotonically advancing observations. An observation becomes stale if its freshness expires or it is superseded. A signature on an ownership observation does not prove that the NFT has not transferred after that observation.

The initial Polygon deployment must reject non-Polygon settlement operations. Cross-chain production claims require a reviewed source-side authorization/settlement policy with explicit transfer-after-authorization semantics and fail-closed finality/replay controls. A remote NFT owner must never be represented as atomically current on Polygon. Isolated verification may use an adapter with a deliberately bounded test trust model. Current V3 production claims must stay disabled for those chains until review and configuration.

## Economics and balances

Each reward token has an independent cap in that token's base units. USD-equivalent estimates are display values only. For a timestamp clamped to the pool window, cumulative scheduled emission is `floor(cap × precision × elapsed / duration)`. Each interval uses the difference between cumulative scheduled values. Its maximum emission is multiplied by `min(activeWallets, threshold) / threshold`, with a zero threshold meaning full rate for any nonempty roster. After that it is bounded by uncommitted funded inventory. Each active NFT receives its integer share of this scaled amount according to its positive weight. No recent funding can retroactively finance an interval that already elapsed.

Credits are tracked at 18 extra decimal places over a token's base units. Payouts are rounded down at the ERC-20 boundary; an NFT's fractional remainder carries between accruals and claims. Before recovery, reserves include all committed fractions, so no rounding can consume assets backing someone else's rewards. Empty, underfunded or below-threshold intervals do not grant a catch-up allocation. Pool end caps accrual at its timestamp. Anyone can checkpoint and return uncommitted funds to the immutable treasury after end, while claims remain open.

## Funding and automation

Use a single funding asset per pool, converted to its ERC-20 form (native POL becomes WPOL). Budget splits in that asset limit spending for each reward token. The protocol may replenish already configured reward inventory in bounded increments; assets committed to NFT balances are excluded from swap permissions. One purchase identifier or deterministic interval is executed once on chain. Reverts leave no partial spending. Operational jobs reconcile submitted hashes before retrying and stay off by default.

The swap adapter must pin routes, verified token and router addresses, minimum pair depth, cumulative-price observation windows, bounded price movement from the time-weighted price, a maximum trade size, and deadlines. Validating a spot quote alone cannot protect a treasury. Mainnet route readiness requires evidence for every configured reward and independent review, even if an isolated swap test passes.

## Verification tracking

- Confirm implementation against Solidity tests on the isolated local chain and Polygon fork.
- Measure maximum-roster gas and separate the observed local bounds from production review.
- Exercise V3 catalogue and wallet journeys alongside V2. Dedicated V3 type checking must run without relying on Next.js build settings.
- This document describes the architecture and release boundary. It is not deployment or audit evidence.
