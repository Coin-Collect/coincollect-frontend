import { useCallback } from 'react'
import { unstakeNftFarm } from 'utils/calls'
import { useCoinCollectNftStake, useSmartNftStakeContract } from 'hooks/useContract'
import { useGasPrice } from 'state/user/hooks'
import { useFarmFromPid } from 'state/nftFarms/hooks'
import { getAddress } from 'utils/addressHelpers'

const useUnstakeFarms = (pid: number) => {
  const farm = useFarmFromPid(pid)
  const isSmartNftPool = farm.contractAddresses ? getAddress(farm.contractAddresses) : null
  const masterChefContract = isSmartNftPool ? useSmartNftStakeContract(pid) : useCoinCollectNftStake() 
  const gasPrice = useGasPrice()

  const handleUnstake = useCallback(
    async (collectionAddresses: string[], tokenIds: number[]) => {
      return unstakeNftFarm(masterChefContract, pid, collectionAddresses, tokenIds, gasPrice, isSmartNftPool)
    },
    [masterChefContract, pid, gasPrice, isSmartNftPool],
  )

  return { onUnstake: handleUnstake }
}

export default useUnstakeFarms
