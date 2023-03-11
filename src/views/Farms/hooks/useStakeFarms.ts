import { useCallback } from 'react'
import { stakeFarm } from 'utils/calls'
import { useCoinCollectFarm } from 'hooks/useContract'

const useStakeFarms = (pid: number) => {
  const masterChefContract = useCoinCollectFarm() //useMasterchef()

  const handleStake = useCallback(
    async (amount: string) => {
      return stakeFarm(masterChefContract, pid, amount)
    },
    [masterChefContract, pid],
  )

  return { onStake: handleStake }
}

export default useStakeFarms
