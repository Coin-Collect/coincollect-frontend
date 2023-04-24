import { useCallback } from 'react'
import { unstakeNftFarm } from 'utils/calls'
import { useCoinCollectNftStake } from 'hooks/useContract'
import { useGasPrice } from 'state/user/hooks'

const useUnstakeFarms = (pid: number) => {
  const masterChefContract = useCoinCollectNftStake() //useMasterchef()
  const gasPrice = useGasPrice()

  const handleUnstake = useCallback(
    async (tokenIds: number[]) => {
      return unstakeNftFarm(masterChefContract, pid, tokenIds, gasPrice)
    },
    [masterChefContract, pid, gasPrice],
  )

  return { onUnstake: handleUnstake }
}

export default useUnstakeFarms
