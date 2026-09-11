import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import { getAddress, isAddress } from '@ethersproject/address'
import type { Provider } from '@ethersproject/providers'
import erc20Abi from 'config/abi/erc20.json'
import { NftPoolDeploymentPlan } from '../types'
import { NftLaunchSchedule, LaunchCheck, VerificationResult } from './types'
import { nftPoolAbi } from './abi'
import { expectedNftLaunchPoolFingerprint, readNftLaunchPoolFingerprint } from './fingerprint'

const passed = (key: string, label: string, expected?: string, actual?: string): LaunchCheck => ({
  key,
  label,
  status: 'PASS',
  expected,
  actual,
})
const failed = (key: string, label: string, expected?: string, actual?: string, detail?: string): LaunchCheck => ({
  key,
  label,
  status: 'BLOCK',
  expected,
  actual,
  detail,
})
const sameAddress = (left: any, right: string) => String(left).toLowerCase() === right.toLowerCase()
const sameNumber = (left: any, right: string) => BigNumber.from(left).eq(BigNumber.from(right))

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

function result(checks: LaunchCheck[], error?: string, fingerprint?: string): VerificationResult {
  return { passed: checks.every((item) => item.status !== 'BLOCK'), checkedAt: Date.now(), checks, error, fingerprint }
}

