import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import { getAddress, isAddress } from '@ethersproject/address'
import type { Signer } from '@ethersproject/abstract-signer'
import type { Provider, TransactionReceipt, TransactionResponse } from '@ethersproject/providers'
import nftFactoryAbi from 'config/abi/nftSmartChefFactory.json'
import erc20Abi from 'config/abi/erc20.json'
import { NftPoolDeploymentPlan } from '../types'
import { NftLaunchSchedule, DeploymentResult } from './types'
import { nftPoolAbi } from './abi'

const SAFETY_BPS = 125

export function buildNftDeployArguments(plan: NftPoolDeploymentPlan, schedule: NftLaunchSchedule): any[] {
  if (schedule.startBlock <= 0 || schedule.endBlock <= schedule.startBlock)
    throw new Error('The final launch schedule is invalid.')
  const params = plan.factoryParameters
  return [
    getAddress(params.stakedTokenAddress),
    getAddress(params.rewardTokenAddress),
    params.sideRewardTokens.map(getAddress),
    params.sideRewardPercentages.map((value) => BigNumber.from(value)),
    BigNumber.from(params.rewardPerBlock),
    schedule.startBlock,
    schedule.endBlock,
    BigNumber.from(params.poolLimitPerUser),
    BigNumber.from(params.numberBlocksForUserLimit),
    {
      poolCapacity: BigNumber.from(params.poolCapacity),
      participantThreshold: BigNumber.from(params.participantThreshold),
    },
    getAddress(params.intendedAdmin),
  ]
}

function paddedGas(gas: BigNumber): BigNumber {
  return gas.mul(SAFETY_BPS).div(100)
}

export async function simulateNftDeploy(
  provider: Provider,
  factoryAddress: string,
  plan: NftPoolDeploymentPlan,
  schedule: NftLaunchSchedule,
  from?: string,
): Promise<BigNumber> {
  const factory = new Contract(factoryAddress, nftFactoryAbi, provider)
  const args = buildNftDeployArguments(plan, schedule)
  const overrides = from ? { from } : {}
  await factory.callStatic.deployPool(...args, overrides)
  return BigNumber.from(await factory.estimateGas.deployPool(...args, overrides))
}

async function waitForReceipt(transaction: TransactionResponse): Promise<TransactionReceipt> {
  try {
    const receipt = await transaction.wait(1)
    if (!receipt || receipt.status !== 1) throw new Error('Transaction failed on Polygon.')
    return receipt
  } catch (error: any) {
    if (error?.code === 'TRANSACTION_REPLACED' && error.cancelled !== true && error.receipt) {
      if (error.receipt.status !== 1) throw new Error('Replacement transaction failed on Polygon.')
      return error.receipt
    }
    throw error
  }
}

export function parseNftPoolAddress(receipt: TransactionReceipt, factoryAddress: string): string {
  const factory = new Contract(factoryAddress, nftFactoryAbi)
  for (const log of receipt.logs) {
    try {
      const parsed = factory.interface.parseLog(log)
      if (parsed.name === 'NewSmartChefContract') return getAddress(parsed.args.smartChef || parsed.args[0])
    } catch {
      // Deployment receipts contain unrelated token/initialization logs.
    }
  }
  throw new Error('Deployment receipt did not contain NewSmartChefContract.')
}

export async function deployNftPool(
  signer: Signer,
  factoryAddress: string,
  plan: NftPoolDeploymentPlan,
  schedule: NftLaunchSchedule,
  onSubmitted?: (hash: string) => void,
): Promise<DeploymentResult> {
  const provider = signer.provider
  if (!provider) throw new Error('Connected wallet did not expose a provider.')
  const gasEstimate = await simulateNftDeploy(provider, factoryAddress, plan, schedule, await signer.getAddress())
  const factory = new Contract(factoryAddress, nftFactoryAbi, signer)
  const transaction: TransactionResponse = await factory.deployPool(...buildNftDeployArguments(plan, schedule), {
    gasLimit: paddedGas(gasEstimate),
  })
  onSubmitted?.(transaction.hash)
  const receipt = await waitForReceipt(transaction)
  return {
    poolAddress: parseNftPoolAddress(receipt, factoryAddress),
    transactionHash: receipt.transactionHash,
    blockNumber: receipt.blockNumber,
    receipt,
  }
}

async function writePoolAction(
  signer: Signer,
  poolAddress: string,
  method: string,
  args: any[],
  onSubmitted?: (hash: string) => void,
): Promise<TransactionReceipt> {
  if (!isAddress(poolAddress)) throw new Error('Pool address is invalid.')
  const provider = signer.provider
  if (!provider) throw new Error('Connected wallet did not expose a provider.')
  const readPool = new Contract(poolAddress, nftPoolAbi, provider)
  const writePool = new Contract(poolAddress, nftPoolAbi, signer)
  const overrides = { from: await signer.getAddress() }
  await readPool.callStatic[method](...args, overrides)
  const gas = BigNumber.from(await readPool.estimateGas[method](...args, overrides))
  const transaction: TransactionResponse = await writePool[method](...args, { gasLimit: paddedGas(gas) })
  onSubmitted?.(transaction.hash)
  return waitForReceipt(transaction)
}

export function configureNftCollectionWeights(
  signer: Signer,
  poolAddress: string,
  plan: NftPoolDeploymentPlan,
  onSubmitted?: (hash: string) => void,
): Promise<TransactionReceipt> {
  const config = plan.collectionConfiguration.setCollectionWeightsArguments
  return writePoolAction(
    signer,
    poolAddress,
    'setCollectionWeights',
    [
      config.communityNftAddresses.map(getAddress),
      config.weights.map((value) => BigNumber.from(value)),
      BigNumber.from(config.stakedTokenWeight),
    ],
    onSubmitted,
  )
}

export function configureNftPerformanceFee(
  signer: Signer,
  poolAddress: string,
  feeTo: string,
  performanceFee: string,
  onSubmitted?: (hash: string) => void,
): Promise<TransactionReceipt> {
  return writePoolAction(
    signer,
    poolAddress,
    'setPerformanceFee',
    [getAddress(feeTo), BigNumber.from(performanceFee)],
    onSubmitted,
  )
}

export function updateNftPoolSchedule(
  signer: Signer,
  poolAddress: string,
  startBlock: number,
  endBlock: number,
  onSubmitted?: (hash: string) => void,
): Promise<TransactionReceipt> {
  return writePoolAction(signer, poolAddress, 'updateStartAndEndBlocks', [startBlock, endBlock], onSubmitted)
}

export function mapNftLaunchError(error: any): string {
  const message =
    error?.data?.message || error?.error?.message || error?.reason || error?.message || 'Wallet action failed.'
  if (/user denied|rejected/i.test(message)) return 'Signature rejected.'
  if (/insufficient funds/i.test(message)) return 'Wallet does not have enough native POL for gas.'
  return String(message)
}
