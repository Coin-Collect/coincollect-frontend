import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import type { Signer } from '@ethersproject/abstract-signer'
import { getAddress, isAddress } from '@ethersproject/address'
import type { TransactionReceipt } from '@ethersproject/providers'
import factoryAbi from 'config/abi/smartChefFactoryV2.json'
import smartChefAbi from 'config/abi/coinStakeSmartChefV2.json'
import erc20Abi from 'config/abi/erc20.json'
import { introspectPool } from './discovery'
import { DeploymentVerification, FundingVerification, NormalizedPool, PoolDeploymentParameters } from './types'

const asString = (value: BigNumber | number | string) => value.toString()

export function validateDeploymentParameters(parameters: PoolDeploymentParameters): string[] {
  const errors: string[] = []
  if (!isAddress(parameters.stakedToken)) errors.push('Staking token address is invalid.')
  if (!isAddress(parameters.rewardToken)) errors.push('Reward token address is invalid.')
  if (!isAddress(parameters.admin)) errors.push('Pool admin address is invalid.')
  if (parameters.rewardPerBlock.lte(0)) errors.push('Reward per block must be greater than zero.')
  if (!Number.isInteger(parameters.startBlock) || parameters.startBlock < 0)
    errors.push('Start block must be a non-negative integer.')
  if (!Number.isInteger(parameters.bonusEndBlock) || parameters.bonusEndBlock <= parameters.startBlock)
    errors.push('End block must be after start block.')
  if (!Number.isInteger(parameters.numberBlocksForUserLimit) || parameters.numberBlocksForUserLimit < 0)
    errors.push('User-limit block window must be a non-negative integer.')
  if (parameters.poolLimitPerUser.lt(0)) errors.push('Pool limit cannot be negative.')
  if (parameters.participantThreshold.lt(0)) errors.push('Participant threshold cannot be negative.')
  return errors
}

export function buildDeployArguments(
  parameters: PoolDeploymentParameters,
): [string, string, BigNumber, number, number, BigNumber, number, BigNumber, string] {
  return [
    getAddress(parameters.stakedToken),
    getAddress(parameters.rewardToken),
    parameters.rewardPerBlock,
    parameters.startBlock,
    parameters.bonusEndBlock,
    parameters.poolLimitPerUser,
    parameters.numberBlocksForUserLimit,
    parameters.participantThreshold,
    getAddress(parameters.admin),
  ]
}

export function parseNewSmartChefAddress(receipt: TransactionReceipt, factoryAddress: string): string {
  const factory = new Contract(factoryAddress, factoryAbi)
  for (const log of receipt.logs) {
    try {
      const parsed = factory.interface.parseLog(log)
      if (parsed.name === 'NewSmartChefContract') return getAddress(parsed.args[0])
    } catch {
      // Ignore unrelated logs.
    }
  }
  throw new Error('Deployment receipt did not contain NewSmartChefContract.')
}

export function compareDeploymentToPool(
  pool: NormalizedPool,
  parameters: PoolDeploymentParameters,
): DeploymentVerification['checks'] {
  const checks = [
    ['staking token', parameters.stakedToken, pool.stakingToken.address],
    ['reward token', parameters.rewardToken, pool.rewardToken.address],
    ['reward per block', asString(parameters.rewardPerBlock), asString(pool.rewardPerBlock)],
    ['start block', asString(parameters.startBlock), asString(pool.startBlock)],
    ['end block', asString(parameters.bonusEndBlock), asString(pool.bonusEndBlock)],
    ['pool limit per user', asString(parameters.poolLimitPerUser), asString(pool.poolLimitPerUser)],
    ['user-limit block window', asString(parameters.numberBlocksForUserLimit), asString(pool.numberBlocksForUserLimit)],
    ['participant threshold', asString(parameters.participantThreshold), asString(pool.participantThreshold)],
    ['pool admin', parameters.admin, pool.owner || ''],
  ]
  return checks.map(([label, expected, actual]) => ({
    label,
    expected,
    actual,
    ok: expected.toLowerCase() === actual.toLowerCase(),
  }))
}

export async function deployPoolAndVerify(
  signer: Signer,
  factoryAddress: string,
  parameters: PoolDeploymentParameters,
): Promise<DeploymentVerification> {
  const errors = validateDeploymentParameters(parameters)
  if (errors.length) throw new Error(errors.join(' '))
  const factory = new Contract(factoryAddress, factoryAbi, signer)
  const args = buildDeployArguments(parameters)
  const gasEstimate = await factory.estimateGas.deployPool(...args).catch(() => undefined)
  const transaction = await factory.deployPool(...args, gasEstimate ? { gasLimit: gasEstimate.mul(120).div(100) } : {})
  const receipt = await transaction.wait()
  if (!receipt || receipt.status !== 1) throw new Error('Factory deployment transaction failed.')
  const address = parseNewSmartChefAddress(receipt, factoryAddress)
  const provider = signer.provider
  if (!provider) throw new Error('The connected wallet did not expose an ethers provider for verification.')
  const pool = await introspectPool(provider, address, factoryAddress)
  if (!pool) throw new Error('New pool was emitted but could not be introspected from the receipt.')
  const checks = compareDeploymentToPool(pool, parameters)
  return {
    deployed: true,
    address,
    transactionHash: receipt.transactionHash,
    blockNumber: receipt.blockNumber,
    checks,
    passed: checks.every((check) => check.ok),
  }
}

export async function fundPoolAndVerify(
  signer: Signer,
  poolAddress: string,
  rewardTokenAddress: string,
  amount: BigNumber,
): Promise<FundingVerification> {
  if (!isAddress(poolAddress) || !isAddress(rewardTokenAddress))
    throw new Error('Pool or reward token address is invalid.')
  if (amount.lte(0)) throw new Error('Funding amount must be greater than zero.')
  const provider = signer.provider
  if (!provider) throw new Error('The connected wallet did not expose an ethers provider for verification.')
  const rewardToken = new Contract(rewardTokenAddress, erc20Abi, signer)
  const readToken = new Contract(rewardTokenAddress, erc20Abi, provider)
  const beforeBalance = BigNumber.from(await readToken.balanceOf(poolAddress))
  const transaction = await rewardToken.transfer(poolAddress, amount)
  const receipt = await transaction.wait()
  if (!receipt || receipt.status !== 1) throw new Error('Funding transaction failed.')
  const afterBalance = BigNumber.from(await readToken.balanceOf(poolAddress))
  return {
    poolAddress: getAddress(poolAddress),
    rewardToken: getAddress(rewardTokenAddress),
    amount,
    beforeBalance,
    afterBalance,
    transactionHash: receipt.transactionHash,
    passed: afterBalance.gte(beforeBalance.add(amount)),
  }
}

export function mapPoolManagerError(error: any): string {
  const message =
    error?.data?.message ||
    error?.error?.message ||
    error?.reason ||
    error?.message ||
    'Transaction could not be completed.'
  if (/user denied|rejected/i.test(message)) return 'Wallet action was rejected.'
  if (/onlyowner|caller is not the owner|owner/i.test(message)) return 'Connected wallet is not the factory owner.'
  if (/insufficient funds/i.test(message)) return 'Wallet does not have enough native POL for gas.'
  return String(message)
}
