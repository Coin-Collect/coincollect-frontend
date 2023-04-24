import BigNumber from 'bignumber.js'
import { DEFAULT_GAS_LIMIT, DEFAULT_TOKEN_DECIMAL } from 'config'

const options = {
  gasLimit: DEFAULT_GAS_LIMIT,
}

export const stakeFarm = async (masterChefContract, pid, amount, gasPrice) => {
  const value = new BigNumber(amount).times(DEFAULT_TOKEN_DECIMAL).toString()
  if (pid === 0) {
    return masterChefContract.enterStaking(value, { ...options, gasPrice })
  }

  return masterChefContract.deposit(pid, value, { ...options, gasPrice })
}

export const unstakeFarm = async (masterChefContract, pid, amount, gasPrice) => {
  const value = new BigNumber(amount).times(DEFAULT_TOKEN_DECIMAL).toString()
  if (pid === 0) {
    return masterChefContract.leaveStaking(value, { ...options, gasPrice })
  }

  return masterChefContract.withdraw(pid, value, { ...options, gasPrice })
}

export const harvestFarm = async (masterChefContract, pid, gasPrice) => {
  if (pid === 0) {
    return masterChefContract.leaveStaking('0', { ...options, gasPrice })
  }

  return masterChefContract.deposit(pid, '0', { ...options, gasPrice })
}
