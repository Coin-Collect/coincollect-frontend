import BigNumber from 'bignumber.js'
import { DEFAULT_GAS_LIMIT, DEFAULT_TOKEN_DECIMAL } from 'config'
import getGasPrice from 'utils/getGasPrice'

const options = {
  gasLimit: DEFAULT_GAS_LIMIT,
}

export const stakeNftFarm = async (masterChefContract, pid, tokenIds) => {
  const gasPrice = getGasPrice()
  const gasLimit = 350000 * tokenIds.length // Increase for each token
  return masterChefContract.stakeAll(pid, tokenIds, { gasLimit, gasPrice })
}

export const unstakeNftFarm = async (masterChefContract, pid, tokenIds) => {
  const gasPrice = getGasPrice()
  const gasLimit = 350000 * tokenIds.length // Increase for each token
  return masterChefContract.unstakeAll(pid, tokenIds, { gasLimit, gasPrice })
}

export const harvestNftFarm = async (masterChefContract, pid) => {
  const gasPrice = getGasPrice()
  return masterChefContract.harvest(pid, { ...options, gasPrice })
}
