import { useCallback } from 'react'
import { stakeNftFarm } from 'utils/calls'
import { useCoinCollectNftStake, useSmartNftStakeContract, useSousChef } from 'hooks/useContract'
import { useGasPrice } from 'state/user/hooks'
import { useFarmFromPid } from 'state/nftFarms/hooks'
import { getAddress } from 'utils/addressHelpers'

const useStakeFarms = (pid: number) => {
  const farm = useFarmFromPid(pid)
  const isSmartNftPool = farm.contractAddresses ? getAddress(farm.contractAddresses) : null
  const masterChefContract = isSmartNftPool ? useSmartNftStakeContract(pid) : useCoinCollectNftStake() 
  
  const gasPrice = useGasPrice()

  const handleStake = useCallback(
    async (tokenIds: number[]) => {
      return stakeNftFarm(masterChefContract, pid, tokenIds, gasPrice, isSmartNftPool)
    },
    [masterChefContract, pid, gasPrice],
  )


  return { onStake: handleStake }
}

export default useStakeFarms
