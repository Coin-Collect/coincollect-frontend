import BigNumber from 'bignumber.js'
import { DEFAULT_GAS_LIMIT, DEFAULT_TOKEN_DECIMAL } from 'config'
import { callWithEstimateGas } from 'utils/calls'

const options = {
  gasLimit: DEFAULT_GAS_LIMIT,
}

export const stakeNftFarm = async (masterChefContract, pid, tokenIds, gasPrice) => {
  return callWithEstimateGas(masterChefContract, 'stakeAll', [pid, tokenIds], {
    gasPrice,
  })
}

export const unstakeNftFarm = async (masterChefContract, pid, tokenIds, gasPrice) => {
  return callWithEstimateGas(masterChefContract, 'unstakeAll', [pid, tokenIds], {
    gasPrice,
  })
}

export const harvestNftFarm = async (masterChefContract, pid, gasPrice) => {
  return masterChefContract.harvest(pid, { ...options, gasPrice })
}
