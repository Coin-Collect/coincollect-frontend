import { useCallback } from 'react'
import { stakeFarm } from 'utils/calls'
import BigNumber from 'bignumber.js'
import { DEFAULT_TOKEN_DECIMAL, DEFAULT_GAS_LIMIT } from 'config'
import { BIG_TEN } from 'utils/bigNumber'
import { useCoinCollectPool, useSousChef } from 'hooks/useContract'
import { useGasPrice } from 'state/user/hooks'

const options = {
  gasLimit: DEFAULT_GAS_LIMIT,
}

const sousStake = async (sousChefContract, amount, gasPrice, decimals = 18) => {
  return sousChefContract.deposit(new BigNumber(amount).times(BIG_TEN.pow(decimals)).toString(), {
    ...options,
    gasPrice,
  })
}

const sousStakeBnb = async (sousChefContract, amount, gasPrice) => {
  return sousChefContract.deposit(new BigNumber(amount).times(DEFAULT_TOKEN_DECIMAL).toString(), {
    ...options,
    gasPrice,
  })
}

const useStakePool = (sousId: number, isUsingBnb = false) => {
  const masterChefContract = useCoinCollectPool()
  const sousChefContract = useSousChef(sousId)
  const gasPrice = useGasPrice()

  const handleStake = useCallback(
    async (amount: string, decimals: number) => {
      if (sousId === 0) {
        return stakeFarm(masterChefContract, 0, amount, gasPrice)
      }
      if (isUsingBnb) {
        return sousStakeBnb(sousChefContract, amount, gasPrice)
      }
      return sousStake(sousChefContract, amount, gasPrice, decimals)
    },
    [isUsingBnb, masterChefContract, sousChefContract, sousId, gasPrice],
  )

  return { onStake: handleStake }
}

export default useStakePool
