import { useCallback } from 'react'
import { unstakeNftFarm } from 'utils/calls'
import { useCoinCollectNftStake } from 'hooks/useContract'

const useUnstakeFarms = (pid: number) => {
  const masterChefContract = useCoinCollectNftStake() //useMasterchef()

  const handleUnstake = useCallback(
    async (tokenIds: number[]) => {
      return unstakeNftFarm(masterChefContract, pid, tokenIds)
    },
    [masterChefContract, pid],
  )

  return { onUnstake: handleUnstake }
}

export default useUnstakeFarms
