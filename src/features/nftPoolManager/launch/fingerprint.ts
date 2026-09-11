import { keccak256 } from '@ethersproject/keccak256'
import { Contract } from '@ethersproject/contracts'
import { getAddress, isAddress } from '@ethersproject/address'
import { toUtf8Bytes } from '@ethersproject/strings'
import type { Provider } from '@ethersproject/providers'
import nftFactoryAbi from 'config/abi/nftSmartChefFactory.json'
import { NftPoolDeploymentPlan } from '../types'
import { isLaunchScheduleValid } from './schedule'
import {
  NftLaunchPoolSnapshot,
  NftLaunchSchedule,
  LaunchCheck,
  NftPoolLaunchSession,
  VerificationResult,
} from './types'
import { nftPoolAbi } from './abi'

export interface NftLaunchPoolFingerprintData {
  factoryAddress: string
  owner: string
  stakedToken: string
  rewardToken: string
  sideRewardTokens: string[]
  sideRewardPercentages: string[]
  sideRewardActive: boolean
  rewardPerBlock: string
  startBlock: number
  endBlock: number
  poolLimitPerUser: string
  numberBlocksForUserLimit: number
  poolCapacity: string
  participantThreshold: string
}

function canonical(value: string): string {
  try {
    return getAddress(value).toLowerCase()
  } catch {
    return value.toLowerCase()
  }
}

function fingerprintParts(data: NftLaunchPoolFingerprintData): string[] {
  return [
    canonical(data.factoryAddress),
    canonical(data.owner),
    canonical(data.stakedToken),
    canonical(data.rewardToken),
    data.sideRewardTokens.map(canonical).join(','),
    data.sideRewardPercentages.join(','),
    String(data.sideRewardActive),
    data.rewardPerBlock,
    String(data.startBlock),
    String(data.endBlock),
    data.poolLimitPerUser,
    String(data.numberBlocksForUserLimit),
    data.poolCapacity,
    data.participantThreshold,
  ]
}

export function calculateNftLaunchPoolFingerprint(data: NftLaunchPoolFingerprintData): string {
  return keccak256(toUtf8Bytes(fingerprintParts(data).join('|')))
}

export function expectedNftLaunchPoolFingerprint(plan: NftPoolDeploymentPlan, schedule: NftLaunchSchedule): string {
  const params = plan.factoryParameters
  return calculateNftLaunchPoolFingerprint({
    factoryAddress: plan.factoryAddress,
    owner: params.intendedAdmin,
    stakedToken: params.stakedTokenAddress,
    rewardToken: params.rewardTokenAddress,
    sideRewardTokens: params.sideRewardTokens,
    sideRewardPercentages: params.sideRewardPercentages,
    sideRewardActive: params.sideRewardTokens.length > 0,
    rewardPerBlock: params.rewardPerBlock,
    startBlock: schedule.startBlock,
    endBlock: schedule.endBlock,
    poolLimitPerUser: params.poolLimitPerUser,
    numberBlocksForUserLimit: Number(params.numberBlocksForUserLimit),
    poolCapacity: params.poolCapacity,
    participantThreshold: params.participantThreshold,
  })
}

async function readIndexedArrayUntilRevert(pool: any, method: string, max = 64): Promise<string[]> {
  const values: string[] = []
  for (let index = 0; index < max; index += 1) {
    try {
      values.push(getAddress(await pool[method](index)))
    } catch {
      break
    }
  }
  return values
}

