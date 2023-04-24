import { useCallback } from 'react'
import { stakeNftFarm } from 'utils/calls'
import { useCoinCollectNftStake } from 'hooks/useContract'
import { useGasPrice } from 'state/user/hooks'

const useStakeFarms = (pid: number) => {
  const masterChefContract = useCoinCollectNftStake() //useMasterchef()
  const gasPrice = useGasPrice()

  const handleStake = useCallback(
    async (tokenIds: number[]) => {
      return stakeNftFarm(masterChefContract, pid, tokenIds, gasPrice)
    },
    [masterChefContract, pid, gasPrice],
  )

  return { onStake: handleStake }
}

export default useStakeFarms
