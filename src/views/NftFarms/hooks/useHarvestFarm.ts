import { useCallback } from 'react'
import { harvestFarm } from 'utils/calls'
import { useCoinCollectFarm } from 'hooks/useContract'

const useHarvestFarm = (farmPid: number) => {
  const masterChefContract = useCoinCollectFarm() //useMasterchef()

  const handleHarvest = useCallback(async () => {
    return harvestFarm(masterChefContract, farmPid)
  }, [farmPid, masterChefContract])

  return { onReward: handleHarvest }
}

export default useHarvestFarm
