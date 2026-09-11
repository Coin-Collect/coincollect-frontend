# CoinCollect Pool Manager v1

## Scope

Pool Manager is a browser-wallet operator surface for Polygon CoinStake v2 pools. It has no backend signer, private-key handling, automatic transfer, or production deployment command. Every write requires an explicit wallet confirmation.

The configured factory is:

`0x3C5B3a8e324bD13D4F74aA2c1932DFF81e646394` on Polygon chain `137`.

The v2 factory call is:

```text
deployPool(stakedToken, rewardToken, rewardPerBlock, startBlock, bonusEndBlock,
           poolLimitPerUser, numberBlocksForUserLimit, participantThreshold, admin)
```

The factory owner is read on-chain. If its owner has bytecode, the UI reports `Factory is contract-owned` and disables browser deployment. A matching EOA wallet is necessary but not sufficient: the contract's `onlyOwner` check remains authoritative.

## Routes

- `/admin` — current block, measured/fallback block time, registry counts, authority state
- `/admin/pools` — unified legacy + factory-discovered pool registry and renewal dry-run plan
- `/admin/pools/new` — pair, schedule, reward math, controls, deploy, verify, then fund
- `/admin/pools/[address]` — on-chain configuration, balances, schedule cap and explorer links
- `/admin/treasury` — reward-token aggregation, pool balances, wallet balances and coverage signal

## Registry and compatibility

Legacy `src/config/constants/pools.tsx` entries 0–14 are not rewritten. The unified registry uses canonical `chainId:address` identity, discovers `NewSmartChefContract` events in RPC chunks, falls back to the read-only Blockscout indexer when historical RPC logs are unavailable, deduplicates, and introspects every pool. Legacy sous IDs remain attached to matching addresses. The public pools page keeps its existing legacy cards and adds factory-discovered pools dynamically.

The indexer is a discovery aid, not an authority. A discovered pool is accepted only when its immutable `SMART_CHEF_FACTORY` equals the configured factory.

## Reward math

All monetary values are ethers `BigNumber` base units:

```text
rewardBlocks = ceil(durationSeconds / measuredSecondsPerBlock)
rewardPerBlock = floor(budget / rewardBlocks)
plannedMaximumEmission = rewardPerBlock * rewardBlocks
residual = budget - plannedMaximumEmission
```

Block time is sampled from recent Polygon blocks. When sampling fails, the UI explicitly labels the `2.2s/block` fallback. The schedule cap is a planning figure; SmartChef's participant-threshold denominator can reduce actual distribution and excess tokens can remain in the pool.

## Deployment and funding runbook

1. Connect the factory-owner EOA on Polygon.
2. Review the exact pair, decimals, start/end blocks, budget, participant threshold, user limit and admin in the preview.
3. Click `Deploy pool` and confirm the factory transaction.
4. Wait for the receipt, parse `NewSmartChefContract`, introspect the new address, and confirm every deployment field. Do not fund a failed verification.
5. Approve is not needed for funding: `Fund pool` performs a separate ERC20 `transfer` from the connected wallet. The default is the planned maximum emission and is editable.
6. Verify the pool balance increases by at least the requested amount. Save the transaction hashes in the operator record.

Renewal is always a new SmartChef deployment because the v2 contract cannot extend a started schedule. The old pool remains available for withdrawals and harvest. The `/admin/pools` dry-run plan stores resumable queue items in local storage and exports JSON; each item is still processed one-by-one in the wizard.

## Safe validation

Use `npm run dev` and open `http://localhost:3000`. Read-only registry loading is safe. Do not use a funded production wallet while testing. `npm run build` validates the Next bundle; the repository currently has pre-existing lint/type/test baseline issues documented in the handoff, so do not interpret a successful build as contract authorization.
