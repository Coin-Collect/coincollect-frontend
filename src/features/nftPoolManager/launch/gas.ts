import { BigNumber } from '@ethersproject/bignumber'
import type { Signer } from '@ethersproject/abstract-signer'
import type { Provider } from '@ethersproject/providers'

export const WRITE_GAS_SAFETY_BPS = 125

export interface NftLaunchWriteGasCheck {
  gasLimit: BigNumber
  gasPrice: BigNumber
  estimatedCost: BigNumber
  safetyCost: BigNumber
  walletBalance: BigNumber
  sufficient: boolean
}

function paddedGas(gas: BigNumber): BigNumber {
  return gas.mul(WRITE_GAS_SAFETY_BPS).div(100)
}

function effectiveGasPrice(feeData: any): BigNumber {
  const value = feeData?.maxFeePerGas || feeData?.gasPrice
  if (!value) throw new Error('Current Polygon fee data is unavailable; write blocked.')
  const price = BigNumber.from(value)
  if (price.lte(0)) throw new Error('Current Polygon fee data is invalid; write blocked.')
  return price
}

export async function checkNftLaunchWriteGas(
  provider: Provider,
  signer: Signer,
  estimatedGas: BigNumber,
): Promise<NftLaunchWriteGasCheck> {
  if (!estimatedGas || estimatedGas.lte(0)) throw new Error('Gas estimate is invalid; write blocked.')
  const account = await signer.getAddress()
  const [feeData, walletBalance] = await Promise.all([provider.getFeeData(), provider.getBalance(account)])
  const gasPrice = effectiveGasPrice(feeData)
  const gasLimit = paddedGas(estimatedGas)
  const estimatedCost = gasLimit.mul(gasPrice)
  const safetyCost = estimatedCost.mul(WRITE_GAS_SAFETY_BPS).div(100)
  return {
    gasLimit,
    gasPrice,
    estimatedCost,
    safetyCost,
    walletBalance: BigNumber.from(walletBalance),
    sufficient: BigNumber.from(walletBalance).gte(safetyCost),
  }
}

export function assertNftLaunchWriteGas(check: NftLaunchWriteGasCheck): void {
  if (!check.sufficient)
    throw new Error(
      `Wallet does not have enough native POL for this write. Required safety balance: ${check.safetyCost.toString()} wei.`,
    )
}