export async function readNftLaunchPoolFingerprint(
  provider: Provider,
  poolAddress: string,
): Promise<NftLaunchPoolSnapshot> {
  if (!isAddress(poolAddress)) throw new Error('Pool address is invalid.')
  const poolCode = await provider.getCode(poolAddress)
  if (!poolCode || poolCode === '0x') throw new Error('Target pool has no contract code.')
  const pool = new Contract(poolAddress, nftPoolAbi, provider)
  const [
    factoryAddress,
    owner,
    stakedToken,
    rewardToken,
    sideRewardTokens,
    sideRewardActive,
    rewardPerBlock,
    start,
    end,
    poolLimitPerUser,
    numberBlocksForUserLimit,
    poolCapacity,
    participantThreshold,
  ] = await Promise.all([
    pool.SMART_CHEF_FACTORY(),
    pool.owner(),
    pool.stakedToken(),
    pool.rewardToken(),
    readIndexedArrayUntilRevert(pool, 'sideRewardTokens'),
    pool.isSideRewardActive(),
    pool.rewardPerBlock(),
    pool.startBlock(),
    pool.bonusEndBlock(),
    pool.poolLimitPerUser(),
    pool.numberBlocksForUserLimit(),
    pool.poolCapacity(),
    pool.participantThreshold(),
  ])
  const sideRewardPercentages = await Promise.all(
    sideRewardTokens.map((token) => pool.sideRewardPercentage(token).then((value: any) => String(value))),
  )
  const data: NftLaunchPoolFingerprintData = {
    factoryAddress,
    owner,
    stakedToken,
    rewardToken,
    sideRewardTokens,
    sideRewardPercentages,
    sideRewardActive: Boolean(sideRewardActive),
    rewardPerBlock: String(rewardPerBlock),
    startBlock: Number(start),
    endBlock: Number(end),
    poolLimitPerUser: String(poolLimitPerUser),
    numberBlocksForUserLimit: Number(numberBlocksForUserLimit),
    poolCapacity: String(poolCapacity),
    participantThreshold: String(participantThreshold),
  }
  return {
    chainId: 137,
    currentBlock: 0,
    poolAddress: getAddress(poolAddress),
    poolCode,
    factoryAddress: getAddress(factoryAddress),
    owner: getAddress(owner),
    stakedToken: getAddress(stakedToken),
    rewardToken: getAddress(rewardToken),
    sideRewardTokens: sideRewardTokens.map(getAddress),
    sideRewardPercentages,
    sideRewardActive: Boolean(sideRewardActive),
    rewardPerBlock: data.rewardPerBlock,
    startBlock: data.startBlock,
    endBlock: data.endBlock,
    poolLimitPerUser: data.poolLimitPerUser,
    numberBlocksForUserLimit: data.numberBlocksForUserLimit,
    poolCapacity: data.poolCapacity,
    participantThreshold: data.participantThreshold,
    fingerprint: calculateNftLaunchPoolFingerprint(data),
  }
}

export async function readNftLaunchChainSnapshot(
  provider: Provider,
  session: NftPoolLaunchSession,
  account?: string,
): Promise<NftLaunchPoolSnapshot> {
  const snapshot: NftLaunchPoolSnapshot = { chainId: 0, currentBlock: 0, account }
  try {
    const [network, currentBlock, factoryCode] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber(),
      provider.getCode(session.factoryAddress),
    ])
    snapshot.chainId = network.chainId
    snapshot.currentBlock = currentBlock
    snapshot.factoryAddress = getAddress(session.factoryAddress)
    snapshot.factoryCode = factoryCode
    const factory = new Contract(session.factoryAddress, nftFactoryAbi, provider)
    snapshot.factoryOwner = getAddress(await factory.owner())
    if (session.poolAddress) {
      const pool = await readNftLaunchPoolFingerprint(provider, session.poolAddress)
      Object.assign(snapshot, { ...pool, chainId: network.chainId, currentBlock, account })
    }
    return snapshot
  } catch (error: any) {
    snapshot.readError = error?.message || 'Required chain reads are unavailable.'
    return snapshot
  }
}

export async function verifyLaunchPoolFingerprint(
  provider: Provider,
  plan: NftPoolDeploymentPlan,
  schedule: NftLaunchSchedule,
  poolAddress: string,
): Promise<VerificationResult> {
  const checks: LaunchCheck[] = []
  try {
    const actual = await readNftLaunchPoolFingerprint(provider, poolAddress)
    const expected = expectedNftLaunchPoolFingerprint(plan, schedule)
    checks.push({
      key: 'pool-code',
      label: 'Target pool has contract code',
      status: actual.poolCode && actual.poolCode !== '0x' ? 'PASS' : 'BLOCK',
    })
    checks.push({
      key: 'pool-fingerprint',
      label: 'Pool fingerprint matches the frozen launch',
      status: actual.fingerprint === expected ? 'PASS' : 'BLOCK',
      expected,
      actual: actual.fingerprint,
    })
    return {
      passed: checks.every((check) => check.status !== 'BLOCK'),
      checkedAt: Date.now(),
      checks,
      fingerprint: actual.fingerprint,
    }
  } catch (error: any) {
    checks.push({
      key: 'pool-fingerprint',
      label: 'Pool fingerprint can be read',
      status: 'BLOCK',
      detail: error?.message || 'Pool fingerprint read failed.',
    })
    return { passed: false, checkedAt: Date.now(), checks, error: error?.message || 'Pool fingerprint read failed.' }
  }
}

export function isFreshLaunchSchedule(schedule: NftLaunchSchedule, currentBlock: number): boolean {
  return isLaunchScheduleValid(schedule, currentBlock)
}
