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
denomination, duration defaults to one month, minimum effective staking power defaults to `1`, initial capacity to
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

## Global discovery, public readiness and recovery

`/nftpools` is built from factory deployments read from chain, not from a browser's local publication records or a launch
session. The catalogue read model separates three states:

- **Discovered** is an event candidate. It is visible to operator diagnostics but is not a public pool or a recovery target.
- **Verified** means the event provenance, deployed code, configured factory pointer and V2 protocol identity have been
  checked against the connected runtime chain. Every verified pool belongs to the wallet-recovery scan, whether or not it
  is publicly ready.
- **Public ready** means the pool also passes complete, block-pinned configuration checks. Only `verified && publicReady`
  pools enter the normal catalogue and can accept new staking.

Readiness reads the factory and pool code, exact factory pointer, the primary and bounded collection/reward lists, unique
valid addresses, ERC-721 support and positive on-chain weights, reward-token code and decimals, required limit/fee/schedule
getters, a positive primary reward rate, a readable non-negative participant threshold (zero is valid), and
`startBlock < endBlock`. Required values are read at one block;
summary defaults do not establish readiness. Current reward balances and the current block's position in the schedule
are deliberately excluded: reward depletion and a finished schedule do not by themselves remove a ready pool from the
catalogue.

Production discovery combines Blockscout historical candidates with a 50,000-block RPC tail. RPC logs always prove a
candidate before it is verified. Historical RPC backfill advances in bounded, resumable chunks and keeps overlap between
refreshes. Partial coverage and stale registry data are surfaced as warnings. Temporary read failures retain the last
verified identity and positive wallet-position hint. In local-fork mode, external indexer and metadata requests are
disabled; discovery starts after the fork base block and its cache is namespaced by fork session.

Wallet position discovery scans **all verified pools**, independently of search, category and readiness filters. A
lightweight, same-block `userInfo` / NFT `balanceOf` summary tracks `positive`, `zero` or `unknown`. A previous positive
summary survives a readiness regression and transient read error as stale; only a fresh, consistent zero clears it.
Positive positions in non-ready pools appear in Staked-only and the History recovery section and can be opened by pool
address. These recovery cards say **New staking unavailable** and do not invent reward estimates from incomplete public
configuration.

The recovery reader enumerates the pool's actual staked `(collection, tokenId)` tuples, checks NFT custody with
`ownerOf`, and sums the stored per-NFT `tokenWeight`. It does not require today's collection list, weights, reward metadata
or approvals. Before each withdrawal or emergency withdrawal, the transaction path freshly checks chain, signer,
factory provenance, position tuples and custody, then simulates, checks gas and waits for explicit wallet confirmation.
Receipt verification checks returned NFT ownership and remaining count/power without depending on reward presentation.
An unavailable or inconsistent fresh read blocks the write and keeps a previous positive position visible for retry.

The shared presentation document is `https://metadata.coincollect.org/nft-pools.json`, schema version 1, with canonical
`137:<lowercase-address>` IDs. It contains presentation fields only (name, banner, avatar, URLs, description and
Partner/Community category); it cannot affect verification, readiness, discovery or transaction parameters. Invalid IDs,
duplicates, unsafe URLs and oversized input are rejected or omitted. Browser caching uses a five-minute TTL, a four-second
request timeout and up to 24 hours of last-valid metadata during an outage. Fallback order is remote metadata, exact-address
repository presentation, known/on-chain collection details, then deterministic generic name and CoinCollect artwork.
Local presentation drafts remain available for operator preview and export, with Community as the default category.

Old `coincollect.nft-pool-publications.v1` records remain for operator recovery/export, but they cannot create a catalogue
entry, mark a pool verified or ready, or restrict wallet scans. The launch COMPLETE screen offers **View pool**,
**Refresh discovery** and **Export presentation metadata**; there is no local-publication action.

`participantThreshold` is independent of selected collection weights. It accepts non-negative integers including zero;
editing powers does not reconcile it. Solo-NFT preview denominators include the NFT's actual weight, so a 30x NFT cannot
receive more than the entire scheduled emission. ERC-20 rewards use **WPOL**; native **POL** is gas only. Funding simulates
and estimates with the connected signer and transfers only `max(required - pool balance, 0)`. The funded duration is
frozen in blocks; fresh timing changes setup buffers, not emission liability.

Safe local checks:

```sh
npm test -- --runInBand src/features/nftPoolManager
# Start an isolated Anvil Polygon fork on a loopback-only endpoint, then:
COINCOLLECT_FORK_RPC=http://127.0.0.1:18545 COINCOLLECT_SOLC_MODULE=/absolute/path/to/solc npm test -- --runInBand src/features/nftPoolManager/launch/__tests__/fork.test.ts
COINCOLLECT_NEXT_DIST_DIR=.next-verification npm run build
```

The opt-in fork test requires a loopback HTTP endpoint and the Anvil-only identity method before writes. It uses fork
impersonation, test-only assets and snapshot rollback; it never needs a production key. The regular suite skips it.
The automated lifecycle suite covers launch, clean registry discovery, reward depletion, finished status, and existing
transaction invariants. On the checked local fork, setting a staked pool's community collection weight to zero was permitted:
the test confirmed that the pool stayed verified, became non-ready, rejected new staking, retained its stored NFT tuple and
power, and remained normally withdrawable. Reader fixtures also cover transient stale positives and fresh zero removal. A
manual Browser A / clean Browser B acceptance should still use separate browser profiles to verify the same catalogue and
wallet UX end to end without draft or publication storage.
