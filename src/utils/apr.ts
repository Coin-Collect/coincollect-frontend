import BigNumber from 'bignumber.js'
import { BLOCKS_PER_YEAR, COLLECT_PER_YEAR_FARM, COLLECT_PER_YEAR_NFTFARM } from 'config'
import lpAprs from 'config/constants/lpAprs.json'

/**
 * Get the APR value in %
 * @param stakingTokenPrice Token price in the same quote currency
 * @param rewardTokenPrice Token price in the same quote currency
 * @param totalStaked Total amount of stakingToken in the pool
 * @param tokenPerBlock Amount of new cake allocated to the pool for each new block
 * @returns Null if the APR is NaN or infinite.
 */
export const getPoolApr = (
  stakingTokenPrice: number | null | undefined,
  rewardTokenPrice: number | null | undefined,
  totalStaked: number | null | undefined,
  tokenPerBlock: number | null | undefined,
): number | null => {
  if (stakingTokenPrice == null || rewardTokenPrice == null || totalStaked == null || tokenPerBlock == null) return null
  const totalRewardPricePerYear = new BigNumber(rewardTokenPrice).times(tokenPerBlock).times(BLOCKS_PER_YEAR)
  const totalStakingTokenInPool = new BigNumber(stakingTokenPrice).times(totalStaked)
  const apr = totalRewardPricePerYear.div(totalStakingTokenInPool).times(100)
  return apr.isNaN() || !apr.isFinite() ? null : apr.toNumber()
}

/**
 * Get farm APR value in %
 * @param poolWeight allocationPoint / totalAllocationPoint
 * @param cakePriceUsd Cake price in USD
 * @param poolLiquidityUsd Total pool liquidity in USD
 * @param farmAddress Farm Address
 * @returns Farm Apr
 */
export const getFarmApr = (
  poolWeight: BigNumber | null | undefined,
  cakePriceUsd: BigNumber | null | undefined,
  poolLiquidityUsd: BigNumber | null | undefined,
  farmAddress: string | null | undefined,
): { cakeRewardsApr: number | null; lpRewardsApr: number } => {
  const apr = poolWeight && cakePriceUsd && poolLiquidityUsd
    ? poolWeight.times(COLLECT_PER_YEAR_FARM).times(cakePriceUsd).div(poolLiquidityUsd).times(100)
    : null
  const lpRewardsApr = farmAddress ? lpAprs[farmAddress.toLowerCase()] ?? 0 : 0
  return { cakeRewardsApr: apr?.isFinite() ? apr.toNumber() : null, lpRewardsApr }
}

/**
 * Get nft farm APR value in %
 * @param poolWeight allocationPoint / totalAllocationPoint
 * @param cakePriceUsd Cake price in USD
 * @param poolLiquidityUsd Total pool liquidity in USD
 * @param farmAddress Farm Address
 * @returns Farm Apr
 */
export const getNftFarmApr = (
  poolWeight: BigNumber,
  tokenPerBlock: number | null,
  totalLiquidity: BigNumber,
  mainCollectionWeight?: number,
): { cakeRewardsApr: number; lpRewardsApr: number } => {
  const liquidity = totalLiquidity.toNumber()
  if (tokenPerBlock) {
    const yearlyAllocation = tokenPerBlock * BLOCKS_PER_YEAR
    const dailyRewards = (yearlyAllocation / liquidity) * (mainCollectionWeight ?? NaN) / 365
    return { cakeRewardsApr: dailyRewards, lpRewardsApr: 0 }
  }

  const legacyRewards = poolWeight?.times(COLLECT_PER_YEAR_NFTFARM).div(liquidity)
  const dailyRewards = legacyRewards?.isFinite() ? legacyRewards.toNumber() / 365 : 0
  return { cakeRewardsApr: dailyRewards, lpRewardsApr: 0 }
}

export default null
