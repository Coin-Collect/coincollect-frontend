# NFT Pool Studio

NFT Pool Studio is the Polygon-only administration surface for CoinCollect NFT staking pools. Phase 1.5 and Phase 2 add a validated, read-only builder; they do not deploy a pool or move funds.

## Source-of-truth and provenance

- Legacy MasterChef pids 1–4 are read through the legacy ABI and remain explicitly `PARTIAL`.
- V2 pools are discovered from `NewSmartChefContract` events emitted by `0xa7983F8B45860626398b391E9Bb71416A26349D4`; configured addresses are a fallback only.
- `stakedToken` is always the primary NFT. `communityCollections(index)` is read until its getter reverts, with a 32-entry safety cap and an item timeout. Frontend configuration enriches labels only.
- `sideRewardTokens(index)` is discovered the same way. Percentages, token metadata and pool balances are associated by canonical token address, not frontend array position.
- For factory deployments, the original `deployPool(...)` transaction is decoded and retained as `{ factoryAddress, transactionHash, blockNumber, decodedInputs, decodeStatus }`. The decoded `ConfigExtra.poolCapacity` is the original configured capacity. `poolCapacity()` is mutable runtime remaining capacity and is displayed separately.

The source economics card keeps the old reward rate, schedule, side percentages, threshold, original capacity, remaining capacity, user-limit settings and admin separate from new draft economics. A clone never carries the old start/end blocks, address, balances, stakes, liabilities or runtime capacity into new deployment inputs.

## Builder flow

The single `PoolBuilder` flow is used for new and clone entry points:

1. NFTs — choose a registry collection or validate any Polygon ERC-721; add/remove collections, select exactly one primary, and use positive integer weights.
2. Rewards — choose one required primary ERC-20 and zero or more side tokens. Known tokens and arbitrary Polygon addresses are supported; code, metadata and `decimals < 30` are checked.
3. Budget — budget denomination is USDT and is independent of reward tokens. Allocations are integer basis points and must total 10,000. A read-only adapter calls the router already used by the swap UI; if no route exists, exact manual token amounts are accepted instead. No fake price is shown.
4. Duration — presets are converted using the latest sampled Polygon block time. Custom days are supported. Exact start/end blocks are intentionally deferred until the future Phase 3 preparation step.
5. Appearance — public URL/local preview only; this phase has no permanent upload.
6. Review — human values first, collapsed exact deployment plan second. The plan contains inputs, funding previews, encoded side percentages and estimated blocks, but never a transaction object or final start block.

## Economics and readiness

All base-unit arithmetic uses ethers `BigNumber`. Primary reward rate is `floor(total primary allocation / blocks)`; the max emission and residual are shown. Side rewards mirror Solidity `distributeSideRewards`: pending primary emission is multiplied by the integer percentage, divided by 100, and scaled for decimal differences. Requested, achievable, encoded percentage, residual and deviation are retained; deviations outside tolerance block the dry run.

Readiness is explicit:

- `INCOMPLETE`: required asset, collection, address, amount, duration, capacity/limit or allocation is missing/invalid.
- `NEEDS_REVIEW`: the draft is structurally valid but has quote freshness, manual amount or integer-residual warnings.
- `READY_FOR_DRY_RUN`: all read-only checks and exact calculations pass.
- `READY_FOR_DEPLOYMENT`: reserved for a future explicitly enabled Phase 3 workflow; Phase 2 never emits it.

The minimum effective staking power is shown as the participant threshold. Capacity means the original configured capacity when provenance is decoded, not the current remaining number. User limit fields explain whether a per-user limit and block window are enabled. Performance fee remains a future post-deploy policy because it is not a factory input.

## Persistence and safety

Drafts use `coincollect.nft-pool-studio.drafts.v2`, support multiple drafts, continue/duplicate/delete, and autosave with a debounce. The v1 key is migrated defensively: raw old reward rate is moved to source economics, old runtime capacity is discarded as a new input, and unsafe deployment identifiers are removed. No private key, signature, transaction, allowance or secret is stored.

The admin shell keeps NFT factory authority separate from ERC20 factory authority. States are distinct: disconnected shows `Connect Wallet`, a connected non-Polygon wallet shows `Switch to Polygon`, Polygon access checking shows `Checking admin access`, and a non-owner shows `This wallet is not authorized`.

## Write boundary

There are no deploy, approve, swap, fund, `setCollectionWeights`, stop, recovery or ownership writes in this release. The deployment plan and post-deploy checklist are read-only previews. Public staking routes and ERC20 pool behavior are unchanged.

## Future Phase 3

Phase 3 must calculate exact start/end blocks immediately before signing, prepare an idempotent factory transaction, obtain explicit approvals/funding, submit and track receipts, re-read the deployed pool, verify collection weights and funding, and surface the final deployment provenance. It must not reuse a stale Phase 2 block estimate as a final schedule.
