import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import { getAddress, isAddress } from '@ethersproject/address'
import type { Signer } from '@ethersproject/abstract-signer'
import type { Provider, TransactionReceipt, TransactionResponse } from '@ethersproject/providers'
import erc20Abi from 'config/abi/erc20.json'
import { NftPoolDeploymentPlan } from '../types'
import { FundingResult } from './types'
import { assertNftLaunchWriteGas, checkNftLaunchWriteGas } from './gas'

async function waitForReceipt(transaction: TransactionResponse): Promise<TransactionReceipt> {
  try {
    const receipt = await transaction.wait(1)
    if (!receipt || receipt.status !== 1) throw new Error('Funding transaction failed on Polygon.')
    return receipt
  } catch (error: any) {
    if (error?.code === 'TRANSACTION_REPLACED' && error.cancelled !== true && error.receipt) {
      if (error.receipt.status !== 1) throw new Error('Replacement funding transaction failed on Polygon.')
      return error.receipt
    }
    throw error
  }
}

export async function fundNftPoolTokenIfNeeded(
  signer: Signer,
  poolAddress: string,
  tokenAddress: string,
  requiredAmount: BigNumber,
  onSubmitted?: (hash: string) => void,
): Promise<FundingResult> {
  if (!isAddress(poolAddress) || !isAddress(tokenAddress)) throw new Error('Pool or funding token address is invalid.')
  if (requiredAmount.lt(0)) throw new Error('Required funding amount cannot be negative.')
  const provider = signer.provider
  if (!provider) throw new Error('Connected wallet did not expose a provider.')
  const readToken = new Contract(tokenAddress, erc20Abi, provider)
  const writeToken = new Contract(tokenAddress, erc20Abi, signer)
  const [beforePoolBalance, walletBalance] = await Promise.all([
    readToken.balanceOf(poolAddress).then(BigNumber.from),
    signer
      .getAddress()
      .then((account) => readToken.balanceOf(account))
      .then(BigNumber.from),
  ])
  if (beforePoolBalance.gte(requiredAmount) || requiredAmount.isZero()) {
    return {
      status: 'SKIPPED',
      tokenAddress: getAddress(tokenAddress),
      requiredAmount,
      beforePoolBalance,
      afterPoolBalance: beforePoolBalance,
      walletBalance,
    }
  }
  const missing = requiredAmount.sub(beforePoolBalance)
  if (walletBalance.lt(missing)) {
    throw new Error(`Insufficient ${getAddress(tokenAddress)} balance: missing ${missing.toString()} base units.`)
  }
  await readToken.callStatic.transfer(poolAddress, missing)
  const estimatedGas = BigNumber.from(await readToken.estimateGas.transfer(poolAddress, missing))
  const gas = await checkNftLaunchWriteGas(provider, signer, estimatedGas)
  assertNftLaunchWriteGas(gas)
  const transaction: TransactionResponse = await writeToken.transfer(poolAddress, missing, { gasLimit: gas.gasLimit })
  onSubmitted?.(transaction.hash)
  const receipt = await waitForReceipt(transaction)
  if (receipt.transactionHash !== transaction.hash) onSubmitted?.(receipt.transactionHash)
  const afterPoolBalance = BigNumber.from(await readToken.balanceOf(poolAddress))
  if (afterPoolBalance.lt(requiredAmount)) {
    throw new Error(
      `Funding verification failed for ${getAddress(
        tokenAddress,
      )}: pool balance is ${afterPoolBalance.toString()}, required ${requiredAmount.toString()}.`,
    )
  }
  return {
    status: 'VERIFIED',
    tokenAddress: getAddress(tokenAddress),
    requiredAmount,
    beforePoolBalance,
    afterPoolBalance,
    walletBalance,
    transactionHash: receipt.transactionHash,
    receipt,
  }
}

export function primaryFundingAmount(plan: NftPoolDeploymentPlan): BigNumber {
  return BigNumber.from(plan.fundingRequirements.primary.maximumScheduledFunding)
}

export function sideFundingAmount(plan: NftPoolDeploymentPlan, tokenAddress: string): BigNumber {
  const item = plan.fundingRequirements.side.find(
    (side) => side.tokenAddress.toLowerCase() === tokenAddress.toLowerCase(),
  )
  if (!item) throw new Error('Side reward token is not part of the frozen launch plan.')
  return BigNumber.from(item.maximumImpliedSideFunding)
}
