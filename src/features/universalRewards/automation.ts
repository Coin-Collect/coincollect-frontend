import {
  createWalletClient,
  defineChain,
  http,
  isAddressEqual,
  zeroAddress,
  type Address,
  type Hex,
  type WalletClient,
} from 'viem'
import { rewardSwapAbi, universalRewardsAbi } from './abi'
import { quoteV3Route, readV3RouteOptions, v3SwapLegs } from './routes'
import { readV3ClaimPeriod, validateV3Deployment, type V3Client, type V3Deployment } from './runtime'
import { readV3Treasury } from './studio'
import { withV3GasHeadroom } from './transactions'

const ZERO = BigInt(0)
const MAX_PURCHASE_FEE = BigInt('250000000000000000')
export const V3_AUTOMATION_WINDOW = 4

export interface ReplenishmentJob {
  poolId: bigint
  token: Address
  epoch: number
  amount: bigint
  minimum: bigint
  deadline: bigint
  maxFee?: bigint
}

interface JobResult {
  poolId: string
  token?: Address
  epoch?: number
  action?: 'treasury-recovery' | 'budget-recovery' | 'observation'
  status: 'confirmed' | 'already-executed' | 'pending' | 'deferred' | 'failed'
  hash?: Hex
  reason?: string
  feeWei?: string
}

type JobWithContext = Omit<JobResult, 'status'>

export function pickV3Batch(total: bigint, tick: bigint) {
  if (total === ZERO) return []
  const size = total < BigInt(V3_AUTOMATION_WINDOW) ? Number(total) : V3_AUTOMATION_WINDOW
  const offset = tick % total
  return Array.from({ length: size }, (_, i) => ((offset + BigInt(i)) % total) + BigInt(1))
}

export function createLocalV3Executor(url: string) {
  const chain = defineChain({
    id: 31337,
    name: 'CoinCollect local test chain',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    rpcUrls: { default: { http: [url] } },
  })
  return createWalletClient({ chain, transport: http(url, { retryCount: 0 }) })
}

export async function proveLocalExecutor(client: V3Client, executor: WalletClient, deployment: V3Deployment) {
  if (deployment.chainId !== 31337 || (await executor.getChainId()) !== 31337) {
    throw new Error('V3 automation requires isolated chain 31337.')
  }
  const [node] = await Promise.all([
    client.request({ method: 'anvil_nodeInfo' } as never),
    validateV3Deployment(client, deployment),
  ])
  if (typeof node !== 'object' || node === null || !('environment' in node))
    throw new Error('The local Anvil node could not be verified.')
}

