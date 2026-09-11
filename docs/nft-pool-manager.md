# NFT Pool Studio

NFT Pool Studio is the Polygon-only administration surface for CoinCollect NFT staking pools. The canonical operator
object is the **NFT Pool Card**: the admin edits the artwork, collections, rewards and visible economics directly on the
same card users will eventually recognize. **Advanced details** remains available for protocol-level controls, but it
is secondary to the Card Studio. Every on-chain write still requires an explicit wallet confirmation. Tests, local
development and review/preflight do not submit a production Polygon transaction.

## Card-First Pool Studio

The Card Studio is a UI layer over the existing `NftPoolDraft`, economics, validation, quote, deployment-plan and launch
engines. It does not introduce a second deployment path or duplicate reward math.

- Click the artwork to choose a repository-known banner, an existing pool asset or a public image URL. There is no fake
  upload backend; a URL or local/repository asset is only presentation metadata.
- Click the NFT stack to select collections and edit positive integer **staking power** values. The first selected
  collection remains the factory primary unless an operator deliberately changes it in Advanced details. Custom ERC721
  contracts are validated for the current draft and do not mutate the global registry.
- Click rewards to choose known Polygon tokens or validate a custom ERC-20. Multiple rewards use human percentages;
  the editor converts them deterministically to basis points and keeps the contract's primary/side representation
  warnings visible.
- Click budget, duration or minimum effective power to edit those decisions. New cards intentionally leave the monetary
  budget empty; `USDT` is only the suggested denomination and `COLLECT` is only the suggested primary reward identity.
- Click the title or **Pool details** for presentation metadata. Project/NFT links remain secondary to the card.

The card's reward-sharing preview follows SmartChef v2 semantics. It uses the actual calculated primary
`rewardPerBlock`, measured block time and weighted shares. `participantThreshold` is a floor in weighted staking power,
not a participant-wallet count unless the deployed contract implementation proves otherwise. The UI therefore says
**Minimum effective staking power** and explains that a larger total staking power gives each stake a smaller share of
the fixed primary reward. Side rewards are shown as derived from primary pending rewards, not as independent emissions.

## Operator guide

1. Open **NFT Pool Studio** and choose **+ New Pool**. The Card Studio opens with no NFT or financial amount silently
   selected. `COLLECT`, `USDT`, a one-month duration, and the documented creation-policy threshold are suggestions only.
2. Click the card regions to choose NFT collections, set staking powers, select reward tokens, enter the total budget,
   choose a duration (including custom days such as `200`), and set minimum effective staking power.
3. Use the live preview and read-only quotes to inspect allocated reward budgets, actual primary schedule economics and
   weighted share examples. Quotes never perform a swap.
4. Choose **Review Pool**. The current draft is converted to one deployment plan and read-only Polygon preflight checks
   run for network, authority, bytecode, balances, gas, schedule and simulation. No wallet transaction is sent.
5. Choose **Create Pool** only after the review passes. A saved launch session then runs the existing hardened launch
   engine. Confirm each requested wallet action separately, then wait for receipt and read-back before continuing.
6. If the browser closes or an RPC request fails, reopen the saved launch route and choose **Resume**. The session
   reconciles receipt hashes and balances; it never blindly resends an unresolved write.

Finished pools expose **Renew**. Active or upcoming pools expose **Duplicate**. Both open the same Card Studio with safe
configuration populated. Saved drafts use **Continue editing** and resume the Card Studio; incomplete launch sessions
use **Resume launch**.

## Creation policy and advanced details

New cards use an explicit, reviewable policy: `COLLECT` is the suggested primary reward, `USDT` is the suggested budget
denomination, duration defaults to one month, minimum effective staking power defaults to `20`, initial capacity to
`1000`, wallet limits are off, and performance fees/side rewards are absent. The budget remains empty until the admin
enters it. Capacity, primary collection designation, exact BPS, manual amounts, estimated blocks, addresses and the
deployment plan remain under **Advanced details**.

Advanced details is retained for additional collections, custom ERC-20 rewards, side percentages, user limits,
performance-fee policy, exact metadata and manual amount fallbacks. It is a protocol escape hatch, not a separate launch
engine.

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
