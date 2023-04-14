import { useCallback } from 'react'
import { harvestNftFarm } from 'utils/calls'
import { useCoinCollectNftStake } from 'hooks/useContract'

const useHarvestFarm = (farmPid: number) => {
  const masterChefContract = useCoinCollectNftStake() //useMasterchef()

  const handleHarvest = useCallback(async () => {
    return harvestNftFarm(masterChefContract, farmPid)
  }, [farmPid, masterChefContract])

  return { onReward: handleHarvest }
}

export default useHarvestFarm
