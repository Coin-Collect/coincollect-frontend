import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import { getAddress, isAddress } from '@ethersproject/address'
import type { Signer } from '@ethersproject/abstract-signer'
import type { Provider } from '@ethersproject/providers'
import erc20Abi from 'config/abi/erc20.json'
import nftFactoryAbi from 'config/abi/nftSmartChefFactory.json'
import { getNftSmartChefFactoryAddress } from 'utils/addressHelpers'
import { NftPoolDeploymentPlan } from '../types'
import { NftLaunchSchedule, LaunchCheck, NftPreflightResult, LaunchGasEstimate, LaunchTokenBalance } from './types'
import { MIN_PREFLIGHT_VALIDITY_BLOCKS, prepareNftLaunchSchedule } from './schedule'
import { simulateNftDeploy } from './transactions'

function check(
  key: string,
  label: string,
  status: LaunchCheck['status'],
  detail?: string,
  expected?: string,
  actual?: string,
): LaunchCheck {
  return { key, label, status, detail, expected, actual }
}

function addressOk(value?: string): boolean {
  if (!value || !isAddress(value)) return false
  return value !== '0x0000000000000000000000000000000000000000'
}

async function measureSecondsPerBlock(provider: Provider, currentBlock: number, fallback: number): Promise<number> {
  if (currentBlock < 4) return fallback
  try {
    const [older, newer] = await Promise.all([provider.getBlock(currentBlock - 4), provider.getBlock(currentBlock)])
    if (older?.timestamp && newer?.timestamp && newer.timestamp > older.timestamp)
      return (newer.timestamp - older.timestamp) / 4
  } catch {
    // A provider that cannot read the small timing sample is still usable with the plan estimate.
  }
  return fallback
}

function gasPriceFromFeeData(feeData: any): BigNumber {
  return BigNumber.from(feeData?.maxFeePerGas || feeData?.gasPrice || 0)
}