export async function executeReplenishmentJob(
  client: V3Client,
  executor: WalletClient,
  deployment: V3Deployment,
  account: Address,
  job: ReplenishmentJob,
): Promise<JobResult> {
  const context: JobWithContext = { poolId: job.poolId.toString(), token: job.token, epoch: job.epoch }
  const ledger = { address: deployment.address, abi: universalRewardsAbi } as const
  const wasExecuted = async () => {
    const lane = await client.readContract({ ...ledger, functionName: 'fundingLane', args: [job.poolId, job.token] })
    return lane.purchased && lane.lastEpoch >= job.epoch
  }

  let hash: Hex | undefined
  try {
    if (await wasExecuted()) return { ...context, status: 'already-executed' }
    const [epoch, amount] = await client.readContract({
      ...ledger,
      functionName: 'nextReplenishment',
      args: [job.poolId, job.token],
    })
    if (epoch !== job.epoch || amount !== job.amount || amount === ZERO) {
      return { ...context, status: 'deferred', reason: 'The funding window or tranche changed.' }
    }
    const { request } = await client.simulateContract({
      ...ledger,
      functionName: 'replenish',
      args: [job.poolId, job.token, job.epoch, job.minimum, job.deadline],
      account,
    })
    const gas = withV3GasHeadroom(await client.estimateContractGas(request))
    if (job.maxFee !== undefined) {
      const gasPrice = await client.getGasPrice()
      if (gas * gasPrice > job.maxFee) {
        return { ...context, status: 'deferred', reason: 'Estimated POL fee exceeds the approved purchase limit.' }
      }
      hash = await executor.writeContract({
        ...ledger,
        functionName: 'replenish',
        args: request.args,
        account: executor.account ?? account,
        chain: executor.chain ?? null,
        gas,
        gasPrice,
      })
    } else {
      hash = await executor.writeContract({
        ...request,
        account: executor.account ?? account,
        chain: executor.chain ?? null,
        gas,
      })
    }
    const receipt = await client.waitForTransactionReceipt({ hash, timeout: 8_000 })
    const event = await client.getContractEvents({
      ...ledger,
      eventName: 'Replenished',
      args: { poolId: job.poolId, token: job.token, epoch: job.epoch },
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
      strict: true,
    })
    const matched = event.find((log) => log.transactionHash === hash)
    if (receipt.status === 'success' && matched)
      return {
        ...context,
        status: 'confirmed',
        hash,
        feeWei: receipt.gasUsed === undefined ? undefined : (receipt.gasUsed * receipt.effectiveGasPrice).toString(),
      }
    if (await wasExecuted()) return { ...context, status: 'already-executed', hash }
    return {
      ...context,
      status: 'failed',
      hash,
      reason: 'The submitted transaction did not replenish this allocation.',
    }
  } catch {
    if (await wasExecuted().catch(() => false)) return { ...context, status: 'already-executed', hash }
    if (hash) return { ...context, status: 'pending', hash }
    return { ...context, status: 'deferred', reason: 'Simulation or transaction submission needs another chain check.' }
  }
}

async function observeRouteIfDue(
  client: V3Client,
  executor: WalletClient,
  account: Address,
  swap: Address,
  input: Address,
  output: Address,
  timestamp: bigint,
) {
  const adapter = { address: swap, abi: rewardSwapAbi } as const
  const [route, paused] = await Promise.all([
    client.readContract({ ...adapter, functionName: 'routeState', args: [input, output] }),
    client.readContract({ ...adapter, functionName: 'paused' }),
  ])
  if (paused || isAddressEqual(route.pair, zeroAddress) || timestamp - route.sampleAt < BigInt(1800)) return undefined
  if (route.averagePrice > ZERO && timestamp - route.averageAt <= BigInt(7200)) return undefined
  const { request } = await client.simulateContract({
    ...adapter,
    functionName: 'observe',
    args: [input, output],
    account,
  })
  const gas = withV3GasHeadroom(await client.estimateContractGas(request))
  const gasPrice = await client.getGasPrice()
  if (gas * gasPrice > MAX_PURCHASE_FEE) return undefined
  const tx = await executor.writeContract({
    ...adapter,
    functionName: 'observe',
    args: request.args,
    account: executor.account ?? account,
    chain: executor.chain ?? null,
    gas,
    gasPrice,
  })
  const receipt = await client.waitForTransactionReceipt({ hash: tx, timeout: 5_000 }).catch(() => undefined)
  const status = !receipt
    ? 'pending'
    : receipt.status === 'success' && receipt.transactionHash === tx
    ? 'confirmed'
    : 'failed'
  return { status, hash: tx } as const
}

