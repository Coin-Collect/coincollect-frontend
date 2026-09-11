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

1. NFTs — choose a registry collection or validate any Polygon ERC-721; add/remove collections, select exactly one primary, and use positive integer weights. Validation checks code, tries ERC165 first, and uses a non-zero compatibility probe only when ERC165 is unavailable. `name()` and `symbol()` enrich the row but are not required, and `balanceOf(address(0))` is never used.
2. Rewards — choose one required primary ERC-20 and zero or more side tokens. Known tokens and arbitrary Polygon addresses are supported; code, metadata and `decimals < 30` are checked.
3. Budget — budget denomination is USDT and is independent of reward tokens. Allocations are integer basis points and must total 10,000. Each reward is quoted using its exact allocated budget (`floor(total budget × allocation BPS / 10,000)`), never by quoting the whole budget and multiplying a nonlinear AMM output. If budget and reward are the same token, an exact identity quote is used and the router is not called. No fake price is shown.
4. Duration — presets are converted using the latest sampled Polygon block time. Custom days are supported. Exact start/end blocks are intentionally deferred until the future Phase 3 preparation step.
5. Appearance — public URL/local preview only; this phase has no permanent upload.
6. Review — human values first, collapsed exact deployment plan second. The plan contains inputs, funding previews, encoded side percentages, quote state and estimated blocks, but never a transaction object or final start block.

## Economics and readiness

All base-unit arithmetic uses ethers `BigNumber`. Primary reward rate is `floor(desired primary amount / estimated duration blocks)`; the maximum scheduled primary funding is `rewardPerBlock × blocks`, and the primary residual is shown. A zero `rewardPerBlock` blocks the draft.

Side rewards are calculated from paid primary pending rewards, not from an independent side-reward emission schedule. The planner mirrors `distributeSideRewards(_pending)` exactly for one payout. It derives an integer `sideRewardPercentage`, then applies that ratio once to the maximum scheduled primary emission to produce `maximumImpliedSideFunding`. This is a conservative upper planning amount: because Solidity truncates every fragmented payout before transferring, many smaller claims can produce less side reward than one aggregate application. Desired side amount, encoded ratio, maximum implied funding, deviation, deviation BPS and representability status are retained; deviations outside tolerance block the dry run.

Budget rounding and primary reward residual are separate quantities. Budget rounding is the smallest-unit remainder left after allocating the total budget by BPS. Primary residual is the desired primary amount that cannot fit into an integer per-block rate. Neither is silently discarded.

Quotes have explicit `FRESH`, `STALE`, `EXPIRED` and input-mismatch (`INVALID`) states. Fresh quotes are usable; stale or expired quotes require review and are never presented as current. A quote records its budget amount, allocation BPS, total budget, path, source, timestamp and expiry, so changing a pricing input invalidates it. Manual token amounts remain exact contract-economics inputs, but set `NEEDS_REVIEW` because they do not prove that the token amount has the stated budget value.

Readiness is explicit:

- `INCOMPLETE`: required asset, collection, address, amount, duration, capacity/limit or allocation is missing/invalid.
- `NEEDS_REVIEW`: the draft is structurally valid but has stale/expired quotes, manual amount valuation, provenance fallback or an accepted side representability deviation.
- `READY_FOR_DRY_RUN`: all read-only checks and exact calculations pass.
- `READY_FOR_DEPLOYMENT`: reserved for a future explicitly enabled Phase 3 workflow; Phase 2 never emits it.

The minimum effective staking power is shown as the participant threshold. It can reduce actual distributed primary rewards, but does not reduce maximum scheduled funding. Capacity means the original configured capacity when provenance is decoded, not the current remaining number. User limit fields use `Maximum NFTs per wallet` and an advanced block window; clones prefer the original factory parameters over the runtime `hasUserLimit()` result and require review when provenance is unavailable. Performance fee and `feeTo` are read for existing V2 pools as reference only. Performance fee remains a future post-deploy policy because it is not a factory input.

The typed `NftPoolDeploymentPlan` is the Phase 2.5 handoff. It contains identity, source pool, duration intent and measured block time, all factory parameters (including `intendedAdmin`), collection powers plus exact future `setCollectionWeights(...)` arguments, primary and side funding requirements, budget allocation remainder, quote metadata, post-deploy policy and readiness. It intentionally excludes final start/end blocks, signers and transaction objects. Phase 3 must re-check the intended admin and current authority before signing.

## Persistence and safety

Drafts use `coincollect.nft-pool-studio.drafts.v2`, support multiple drafts, continue/duplicate/delete, and autosave with a debounce. The v1 key is migrated defensively: raw old reward rate is moved to source economics, old runtime capacity is discarded as a new input, and unsafe deployment identifiers are removed. No private key, signature, transaction, allowance or secret is stored.

The admin shell keeps NFT factory authority separate from ERC20 factory authority. States are distinct: disconnected shows `Connect Wallet`, a connected non-Polygon wallet shows `Switch to Polygon`, Polygon access checking shows `Checking admin access`, and a non-owner shows `This wallet is not authorized`.

## Write boundary

There are no deploy, approve, swap, fund, `setCollectionWeights`, stop, recovery or ownership writes in this release. The deployment plan and Phase 3 checklist are read-only previews. Collection weights have no pre-start guard in the current contract, so Phase 3 must finalize them before launch completion; existing deposit weight snapshots are not retroactively changed. Public staking routes and ERC20 pool behavior are unchanged.

## Future Phase 3

Phase 3 must calculate exact start/end blocks immediately before signing, prepare an idempotent factory transaction, obtain explicit approvals/funding, submit and track receipts, re-read the deployed pool, verify collection weights and funding, and surface the final deployment provenance. It must not reuse a stale Phase 2 block estimate as a final schedule.