export async function runNftPoolPreflight(args: {
  provider: Provider
  signer: Signer
  plan: NftPoolDeploymentPlan
  account?: string | null
  walletChainId?: number
}): Promise<NftPreflightResult> {
  const { provider, signer, plan } = args
  const checks: LaunchCheck[] = []
  const tokenBalances: LaunchTokenBalance[] = []
  let chainId = 0
  let currentBlock = 0
  let account = args.account || ''
  const reportedAccount = args.account || ''
  let owner: string | undefined
  let ownerIsContract = false
  let nativeBalance = BigNumber.from(0)
  let schedule: NftLaunchSchedule = prepareNftLaunchSchedule(plan, 0, plan.scheduleIntent.measuredSecondsPerBlock)
  let deploymentGas: LaunchGasEstimate | undefined
  try {
    const network = await provider.getNetwork()
    chainId = args.walletChainId ?? network.chainId
    currentBlock = await provider.getBlockNumber()
    account = await signer.getAddress()
    checks.push(
      check(
        'wallet-account-sync',
        'Connected wallet account is current',
        !reportedAccount || reportedAccount.toLowerCase() === account.toLowerCase() ? 'PASS' : 'BLOCK',
        undefined,
        reportedAccount || account,
        account,
      ),
    )
    const secondsPerBlock = await measureSecondsPerBlock(
      provider,
      currentBlock,
      plan.scheduleIntent.measuredSecondsPerBlock,
    )
    schedule = prepareNftLaunchSchedule(plan, currentBlock, secondsPerBlock)
    checks.push(
      check(
        'chain',
        'Connected network is Polygon',
        chainId === 137 ? 'PASS' : 'BLOCK',
        undefined,
        '137',
        String(chainId),
      ),
    )
    checks.push(
      check(
        'plan-readiness',
        'Plan is ready for a launch preflight',
        plan.readiness.status === 'READY_FOR_DRY_RUN' ? 'PASS' : 'BLOCK',
        plan.readiness.blockers.join(' '),
      ),
    )
    checks.push(
      check(
        'schedule-order',
        'Start and end blocks are freshly prepared',
        currentBlock < schedule.startBlock && schedule.startBlock < schedule.endBlock ? 'PASS' : 'BLOCK',
        undefined,
        `${currentBlock} < start < end`,
        `${schedule.startBlock} < ${schedule.endBlock}`,
      ),
    )

    const expectedFactory = getNftSmartChefFactoryAddress(137)
    checks.push(
      check(
        'factory-address',
        'Frozen factory is the configured Polygon NFT factory',
        expectedFactory && expectedFactory.toLowerCase() === plan.factoryAddress.toLowerCase() ? 'PASS' : 'BLOCK',
        undefined,
        expectedFactory || 'configured factory',
        plan.factoryAddress,
      ),
    )
    checks.push(
      check('factory-address-format', 'Factory address is valid', addressOk(plan.factoryAddress) ? 'PASS' : 'BLOCK'),
    )
    const code = addressOk(plan.factoryAddress) ? await provider.getCode(plan.factoryAddress) : '0x'
    checks.push(check('factory-code', 'Factory contract code is available', code && code !== '0x' ? 'PASS' : 'BLOCK'))
    const factory = new Contract(plan.factoryAddress, nftFactoryAbi, provider)
    owner = await factory.owner()
    const ownerCode = await provider.getCode(owner!)
    ownerIsContract = ownerCode !== '0x' && ownerCode !== '0x0'
    checks.push(
      check(
        'factory-owner',
        'Factory owner is an EOA',
        ownerIsContract ? 'BLOCK' : 'PASS',
        ownerIsContract ? 'Contract-owned factories require their own execution path.' : undefined,
      ),
    )
    checks.push(
      check(
        'admin-account',
        'Connected wallet is the intended admin and factory owner',
        !ownerIsContract &&
          account.toLowerCase() === owner!.toLowerCase() &&
          account.toLowerCase() === plan.factoryParameters.intendedAdmin.toLowerCase()
          ? 'PASS'
          : 'BLOCK',
        undefined,
        owner,
        account,
      ),
    )

    const params = plan.factoryParameters
    const addressChecks = [
      ['staked-token', 'Staked NFT address', params.stakedTokenAddress],
      ['reward-token', 'Primary reward address', params.rewardTokenAddress],
      ['intended-admin', 'Intended admin address', params.intendedAdmin],
      ...params.sideRewardTokens.map(
        (address, index) =>
          [`side-token-${index}`, `Side reward ${index + 1} address`, address] as [string, string, string],
      ),
    ] as Array<[string, string, string]>
    addressChecks.forEach(([key, label, address]) =>
      checks.push(check(key, label, addressOk(address) ? 'PASS' : 'BLOCK')),
    )
    checks.push(
      check(
        'staked-reward-distinct',
        'Staked NFT and reward token are different',
        params.stakedTokenAddress.toLowerCase() !== params.rewardTokenAddress.toLowerCase() ? 'PASS' : 'BLOCK',
      ),
    )
    checks.push(
      check(
        'side-arrays',
        'Side reward tokens and percentages have equal length',
        params.sideRewardTokens.length === params.sideRewardPercentages.length ? 'PASS' : 'BLOCK',
      ),
    )
    checks.push(
      check(
        'weights',
        'Collection weights are present and valid',
        plan.collectionConfiguration.collectionWeights.length ===
          1 + plan.collectionConfiguration.communityCollections.length
          ? 'PASS'
          : 'BLOCK',
      ),
    )

    const tokenAddresses = [params.rewardTokenAddress, ...params.sideRewardTokens]
    await Promise.all(
      tokenAddresses.map(async (tokenAddress, index) => {
        const token = new Contract(tokenAddress, erc20Abi, provider)
        const [decimals, wallet] = await Promise.all([token.decimals(), token.balanceOf(account)])
        const required =
          index === 0
            ? BigNumber.from(plan.fundingRequirements.primary.maximumScheduledFunding)
            : BigNumber.from(plan.fundingRequirements.side[index - 1].maximumImpliedSideFunding)
        const balance = BigNumber.from(wallet)
        tokenBalances.push({
          tokenAddress: getAddress(tokenAddress),
          decimals: Number(decimals),
          walletBalance: balance.toString(),
          requiredBalance: required.toString(),
          sufficient: balance.gte(required),
        })
        checks.push(
          check(
            `token-balance-${index}`,
            `${index === 0 ? 'Primary' : 'Side'} reward wallet balance covers maximum funding`,
            balance.gte(required) ? 'PASS' : 'BLOCK',
            undefined,
            required.toString(),
            balance.toString(),
          ),
        )
        checks.push(
          check(
            `token-decimals-${index}`,
            `${index === 0 ? 'Primary' : 'Side'} reward decimals are below 30`,
            Number(decimals) < 30 ? 'PASS' : 'BLOCK',
          ),
        )
      }),
    )
    nativeBalance = await provider.getBalance(account)
    const feeData = await provider.getFeeData()
    const gas = await simulateNftDeploy(provider, plan.factoryAddress, plan, schedule, account)
    const gasPrice = gasPriceFromFeeData(feeData)
    const estimatedCost = gas.mul(gasPrice)
    const safetyCost = estimatedCost.mul(125).div(100)
    deploymentGas = {
      gasLimit: gas.toString(),
      gasPrice: gasPrice.toString(),
      estimatedCost: estimatedCost.toString(),
      safetyCost: safetyCost.toString(),
      currency: 'POL',
    }
    checks.push(
      check(
        'native-balance',
        'Native POL balance covers deployment gas with safety margin',
        nativeBalance.gte(safetyCost) ? 'PASS' : 'BLOCK',
        undefined,
        safetyCost.toString(),
        nativeBalance.toString(),
      ),
    )
    checks.push(check('deployment-simulation', 'Factory deployment simulation succeeds', 'PASS'))
  } catch (error: any) {
    checks.push(
      check(
        'preflight-runtime',
        'All preflight reads and deployment simulation succeed',
        'BLOCK',
        error?.message || 'Preflight failed.',
      ),
    )
    if (!schedule)
      schedule = prepareNftLaunchSchedule(plan, Math.max(0, currentBlock), plan.scheduleIntent.measuredSecondsPerBlock)
  }
  const ok = checks.every((item) => item.status !== 'BLOCK')
  const checkedAt = Date.now()
  return {
    ok,
    checkedAt,
    chainId,
    currentBlock,
    currentBlockAtPreflight: currentBlock,
    expiresAtBlock: currentBlock + MIN_PREFLIGHT_VALIDITY_BLOCKS,
    schedulePreparedAt: schedule.preparedAt,
    account,
    factoryOwner: owner,
    ownerIsContract,
    schedule,
    checks,
    deploymentGas,
    nativeBalance: nativeBalance.toString(),
    tokenBalances,
    error: ok ? undefined : checks.find((item) => item.status === 'BLOCK')?.detail || 'Preflight has blocking checks.',
  }
}
