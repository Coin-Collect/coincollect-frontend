# NFT Pool Studio

NFT Pool Studio is the Polygon-only administration surface for CoinCollect NFT staking pools. Phase 3 adds a human-confirmed, resumable launch engine. Every write still requires an explicit wallet confirmation; tests, preflight and the development server never submit a production transaction.

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

Phase 3 writes are limited to the explicit operator actions on the launch screen: factory deployment, collection weights, optional performance fee, direct reward-token transfers and an explicit later schedule update. There is no automatic approval, swap, stop, emergency recovery or ownership transfer. Collection weights have no pre-start guard in the current contract, so the workflow verifies them before completion; existing deposit weight snapshots are not retroactively changed. Public staking routes and ERC20 pool behavior are unchanged.

## Phase 3 launch architecture

The builder hands a complete `NftPoolDeploymentPlan` to a local `NftPoolLaunchSession`. The session stores only the frozen plan, its keccak hash, stage, receipt hashes, schedules, verification results and funding progress. It never stores a signer, private key, allowance or secret. A plan cannot be changed after the first transaction hash is recorded.

The state machine is explicit:

`DRAFT → PREFLIGHT_RUNNING → PREFLIGHT_READY → AWAITING_DEPLOY_SIGNATURE → DEPLOY_SUBMITTED → DEPLOY_CONFIRMED → DEPLOY_VERIFIED → WEIGHTS_REQUIRED → FEE_CONFIG_REQUIRED → FUNDING_REQUIRED → FINAL_VERIFYING → COMPLETE`

Optional steps are skipped only when the frozen plan does not request them. A rejection returns the relevant step to a retryable state. An RPC error after submission preserves the hash and the session; reopening the launch route reconciles a confirmed deploy receipt. A deployed-but-incomplete pool is never displayed as a generic failed deployment.

### Preflight and schedule

Preflight re-reads chain ID, latest block, configured factory code, factory owner and owner code, connected account, all addresses, ERC-20 decimals/balances, native POL, fee data, deployment gas, `callStatic.deployPool` and `estimateGas`. A contract-owned factory or any owner mismatch blocks the run. The quote data is informational at this point; no quote is silently converted into a funding write.

The final duration is calculated from the measured recent block time immediately before preflight. The start block is `currentBlock + setupBufferBlocks`, with a default 15-minute buffer and a minimum block guard. The end block is `startBlock + finalDurationBlocks`. The Phase 2 estimated blocks are shown as planning context only. Preflight stores its block, timestamp and expiry threshold; deployment requires a fresh preflight and at least five minutes (with a 60-block floor) remaining before start. A stale schedule is never regenerated inside a signing action. If configuration is not complete near the start, `Move start later` performs another explicit owner-checked, simulated transaction and preserves the final duration; it never moves the schedule automatically.

### Deployment and verification

The factory call uses the exact eleven arguments from the Solidity ABI: staked NFT, primary reward, side tokens, encoded side percentages, reward rate, final start/end blocks, user-limit values, `{ poolCapacity, participantThreshold }`, and intended admin. The factory has no return value. The pool address is accepted only from the confirmed `NewSmartChefContract(address indexed smartChef)` receipt event emitted by the expected factory address. The deployed pool is then re-read for factory, owner, tokens, side percentages, schedule, limits, capacity and threshold and a deterministic fingerprint is recorded. Any mismatch stops the workflow. Every write also performs a fresh simulation, gas estimate, fee-data read and POL balance check.

Collection powers are mandatory when requested and are verified by reading `communityCollections`, `collectionWeights` and the primary weight. Performance fee is optional; when configured, both `feeTo` and the exact integer fee value are set and verified. No later step begins after a failed read-back.

### Funding and idempotency

Funding uses direct ERC-20 transfers only. Primary funding is the plan's `maximumScheduledFunding`; side funding is each `maximumImpliedSideFunding`. Before each transfer the pool fingerprint, `rewardToken()`, side-token list and side percentages are re-read, followed by the pool balance. If it already covers the requirement the step is marked skipped. Otherwise only the missing amount is simulated, estimated and sent. Completion requires a fresh post-receipt pool balance at least equal to the requirement, protecting against fee-on-transfer tokens. Primary and side progress are independent, so a failed side reward does not erase confirmed previous transfers. Funding is blocked once the pool starts while setup is incomplete.

### Operator runbook

1. Connect the factory-owner EOA on Polygon, review the draft, and choose **Run preflight**.
2. For the first canary, use one collection, one primary reward, no side reward, no fee, a tiny reward amount and a short operational test duration. Confirm the displayed final schedule, deployment gas estimate, wallet balances, fresh plan hash and every PASS/BLOCK row. Choose **Launch pool** only when the plan is correct.
3. Confirm the factory deployment in the wallet. Wait for the receipt event and deployment read-back.
4. Explicitly confirm NFT powers, the optional fee, and each missing-only reward transfer as the workflow presents them.
5. Run final verification. Only a complete verification result marks the session `COMPLETE`.
6. If the browser closes or an RPC call fails, reopen the saved `/admin/nft-pools/launch/{sessionId}` route and choose **Resume**. The receipt hash and current pool balance are reconciled for every write. Never create a second session or blindly resend a transfer; a pending hash blocks duplicate funding, while a plan-hash mismatch marks the session `CORRUPTED` and permits no transaction.

## Phase 3.1 production safety gate

The local session describes intent only. Before deployment or any post-deploy write, the launch domain validates the exact state-machine stage, frozen-plan integrity, chain 137, the current signer address, factory/pool ownership, bytecode, current block and the expected pool fingerprint. Configuration and funding are refused unless deployment verification has passed. Weight, fee and normal funding actions require a meaningful remaining setup window; once `currentBlock >= startBlock`, the normal flow stops and reports that setup is incomplete.

`COMPLETE` is not trusted from localStorage alone. A reopened completed session is reconciled against the chain; if the fingerprint or expected read-backs no longer match, the UI reports that the completed session no longer matches expected on-chain state. A schedule-update candidate stays pending until its receipt and exact `startBlock`/`bonusEndBlock` read-back are confirmed.
