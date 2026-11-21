# Polygon contract metadata

`polygon-contracts.json` records read-only `eth_call` results from Polygon chain 137 at block 97,638,790. Verify the block hash before refreshing the fixture. The metadata came from [Tenderly's Polygon gateway](https://polygon.gateway.tenderly.co) using the block number as the block tag.

- LP pairs expose `token0()`, `token1()` and `factory()`.
- Standalone reward pools expose `stakedToken()`, `rewardToken()` and `rewardPerBlock()`. Pool zero uses the legacy main staking contract and has a separate configuration check.
- Polygon ERC-20s expose `symbol()` and `decimals()`. The frontend uses POL, USDT and ETH as explicit display aliases for three catalog entries. The token tests also validate the legacy BNB Smart Chain entries structurally.
