# NFT Pool Manager

This document describes the Phase 0 audit and Phase 1 read-only foundation for NFT staking administration.

## What the audit found

The frontend has two NFT staking generations:

- `src/config/constants/nftFarms.ts` contains legacy MasterChef definitions for pids 1–4. These use the shared `coinCollectNftStake` contract and do not have pool-specific contract addresses.
- Pids 5 and later are SmartChef V2 pools. Each configured pool has its own contract address and uses `NftStake/SmartChefInitializable`.
- The Polygon NFT SmartChefFactory is `0xa7983F8B45860626398b391E9Bb71416A26349D4`, deployed at block `45594882`. The current factory owner is `0x8fC2e77C47D5D9fDe1ff35098d6e22EB6F9e8258`.

The relevant contract sources are in `projects/smartchef/v2/contracts/NftStake/`. The frontend remains the source of presentation metadata and known collection relationships; it is no longer treated as the sole source of deployed-pool truth.

## Source-of-truth rules

The registry is chain-first for deployed pools:

1. Discover V2 pool addresses from the NFT factory event, with configured addresses retained as a fallback.
2. Read contract code and V2 fields through `smartNftStake.json`.
3. Read token and collection names/symbols from their contracts when possible.
4. Compare frontend configuration with on-chain values and surface mismatches as warnings.
5. Read legacy pids through the legacy MasterChef ABI and label their limitations explicitly.

Frontend-only fields such as banner, avatar, links, labels, and community flags remain metadata. The registry keeps them separate from `onChain` values.

## Collection registry

Collections are deduplicated by `chainId:lowercase(address)`. A collection can be referenced by multiple pools and can be primary in one pool while being a supported community collection in another. Configured weights are shown alongside on-chain weights; V2 reads are authoritative when available.

The legacy MasterChef ABI does not expose an enumerable pool-specific collection-weight model, so legacy entries are marked partial and explain that limitation.

## Clone and draft safety

Clone creates a local editable draft under the browser storage key `coincollect.nft-pool-studio.drafts.v1`. It carries presentation metadata, collection addresses and weights, reward identities, and editable constraints.

It deliberately does not copy a deployed contract address, start/end blocks, deployment transaction hash, or previous owner into deployment inputs. The source pool id is retained only as an audit/reference label. Saving is local; deployment and funding are disabled in Phase 1.

## Current safety boundary

The new NFT routes are read-only. No wallet transaction is opened for deploy, setCollectionWeights, reward funding, approvals, stopping, recovery, or ownership operations. The existing ERC20 wizard remains visible only as an explicitly read-only surface, with its deploy and fund actions disabled.

NFT routes read the NFT SmartChefFactory owner directly; ERC20 routes keep their CoinStake factory-owner gate. The two audited owners currently resolve to the same EOA, but the separate checks preserve the product boundary if governance changes later.

## Contract risk to carry into Phase 2

`setCollectionWeights` is owner-only but is not blocked after the pool starts. Existing deposits retain their token-weight snapshots, while later deposits can use the changed collection weight. The manager must warn about this behavior and must not expose the write until an explicit policy and transaction workflow exist.

The V2 contract also does not provide a simple collection-array length getter. The current reader uses frontend configuration to enumerate expected community collections and reports incomplete or unreadable data instead of silently inventing entries.

## Phase 2 and Phase 3 prerequisites

Phase 2 needs a non-writing builder model for duration-to-block conversion, reward budgets, per-block allocations, side-reward percentages, collection weights, capacity, participant threshold, and validation against token decimals and chain limits. Token pricing/oracle integration is not implemented here.

Phase 3 needs wallet-signed, resumable, idempotent deployment and verification flows: factory deployment, initialization, collection weights, reward approvals/funding, receipt tracking, and post-write re-reads. Those operations are intentionally outside this phase.

Factory-discovered pools without matching frontend metadata remain visible but may have limited labels and clone support. Per-pool read failures remain visible as unhealthy/unreadable entries so one bad contract does not hide the registry.
