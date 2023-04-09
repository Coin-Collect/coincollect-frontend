import { useCallback } from 'react'
import { stakeNftFarm } from 'utils/calls'
import { useCoinCollectNftStake } from 'hooks/useContract'

const useStakeFarms = (pid: number) => {
  const masterChefContract = useCoinCollectNftStake() //useMasterchef()

  const handleStake = useCallback(
    async (tokenIds: number[]) => {
      return stakeNftFarm(masterChefContract, pid, tokenIds)
    },
    [masterChefContract, pid],
  )

  return { onStake: handleStake }
}

export default useStakeFarms
