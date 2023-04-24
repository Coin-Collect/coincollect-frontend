import { useCallback } from 'react'
import { harvestNftFarm } from 'utils/calls'
import { useCoinCollectNftStake } from 'hooks/useContract'
import { useGasPrice } from 'state/user/hooks'

const useHarvestFarm = (farmPid: number) => {
  const masterChefContract = useCoinCollectNftStake() //useMasterchef()
  const gasPrice = useGasPrice()

  const handleHarvest = useCallback(async () => {
    return harvestNftFarm(masterChefContract, farmPid, gasPrice)
  }, [farmPid, masterChefContract, gasPrice])

  return { onReward: handleHarvest }
}

export default useHarvestFarm
