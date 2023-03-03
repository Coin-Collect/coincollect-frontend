import BigNumber from 'bignumber.js'
import { convertSharesToCake } from 'views/Pools/helpers'
import { multicallPolygonv2, multicallv2 } from 'utils/multicall'
import cakeVaultAbi from 'config/abi/cakeVault.json'
import coinCollectAutoPoolVaultAbi from 'config/abi/coinCollectAutoPoolVault.json'
import { getCoinCollectAutoPoolVaultAddress } from 'utils/addressHelpers'
import { BIG_ZERO } from 'utils/bigNumber'

export const fetchPublicVaultData = async () => {
  try {
    const calls = [
      'getPricePerFullShare',
      'totalShares',
      'calculateHarvestCoinCollectRewards',
      'calculateTotalPendingCoinCollectRewards',
    ].map((method) => ({
      address: getCoinCollectAutoPoolVaultAddress(),
      name: method,
    }))

    

    const [[sharePrice], [shares], [estimatedCakeBountyReward], [totalPendingCakeHarvest]] = await multicallPolygonv2(
      coinCollectAutoPoolVaultAbi,
      calls,
    )



    const totalSharesAsBigNumber = shares ? new BigNumber(shares.toString()) : BIG_ZERO
    const sharePriceAsBigNumber = sharePrice ? new BigNumber(sharePrice.toString()) : BIG_ZERO
    const totalCakeInVaultEstimate = convertSharesToCake(totalSharesAsBigNumber, sharePriceAsBigNumber)
    return {
      totalShares: totalSharesAsBigNumber.toJSON(),
      pricePerFullShare: sharePriceAsBigNumber.toJSON(),
      totalCakeInVault: totalCakeInVaultEstimate.cakeAsBigNumber.toJSON(),
      estimatedCakeBountyReward: new BigNumber(estimatedCakeBountyReward.toString()).toJSON(),
      totalPendingCakeHarvest: new BigNumber(totalPendingCakeHarvest.toString()).toJSON(),
    }
  } catch (error) {
    return {
      totalShares: null,
      pricePerFullShare: null,
      totalCakeInVault: null,
      estimatedCakeBountyReward: null,
      totalPendingCakeHarvest: null,
    }
  }
}

export const fetchVaultFees = async () => {
  try {
    const calls = ['performanceFee', 'callFee', 'withdrawFee', 'withdrawFeePeriod'].map((method) => ({
      address: getCoinCollectAutoPoolVaultAddress(),
      name: method,
    }))

    const [[performanceFee], [callFee], [withdrawalFee], [withdrawalFeePeriod]] = await multicallPolygonv2(cakeVaultAbi, calls)
    
    return {
      performanceFee: performanceFee.toNumber(),
      callFee: callFee.toNumber(),
      withdrawalFee: withdrawalFee.toNumber(),
      withdrawalFeePeriod: withdrawalFeePeriod.toNumber(),
    }
  } catch (error) {
    return {
      performanceFee: null,
      callFee: null,
      withdrawalFee: null,
      withdrawalFeePeriod: null,
    }
  }
}

export default fetchPublicVaultData
