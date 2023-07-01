import BigNumber from 'bignumber.js'
import { DEFAULT_GAS_LIMIT, DEFAULT_TOKEN_DECIMAL } from 'config'
import { callWithEstimateGas } from 'utils/calls'

const options = {
  gasLimit: DEFAULT_GAS_LIMIT,
}

export const stakeNftFarm = async (masterChefContract, pid, tokenIds, gasPrice, isSmartNftPool) => {
  return callWithEstimateGas(masterChefContract, 'stakeAll', isSmartNftPool ? [tokenIds] : [pid, tokenIds], {
    gasPrice,
  })
}

export const unstakeNftFarm = async (masterChefContract, pid, tokenIds, gasPrice, isSmartNftPool) => {
  return callWithEstimateGas(masterChefContract, 'unstakeAll', isSmartNftPool ? [tokenIds] : [pid, tokenIds], {
    gasPrice,
  })
}

export const harvestNftFarm = async (masterChefContract, pid, gasPrice, isSmartNftPool) => {
  return isSmartNftPool ? masterChefContract.harvest({ ...options, gasPrice }) : masterChefContract.harvest(pid, { ...options, gasPrice })
}
