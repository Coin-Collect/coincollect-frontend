import { useCallback } from 'react'
import { harvestNftFarm } from 'utils/calls'
import { useNftFarmActionContract } from 'hooks/useContract'
import { useGasPrice } from 'state/user/hooks'
import { useFarmFromPid } from 'state/nftFarms/hooks'
import { getAddress } from 'utils/addressHelpers'

const useHarvestFarm = (farmPid: number) => {
  const farm = useFarmFromPid(farmPid)
  const isSmartNftPool = farm?.contractAddresses ? getAddress(farm.contractAddresses) : null
  const masterChefContract = useNftFarmActionContract(farmPid, Boolean(isSmartNftPool))
  const gasPrice = useGasPrice()
  const hasPool = Boolean(farm)

  const handleHarvest = useCallback(async () => {
    if (!hasPool || !masterChefContract) throw new Error('NFT pool or wallet is unavailable.')
    return harvestNftFarm(masterChefContract, farmPid, gasPrice, isSmartNftPool)
  }, [hasPool, farmPid, masterChefContract, gasPrice, isSmartNftPool])

  return { onReward: handleHarvest }
}

export default useHarvestFarm
