# NFT Pool Studio

NFT Pool Studio is the Polygon-only administration surface for CoinCollect NFT staking pools. It has two operator
entry points: **Quick Create** for the normal one-collection canary, and **Advanced Setup** for the full configuration
surface. Every on-chain write still requires an explicit wallet confirmation. Tests, local development and preflight do
not submit a production Polygon transaction.

## Operator guide

1. Open **NFT Pool Studio** and choose **+ New Pool**.
2. In Quick Create, choose an NFT collection, enter a reward budget in USDT and choose a duration: 1, 3 or 6 months,
   1 year, or a custom number of days.
3. Review the automatically prepared quote and the compact pool summary. The quote is read-only; the product never
   performs a USDT swap.
4. Choose **Create Pool**. A saved launch session runs a fresh Polygon preflight automatically before showing any
   wallet signature.
5. Review the final schedule, operator, gas estimate, plan hash and PASS/BLOCK checks. Confirm each requested wallet
   action separately, then wait for the receipt and read-back before continuing.
6. If the browser closes or an RPC request fails, reopen the saved launch route and choose **Resume**. The session
   reconciles receipt hashes and balances; it never blindly resends an unresolved write.

Finished pools expose **Renew**. Active or upcoming pools expose **Duplicate**. Saved drafts use **Continue setup**.

## Quick Create policy

Quick Create is a mapper over the same draft, economics, validation, deployment-plan and launch-session engine used by
Advanced Setup. It deliberately makes fewer decisions visible:

- Reward: canonical Polygon **COLLECT**, allocated at 100%.
- Budget: canonical Polygon **USDT** denomination; the entered amount remains the budget input, not a swap instruction.
- NFT: exactly one selected collection, primary weight `1`.
- Defaults: participant threshold `1`, initial capacity `1000`, no per-wallet limit, no side rewards and no performance
  fee.
- Metadata: the collection name becomes the initial pool name and its configured artwork is used as the preview when
  available.

Advanced Setup remains available for additional collections, custom ERC-20 rewards, side percentages, user limits,
performance-fee policy, exact metadata and manual amount fallbacks. Raw addresses are kept out of the primary Quick
Create controls and remain visible in the advanced review/details surfaces.

Quotes are debounced after a valid budget or reward input changes. A manual refresh is available as a fallback. Quotes
carry their budget, allocation, path, source, timestamp and expiry; changing an input invalidates the old quote. Same-token
inputs use an exact identity quote. No fake price or implicit swap is shown.

## Discovery and economics

- Legacy MasterChef pools and NFT factory pools are displayed with their source and protocol version. Factory pools are
  discovered from `NewSmartChefContract` events; configured addresses are enrichment/fallback data.
- `stakedToken` is the primary NFT. Community collections and side reward tokens are read dynamically with bounded
  probes and matched by canonical address.
- All amount arithmetic uses ethers `BigNumber`. Primary reward rate is the integer floor of desired reward divided by
  estimated duration blocks. Maximum scheduled funding and the primary residual are shown separately.
- Side rewards mirror the contract's paid-primary calculation. The encoded integer percentage and maximum implied side
  funding are computed before launch; an out-of-tolerance representation blocks the plan.
- Capacity means the original configured factory capacity. Current remaining capacity is runtime state and is never copied
  into a new clone. Old schedules, balances, liabilities, stakes and addresses are never reused as deployment inputs.

## Safety and transaction reconciliation

The launch session stores a frozen plan, its hash, stage, receipt hashes, schedule, verification results and funding
progress. It stores no signer, private key, allowance, signature or secret. Once a transaction hash exists, the plan cannot
be edited.

Before any write the workflow revalidates Polygon chain 137, the connected operator, factory/pool ownership, bytecode,
current block, schedule window, token mapping, pool fingerprint, simulation, gas and native POL. A failed read-back stops
the workflow without starting a later step.

On resume, reconciliation is ordered from the newest operation to the historical deployment: schedule update, NFT
weights, fee, funding, then an unresolved deployment. A deployment hash is not allowed to overwrite a session that has
already reached a later operation. Pending weights, fee and funding hashes block duplicate writes. A failed receipt clears
the retryable operation hash; a confirmed receipt is read back before the next action. Funding is authoritative by the
confirmed pool balance: if the pool already covers the required amount, the transfer is skipped; otherwise only the
missing amount is considered. Replacement transactions persist the effective confirmed hash returned by the receipt/wait
path.

The factory deployment address is accepted only from the confirmed `NewSmartChefContract` event emitted by the expected
factory. Collection weights, optional fee configuration, direct reward-token funding and an explicit later schedule update
are separate operator actions. There is no automatic approval, swap, stop, emergency recovery or ownership transfer.

## Internal implementation notes

The typed `NftPoolDeploymentPlan` is the boundary between the builder and launch engine. It intentionally excludes final
start/end blocks, signers and transaction objects; preflight prepares the final schedule immediately before signing.
Local draft storage uses `coincollect.nft-pool-studio.drafts.v2` and defensively migrates v1 drafts. Launch sessions keep
the v1 storage key for compatibility and normalize older records on read. Integrity mismatches become `CORRUPTED` and
permit no transaction.

The deployment and post-deploy state machine is explicit:

`DRAFT → PREFLIGHT_READY → AWAITING_DEPLOY_SIGNATURE → DEPLOY_SUBMITTED → DEPLOY_VERIFIED → WEIGHTS_REQUIRED → FEE_CONFIG_REQUIRED → FUNDING_REQUIRED → FINAL_VERIFYING → COMPLETE`

Optional steps are skipped only when absent from the frozen plan. A pending or failed write remains visible in the session
and can be resumed or retried only after the relevant receipt/read-back decision.

## Roadmap: Phase 4 / Public Integration

Phase 4 is intentionally separate from the operator launch engine. Its scope is to expose only verified, public-safe
state:

- publish active/upcoming pool metadata and schedules through a stable public API/indexer;
- show verified reward balances, collection weights, status and provenance without exposing operator controls;
- add public pool detail, staking entry points and event-driven refresh with bounded RPC fallbacks;
- define an audited analytics/indexing contract for historical launches, receipts and reconciliation outcomes;
- add production monitoring, alerting and rollback procedures before widening operator permissions.

No Phase 4 item should bypass the current wallet confirmation, owner checks, frozen-plan integrity, receipt reconciliation
or no-duplicate funding rules.
