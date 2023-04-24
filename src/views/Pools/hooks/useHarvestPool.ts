import { useCallback } from 'react'
import { harvestFarm } from 'utils/calls'
import { BIG_ZERO } from 'utils/bigNumber'
import { useCoinCollectPool, useSousChef } from 'hooks/useContract'
import { DEFAULT_GAS_LIMIT } from 'config'
import { useGasPrice } from 'state/user/hooks'

const options = {
  gasLimit: DEFAULT_GAS_LIMIT,
}

const harvestPool = async (sousChefContract, gasPrice) => {
  return sousChefContract.deposit('0', { ...options, gasPrice })
}

const harvestPoolBnb = async (sousChefContract, gasPrice) => {
  return sousChefContract.deposit({ ...options, value: BIG_ZERO, gasPrice })
}

const useHarvestPool = (sousId, isUsingBnb = false) => {
  const sousChefContract = useSousChef(sousId)
  const masterChefContract = useCoinCollectPool() // useMasterchef()
  const gasPrice = useGasPrice()

  const handleHarvest = useCallback(async () => {
    if (sousId === 0) {
      return harvestFarm(masterChefContract, 0, gasPrice)
    }

    if (isUsingBnb) {
      return harvestPoolBnb(sousChefContract, gasPrice)
    }

    return harvestPool(sousChefContract, gasPrice)
  }, [isUsingBnb, masterChefContract, sousChefContract, sousId, gasPrice])

  return { onReward: handleHarvest }
}

export default useHarvestPool
