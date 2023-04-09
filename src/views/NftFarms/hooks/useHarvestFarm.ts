import { useCallback } from 'react'
import { harvestFarm } from 'utils/calls'
import { useCoinCollectNftStake } from 'hooks/useContract'

const useHarvestFarm = (farmPid: number) => {
  const masterChefContract = useCoinCollectNftStake() //useMasterchef()

  const handleHarvest = useCallback(async () => {
    return harvestFarm(masterChefContract, farmPid)
  }, [farmPid, masterChefContract])

  return { onReward: handleHarvest }
}

export default useHarvestFarm
