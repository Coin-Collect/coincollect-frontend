import { useCallback } from 'react'
import { stakeNftFarm } from 'utils/calls'
import { useNftFarmActionContract } from 'hooks/useContract'
import { useGasPrice } from 'state/user/hooks'
import { useFarmFromPid } from 'state/nftFarms/hooks'
import { getAddress } from 'utils/addressHelpers'

const useStakeFarms = (pid: number) => {
  const farm = useFarmFromPid(pid)
  const isSmartNftPool = farm?.contractAddresses ? getAddress(farm.contractAddresses) : null
  const masterChefContract = useNftFarmActionContract(pid, Boolean(isSmartNftPool))
  const gasPrice = useGasPrice()
  const hasPool = Boolean(farm)

  const handleStake = useCallback(
    async (collectionAddresses: string[], tokenIds: string[]) => {
      if (!hasPool || !masterChefContract) throw new Error('NFT pool or wallet is unavailable.')
      return stakeNftFarm(masterChefContract, pid, collectionAddresses, tokenIds, gasPrice, isSmartNftPool, farm?.performanceFee);
    },
    [hasPool, masterChefContract, pid, gasPrice, isSmartNftPool, farm?.performanceFee]
  );
  


  return { onStake: handleStake }
}

export default useStakeFarms