export async function executeTreasuryRecovery(
  client: V3Client,
  executor: WalletClient,
  deployment: V3Deployment,
  account: Address,
  poolId: bigint,
  token: Address,
): Promise<JobResult | undefined> {
  const context = { poolId: poolId.toString(), token, action: 'treasury-recovery' } as const
  const ledger = { address: deployment.address, abi: universalRewardsAbi } as const
  let hash: Hex | undefined
  try {
    const reward = await client.readContract({ ...ledger, functionName: 'rewardState', args: [poolId, token] })
    if (reward.inventory === ZERO) return undefined
    const { request, result } = await client.simulateContract({
      ...ledger,
      functionName: 'recoverExpiredRewards',
      args: [poolId, token],
      account,
    })
    if (result === ZERO) return { ...context, status: 'already-executed' }
    const gas = withV3GasHeadroom(await client.estimateContractGas(request))
    const gasPrice = await client.getGasPrice()
    if (gas * gasPrice > MAX_PURCHASE_FEE)
      return { ...context, status: 'deferred', reason: 'Recovery gas price is above policy.' }
    hash = await executor.writeContract({
      ...ledger,
      functionName: 'recoverExpiredRewards',
      args: request.args,
      account: executor.account ?? account,
      chain: executor.chain ?? null,
      gas,
      gasPrice,
    })
    const receipt = await client.waitForTransactionReceipt({ hash, timeout: 8_000 })
    if (receipt.status === 'success' && receipt.transactionHash === hash) {
      const logs = await client.getContractEvents({
        ...ledger,
        eventName: 'ExpiredRewardsRecovered',
        args: { poolId, token },
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
        strict: true,
      })
      if (logs.some((log) => log.transactionHash === hash))
        return {
          ...context,
          hash,
          status: 'confirmed',
          feeWei: receipt.gasUsed === undefined ? undefined : (receipt.gasUsed * receipt.effectiveGasPrice).toString(),
        }
      const remaining = await client.readContract({ ...ledger, functionName: 'rewardState', args: [poolId, token] })
      if (remaining.inventory === ZERO) return { ...context, hash, status: 'already-executed' }
    }
    return { ...context, hash, status: 'failed', reason: 'Treasury recovery was not confirmed.' }
  } catch {
    if (hash) return { ...context, hash, status: 'pending' }
    return { ...context, status: 'deferred', reason: 'This token could not be transferred to the treasury yet.' }
  }
}

async function executeBudgetRecovery(
  client: V3Client,
  executor: WalletClient,
  deployment: V3Deployment,
  account: Address,
  poolId: bigint,
): Promise<JobResult | undefined> {
  const context = { poolId: poolId.toString(), action: 'budget-recovery' } as const
  const ledger = { address: deployment.address, abi: universalRewardsAbi } as const
  let hash: Hex | undefined
  try {
    const plan = await client.readContract({ ...ledger, functionName: 'fundingState', args: [poolId] })
    if (plan.deposited === plan.spent + plan.recovered) return undefined
    const { request, result } = await client.simulateContract({
      ...ledger,
      functionName: 'recoverBudget',
      args: [poolId],
      account,
    })
    if (result === ZERO) return undefined
    const gas = withV3GasHeadroom(await client.estimateContractGas(request))
    const gasPrice = await client.getGasPrice()
    if (gas * gasPrice > MAX_PURCHASE_FEE)
      return { ...context, status: 'deferred', reason: 'Recovery gas price is above policy.' }
    hash = await executor.writeContract({
      ...ledger,
      functionName: 'recoverBudget',
      args: request.args,
      account: executor.account ?? account,
      chain: executor.chain ?? null,
      gas,
      gasPrice,
    })
    const receipt = await client.waitForTransactionReceipt({ hash, timeout: 8_000 })
    const events = await client.getContractEvents({
      ...ledger,
      eventName: 'BudgetRecovered',
      args: { poolId, asset: plan.asset },
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
      strict: true,
    })
    if (receipt.status === 'success' && events.some((event) => event.transactionHash === hash)) {
      return {
        ...context,
        token: plan.asset,
        hash,
        status: 'confirmed',
        feeWei: (receipt.gasUsed * receipt.effectiveGasPrice).toString(),
      }
    }
    const updated = await client.readContract({ ...ledger, functionName: 'fundingState', args: [poolId] })
    if (updated.deposited === updated.spent + updated.recovered) return { ...context, hash, status: 'already-executed' }
    return { ...context, hash, status: 'failed', reason: 'Budget recovery was not confirmed.' }
  } catch {
    return hash
      ? { ...context, hash, status: 'pending' }
      : { ...context, status: 'deferred', reason: 'Budget recovery could not be simulated.' }
  }
}

