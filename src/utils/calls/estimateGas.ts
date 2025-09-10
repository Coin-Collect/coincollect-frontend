import { Contract, Overrides, PayableOverrides } from '@ethersproject/contracts'
import { BigNumber } from '@ethersproject/bignumber'
import { DEFAULT_GAS_LIMIT } from 'config'
import { TransactionResponse } from '@ethersproject/providers'

/**
 * Estimate the gas needed to call a function, and add a 10% margin
 * @param contract Used to perform the call
 * @param methodName The name of the methode called
 * @param gasMarginPer10000 The gasMargin per 10000 (i.e. 10% -> 1000)
 * @param args An array of arguments to pass to the method
 * @returns https://docs.ethers.io/v5/api/providers/types/#providers-TransactionReceipt
 */
export const estimateGas = async (
  contract: Contract,
  methodName: string,
  methodArgs: any[],
  overrides: PayableOverrides = {},
  gasMarginPer10000: number,
) => {
  if (!contract[methodName]) {
    throw new Error(`Method ${methodName} doesn't exist on ${contract.address}`)
  }
  const rawGasEstimation = await contract.estimateGas[methodName](...methodArgs, {...overrides,})
  // By convention, BigNumber values are multiplied by 1000 to avoid dealing with real numbers
  const gasEstimation = rawGasEstimation
    .mul(BigNumber.from(10000).add(BigNumber.from(gasMarginPer10000)))
    .div(BigNumber.from(10000))
  return gasEstimation
}

/**
 * Perform a contract call with a gas value returned from estimateGas
 * @param contract Used to perform the call
 * @param methodName The name of the method called
 * @param methodArgs An array of arguments to pass to the method
 * @param overrides An overrides object to pass to the method
 * @returns https://docs.ethers.io/v5/api/providers/types/#providers-TransactionReceipt
 */
export const callWithEstimateGas = async (
  contract: Contract,
  methodName: string,
  methodArgs: any[] = [],
  overrides: PayableOverrides = {},
  gasMarginPer10000 = 1000,
): Promise<TransactionResponse> => {
  let gasLimit: BigNumber | undefined

  try {
    gasLimit = await estimateGas(contract, methodName, methodArgs, overrides, gasMarginPer10000)
  } catch (err) {
    // Fallback on unpredictable gas errors by providing a conservative manual gas limit
    // Heuristic: base + per-item cost for any array args
    const arrayArgLengths = methodArgs
      .filter((arg) => Array.isArray(arg))
      .reduce((sum: number, arr: any[]) => sum + arr.length, 0)

    const base = BigNumber.from(DEFAULT_GAS_LIMIT) // 200k default
    const perItem = BigNumber.from(120000) // add ~120k per array item
    const heuristic = arrayArgLengths > 0 ? base.add(perItem.mul(arrayArgLengths)) : base.mul(2) // 400k when no arrays

    // Cap fallback to prevent excessive limits
    const cap = BigNumber.from(2_500_000)
    gasLimit = heuristic.gt(cap) ? cap : heuristic
  }

  const tx = await contract[methodName](...methodArgs, {
    gasLimit,
    ...overrides,
  })
  return tx
}
