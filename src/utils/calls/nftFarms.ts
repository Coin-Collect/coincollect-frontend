import BigNumber from 'bignumber.js'
import { DEFAULT_GAS_LIMIT, DEFAULT_TOKEN_DECIMAL } from 'config'
import getGasPrice from 'utils/getGasPrice'

const options = {
  gasLimit: DEFAULT_GAS_LIMIT,
}

export const stakeNftFarm = async (masterChefContract, pid, tokenIds) => {
  const gasPrice = getGasPrice()
  const gasLimit = 340000 * tokenIds.length // Increase for each token
  return masterChefContract.stakeAll(pid, tokenIds, { gasLimit, gasPrice })
}

export const unstakeNftFarm = async (masterChefContract, pid, amount) => {
  const gasPrice = getGasPrice()
  const value = new BigNumber(amount).times(DEFAULT_TOKEN_DECIMAL).toString()
  if (pid === 0) {
    return masterChefContract.leaveStaking(value, { ...options, gasPrice })
  }

  return masterChefContract.withdraw(pid, value, { ...options, gasPrice })
}

export const harvestNftFarm = async (masterChefContract, pid) => {
  const gasPrice = getGasPrice()
  if (pid === 0) {
    return masterChefContract.leaveStaking('0', { ...options, gasPrice })
  }

  return masterChefContract.deposit(pid, '0', { ...options, gasPrice })
}