export async function runV3Automation(
  client: V3Client,
  executor: WalletClient,
  deployment: V3Deployment,
  tick: bigint,
  firstPoolId = BigInt(1),
  mode: 'isolated' | 'polygon' = 'isolated',
) {
  if (mode === 'isolated') await proveLocalExecutor(client, executor, deployment)
  else {
    if (
      deployment.chainId !== 137 ||
      (await executor.getChainId()) !== 137 ||
      !executor.account ||
      executor.account.type !== 'local'
    ) {
      throw new Error('A locally signing Polygon gas executor is required.')
    }
    await validateV3Deployment(client, deployment)
  }
  const accounts = await executor.getAddresses()
  const account = accounts.at(-1)
  if (!account) throw new Error('Anvil has no unlocked test executor.')
  const ledger = { address: deployment.address, abi: universalRewardsAbi } as const
  const [total, swap, period, snapshot, treasury, wrapped, admin, treasuryAuthority] = await Promise.all([
    client.readContract({ ...ledger, functionName: 'poolCount' }),
    client.readContract({ ...ledger, functionName: 'swapAdapter' }),
    readV3ClaimPeriod(client, deployment),
    client.getBlock(),
    readV3Treasury(client, deployment),
    client.readContract({ ...ledger, functionName: 'wrappedNative' }),
    client.readContract({ ...ledger, functionName: 'admin' }),
    client.readContract({ ...ledger, functionName: 'treasury' }),
  ])
  if (mode === 'polygon') {
    const [confirmedNonce, pendingNonce, balance] = await Promise.all([
      client.getTransactionCount({ address: account, blockTag: 'latest' }),
      client.getTransactionCount({ address: account, blockTag: 'pending' }),
      client.getBalance({ address: account }),
    ])
    if (pendingNonce > confirmedNonce) throw new Error('The gas executor has an unconfirmed transaction.')
    if (balance === ZERO) throw new Error('The gas executor needs POL for network fees.')
    if (!treasury || isAddressEqual(account, admin) || isAddressEqual(account, treasuryAuthority)) {
      throw new Error('The Polygon executor must be separate from operator and treasury roles.')
    }
    if (swap !== zeroAddress) {
      const routeAdmin = await client.readContract({ address: swap, abi: rewardSwapAbi, functionName: 'admin' })
      if (isAddressEqual(account, routeAdmin)) throw new Error('The Polygon executor cannot administer routes.')
    }
  }
  const results: JobResult[] = []
  const checkedRoutes = new Set<string>()
  const stopAt = Date.now() + 40_000
  let observationAttempts = 0
  let replenishmentJobs = 0
  if (firstPoolId > total) return results
  for (const offset of pickV3Batch(total - firstPoolId + BigInt(1), tick)) {
    if (Date.now() >= stopAt) return results
    const poolId = offset + firstPoolId - BigInt(1)
    try {
      const [config] = await client.readContract({
        ...ledger,
        blockNumber: snapshot.number,
        functionName: 'poolState',
        args: [poolId],
      })
      const [treasuryBacked] = treasury
        ? await client.readContract({ ...ledger, functionName: 'treasuryFunding', args: [poolId] })
        : [false]
      if (snapshot.timestamp >= config.end) {
        if (treasuryBacked) {
          const recovered = await executeBudgetRecovery(client, executor, deployment, account, poolId)
          if (recovered) results.push(recovered)
          if (recovered?.status === 'pending') return results
        }
        if (period !== undefined && snapshot.timestamp >= config.end + period) {
          const tokens = await client.readContract({ ...ledger, functionName: 'rewardsOf', args: [poolId] })
          for (const token of tokens) {
            if (Date.now() >= stopAt) return results
            const result = await executeTreasuryRecovery(client, executor, deployment, account, poolId, token)
            if (result) results.push(result)
            if (result?.status === 'pending') return results
          }
        }
        continue
      }
      if (replenishmentJobs >= V3_AUTOMATION_WINDOW) continue
      const [plan, tokens] = await Promise.all([
        client.readContract({ ...ledger, functionName: 'fundingState', args: [poolId] }),
        client.readContract({ ...ledger, functionName: 'rewardsOf', args: [poolId] }),
      ])
      if (isAddressEqual(plan.asset, zeroAddress) || plan.paused || plan.deposited === plan.spent + plan.recovered)
        continue
      for (const token of tokens) {
        if (Date.now() >= stopAt) return results
        if (replenishmentJobs >= V3_AUTOMATION_WINDOW) break
        let block = await client.getBlock()
        const currentTranche = () =>
          client.readContract({
            ...ledger,
            blockNumber: block.number,
            functionName: 'nextReplenishment',
            args: [poolId, token],
          })
        const [initialEpoch, initialAmount] = await currentTranche()
        if (initialAmount === ZERO) continue
        let observedBlockChanged = false
        const crossAsset = !isAddressEqual(plan.asset, token)
        if (swap !== zeroAddress && observationAttempts < 2) {
          const outputs = crossAsset ? [token] : []
          if (
            treasuryBacked &&
            wrapped !== zeroAddress &&
            !isAddressEqual(plan.asset, wrapped) &&
            !isAddressEqual(token, wrapped)
          ) {
            outputs.push(wrapped)
          }
          const observed = await Promise.all(
            outputs.map(async (output) => {
              const validQuote = await quoteV3Route(
                client,
                swap,
                plan.asset,
                output,
                initialAmount,
                block.number,
              ).catch(() => undefined)
              if (validQuote) return []
              const options = await readV3RouteOptions(client, swap, plan.asset, output, block.number)
              return options
                ? options.filter(({ enabled }) => enabled).flatMap((path) => v3SwapLegs(path, plan.asset, output))
                : [{ adapter: swap, input: plan.asset, output }]
            }),
          )
          for (const leg of observed.flat()) {
            if (observationAttempts >= 2) break
            const key = `${leg.adapter}:${leg.input}:${leg.output}`.toLowerCase()
            if (checkedRoutes.has(key)) continue
            checkedRoutes.add(key)
            const observation = await observeRouteIfDue(
              client,
              executor,
              account,
              leg.adapter,
              leg.input,
              leg.output,
              block.timestamp,
            ).catch(() => undefined)
            if (!observation) continue
            observationAttempts++
            if (observation.status === 'pending') {
              results.push({ poolId: poolId.toString(), token, action: 'observation', ...observation })
              return results
            }
            if (observation.status === 'confirmed') {
              block = await client.getBlock()
              observedBlockChanged = true
            }
          }
        }
        const [epoch, amount] = observedBlockChanged ? await currentTranche() : [initialEpoch, initialAmount]
        if (amount === ZERO) continue
        let minimum = amount
        let maxFee = treasuryBacked || mode === 'polygon' ? MAX_PURCHASE_FEE : undefined
        try {
          if (crossAsset) {
            minimum = (await quoteV3Route(client, swap, plan.asset, token, amount, block.number)).minimum
          }
          if (treasuryBacked) {
            const protectedPol = await quoteV3Route(client, swap, plan.asset, wrapped, amount, block.number).catch(
              (error: unknown) => {
                throw new Error(
                  `POL fee valuation unavailable · ${error instanceof Error ? error.message : 'unverified route'}`,
                )
              },
            )
            const fraction = protectedPol.minimum / BigInt(20)
            maxFee = fraction < MAX_PURCHASE_FEE ? fraction : MAX_PURCHASE_FEE
          }
        } catch (error) {
          replenishmentJobs++
          results.push({
            poolId: poolId.toString(),
            token,
            epoch,
            status: 'deferred',
            reason: error instanceof Error ? error.message : 'Route safety validation did not pass.',
          })
          continue
        }
        const job = { poolId, token, epoch, amount, minimum, deadline: block.timestamp + BigInt(90), maxFee }
        replenishmentJobs++
        const result = await executeReplenishmentJob(client, executor, deployment, account, job)
        results.push(result)
        if (result.status === 'pending') return results
      }
    } catch {
      results.push({
        poolId: poolId.toString(),
        status: 'deferred',
        reason: 'The pool funding state could not be checked.',
      })
    }
  }
  return results
}