export async function verifyDeployedNftPool(
  provider: Provider,
  plan: NftPoolDeploymentPlan,
  schedule: NftLaunchSchedule,
  poolAddress: string,
): Promise<VerificationResult> {
  const checks: LaunchCheck[] = []
  if (!isAddress(poolAddress))
    return result([failed('pool-address', 'Emitted pool address is valid')], 'Pool address is invalid.')
  try {
    const code = await provider.getCode(poolAddress)
    checks.push(
      code !== '0x'
        ? passed('pool-code', 'Deployed pool has contract code')
        : failed('pool-code', 'Deployed pool has contract code'),
    )
    const pool = new Contract(poolAddress, nftPoolAbi, provider)
    const params = plan.factoryParameters
    const [
      factory,
      owner,
      staked,
      reward,
      sideTokens,
      sideActive,
      rewardPerBlock,
      start,
      end,
      poolLimit,
      limitBlocks,
      capacity,
      threshold,
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
    checks.push(
      sameAddress(factory, plan.factoryAddress)
        ? passed('factory', 'Pool points to the frozen factory', plan.factoryAddress, factory)
        : failed('factory', 'Pool points to the frozen factory', plan.factoryAddress, factory),
    )
    checks.push(
      sameAddress(owner, params.intendedAdmin)
        ? passed('owner', 'Pool owner is the intended admin', params.intendedAdmin, owner)
        : failed('owner', 'Pool owner is the intended admin', params.intendedAdmin, owner),
    )
    checks.push(
      sameAddress(staked, params.stakedTokenAddress)
        ? passed('staked-token', 'Staked NFT matches the plan', params.stakedTokenAddress, staked)
        : failed('staked-token', 'Staked NFT matches the plan', params.stakedTokenAddress, staked),
    )
    checks.push(
      sameAddress(reward, params.rewardTokenAddress)
        ? passed('reward-token', 'Primary reward matches the plan', params.rewardTokenAddress, reward)
        : failed('reward-token', 'Primary reward matches the plan', params.rewardTokenAddress, reward),
    )
    const expectedSide = params.sideRewardTokens.map(getAddress)
    checks.push(
      JSON.stringify(sideTokens.map(getAddress)) === JSON.stringify(expectedSide)
        ? passed('side-tokens', 'Side rewards match the plan')
        : failed('side-tokens', 'Side rewards match the plan', expectedSide.join(','), sideTokens.join(',')),
    )
    checks.push(
      Boolean(sideActive) === expectedSide.length > 0
        ? passed('side-active', 'Side reward activation matches the plan')
        : failed(
            'side-active',
            'Side reward activation matches the plan',
            String(expectedSide.length > 0),
            String(sideActive),
          ),
    )
    checks.push(
      sameNumber(rewardPerBlock, params.rewardPerBlock)
        ? passed('reward-per-block', 'Reward rate matches the plan', params.rewardPerBlock, String(rewardPerBlock))
        : failed('reward-per-block', 'Reward rate matches the plan', params.rewardPerBlock, String(rewardPerBlock)),
    )
    checks.push(
      sameNumber(start, String(schedule.startBlock))
        ? passed('start-block', 'Start block matches the final schedule', String(schedule.startBlock), String(start))
        : failed('start-block', 'Start block matches the final schedule', String(schedule.startBlock), String(start)),
    )
    checks.push(
      sameNumber(end, String(schedule.endBlock))
        ? passed('end-block', 'End block matches the final schedule', String(schedule.endBlock), String(end))
        : failed('end-block', 'End block matches the final schedule', String(schedule.endBlock), String(end)),
    )
    checks.push(
      sameNumber(poolLimit, params.poolLimitPerUser)
        ? passed('pool-limit', 'Pool limit matches the plan')
        : failed('pool-limit', 'Pool limit matches the plan', params.poolLimitPerUser, String(poolLimit)),
    )
    checks.push(
      sameNumber(limitBlocks, params.numberBlocksForUserLimit)
        ? passed('limit-window', 'User-limit window matches the plan')
        : failed(
            'limit-window',
            'User-limit window matches the plan',
            params.numberBlocksForUserLimit,
            String(limitBlocks),
          ),
    )
    checks.push(
      sameNumber(capacity, params.poolCapacity)
        ? passed('capacity', 'Initial pool capacity matches the plan')
        : failed('capacity', 'Initial pool capacity matches the plan', params.poolCapacity, String(capacity)),
    )
    checks.push(
      sameNumber(threshold, params.participantThreshold)
        ? passed('threshold', 'Participant threshold matches the plan')
        : failed('threshold', 'Participant threshold matches the plan', params.participantThreshold, String(threshold)),
    )
    for (let index = 0; index < expectedSide.length; index += 1) {
      const percentage = await pool.sideRewardPercentage(expectedSide[index])
      const expected = params.sideRewardPercentages[index]
      checks.push(
        sameNumber(percentage, expected)
          ? passed(`side-percentage-${index}`, `Side reward ${index + 1} percentage matches`)
          : failed(
              `side-percentage-${index}`,
              `Side reward ${index + 1} percentage matches`,
              expected,
              String(percentage),
            ),
      )
    }
    const actualFingerprint = await readNftLaunchPoolFingerprint(provider, poolAddress)
    const expectedFingerprint = expectedNftLaunchPoolFingerprint(plan, schedule)
    checks.push(
      actualFingerprint.fingerprint === expectedFingerprint
        ? passed(
            'pool-fingerprint',
            'Pool fingerprint matches the frozen launch',
            expectedFingerprint,
            actualFingerprint.fingerprint,
          )
        : failed(
            'pool-fingerprint',
            'Pool fingerprint matches the frozen launch',
            expectedFingerprint,
            actualFingerprint.fingerprint,
          ),
    )
    return result(checks, undefined, actualFingerprint.fingerprint)
  } catch (error: any) {
    checks.push(
      failed(
        'readback',
        'All deployed pool fields can be read',
        undefined,
        undefined,
        error?.message || 'Verification read failed.',
      ),
    )
  }
  return result(checks)
}

export async function verifyNftCollectionWeights(
  provider: Provider,
  plan: NftPoolDeploymentPlan,
  poolAddress: string,
): Promise<VerificationResult> {
  const checks: LaunchCheck[] = []
  try {
    const pool = new Contract(poolAddress, nftPoolAbi, provider)
    const config = plan.collectionConfiguration.setCollectionWeightsArguments
    const actualCommunity = await readIndexedArrayUntilRevert(pool, 'communityCollections')
    checks.push(
      JSON.stringify(actualCommunity.map(getAddress)) === JSON.stringify(config.communityNftAddresses.map(getAddress))
        ? passed('community-order', 'Community collection order matches')
        : failed(
            'community-order',
            'Community collection order matches',
            config.communityNftAddresses.join(','),
            actualCommunity.join(','),
          ),
    )
    for (let i = 0; i < config.communityNftAddresses.length; i += 1) {
      const actual = await pool.collectionWeights(config.communityNftAddresses[i])
      checks.push(
        sameNumber(actual, config.weights[i])
          ? passed(`community-weight-${i}`, `Community collection ${i + 1} weight matches`)
          : failed(
              `community-weight-${i}`,
              `Community collection ${i + 1} weight matches`,
              config.weights[i],
              String(actual),
            ),
      )
    }
    const primary = await pool.collectionWeights(plan.collectionConfiguration.primaryCollection)
    checks.push(
      sameNumber(primary, config.stakedTokenWeight)
        ? passed('primary-weight', 'Primary collection weight matches')
        : failed('primary-weight', 'Primary collection weight matches', config.stakedTokenWeight, String(primary)),
    )
  } catch (error: any) {
    checks.push(
      failed(
        'weights-readback',
        'Collection weights can be read',
        undefined,
        undefined,
        error?.message || 'Weight verification failed.',
      ),
    )
  }
  return result(checks)
}

export async function verifyNftPerformanceFee(
  provider: Provider,
  plan: NftPoolDeploymentPlan,
  poolAddress: string,
): Promise<VerificationResult> {
  if (!plan.postDeploy.performanceFee && !plan.postDeploy.feeTo)
    return result([
      {
        key: 'fee-skipped',
        label: 'No performance fee was requested',
        status: 'PASS',
        detail: 'Skipped by the frozen plan.',
      },
    ])
  const checks: LaunchCheck[] = []
  try {
    const pool = new Contract(poolAddress, nftPoolAbi, provider)
    const [feeTo, fee] = await Promise.all([pool.feeTo(), pool.performanceFee()])
    checks.push(
      sameAddress(feeTo, plan.postDeploy.feeTo || '')
        ? passed('fee-recipient', 'Performance fee recipient matches')
        : failed('fee-recipient', 'Performance fee recipient matches', plan.postDeploy.feeTo, feeTo),
    )
    checks.push(
      sameNumber(fee, plan.postDeploy.performanceFee || '0')
        ? passed('fee-amount', 'Performance fee amount matches')
        : failed('fee-amount', 'Performance fee amount matches', plan.postDeploy.performanceFee, String(fee)),
    )
  } catch (error: any) {
    checks.push(
      failed(
        'fee-readback',
        'Performance fee can be read',
        undefined,
        undefined,
        error?.message || 'Fee verification failed.',
      ),
    )
  }
  return result(checks)
}

export async function verifyNftFunding(
  provider: Provider,
  plan: NftPoolDeploymentPlan,
  poolAddress: string,
): Promise<VerificationResult> {
  const checks: LaunchCheck[] = []
  const requirements = [
    {
      token: plan.fundingRequirements.primary.tokenAddress,
      amount: plan.fundingRequirements.primary.maximumScheduledFunding,
      label: 'Primary reward funding',
    },
    ...plan.fundingRequirements.side.map((side) => ({
      token: side.tokenAddress,
      amount: side.maximumImpliedSideFunding,
      label: `Side reward ${side.tokenAddress} funding`,
    })),
  ]
  await Promise.all(
    requirements.map(async (requirement, index) => {
      try {
        const balance = BigNumber.from(await new Contract(requirement.token, erc20Abi, provider).balanceOf(poolAddress))
        checks.push(
          balance.gte(requirement.amount)
            ? passed(`funding-${index}`, requirement.label, requirement.amount, balance.toString())
            : failed(`funding-${index}`, requirement.label, requirement.amount, balance.toString()),
        )
      } catch (error: any) {
        checks.push(
          failed(
            `funding-${index}`,
            requirement.label,
            requirement.amount,
            undefined,
            error?.message || 'Funding read failed.',
          ),
        )
      }
    }),
  )
  return result(checks)
}

export async function verifyFinalNftLaunch(
  provider: Provider,
  plan: NftPoolDeploymentPlan,
  schedule: NftLaunchSchedule,
  poolAddress: string,
): Promise<VerificationResult> {
  const [deployment, weights, fee, funding, currentBlock] = await Promise.all([
    verifyDeployedNftPool(provider, plan, schedule, poolAddress),
    verifyNftCollectionWeights(provider, plan, poolAddress),
    verifyNftPerformanceFee(provider, plan, poolAddress),
    verifyNftFunding(provider, plan, poolAddress),
    provider.getBlockNumber(),
  ])
  const checks = [...deployment.checks, ...weights.checks, ...fee.checks, ...funding.checks]
  checks.push(
    currentBlock < schedule.startBlock
      ? passed(
          'start-not-reached',
          'Final setup completed before start block',
          String(schedule.startBlock),
          String(currentBlock),
        )
      : failed(
          'start-not-reached',
          'Final setup completed before start block',
          String(schedule.startBlock),
          String(currentBlock),
        ),
  )
  return result(checks)
}
