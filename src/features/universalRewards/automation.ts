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
import { validateV3Deployment, type V3Client, type V3Deployment } from './runtime'
import { withV3GasHeadroom } from './transactions'

const ZERO = BigInt(0)
export const V3_AUTOMATION_WINDOW = 4

export interface ReplenishmentJob {
  poolId: bigint
  token: Address
  epoch: number
  amount: bigint
  minimum: bigint
  deadline: bigint
}

interface JobResult {
  poolId: string
  token?: Address
  epoch?: number
  status: 'confirmed' | 'already-executed' | 'pending' | 'deferred' | 'failed'
  hash?: Hex
  reason?: string
}

type JobWithContext = Omit<JobResult, 'status'>

export function pickV3Batch(total: bigint, tick: bigint) {
  if (total === ZERO) return []
  const size = total < BigInt(V3_AUTOMATION_WINDOW) ? Number(total) : V3_AUTOMATION_WINDOW
  const offset = (tick * BigInt(size)) % total
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
    hash = await executor.writeContract({ ...request, chain: executor.chain ?? null, gas })
    const receipt = await client.waitForTransactionReceipt({ hash, timeout: 8_000, checkReplacement: false })
    const event = await client.getContractEvents({
      ...ledger,
      eventName: 'Replenished',
      args: { poolId: job.poolId, token: job.token, epoch: job.epoch },
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
      strict: true,
    })
    const matched = event.find((log) => log.transactionHash === hash)
    if (receipt.status === 'success' && matched) return { ...context, status: 'confirmed', hash }
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
  const route = await client.readContract({ ...adapter, functionName: 'routeState', args: [input, output] })
  if (isAddressEqual(route.pair, zeroAddress) || timestamp - route.sampleAt < BigInt(1800)) return false
  const { request } = await client.simulateContract({
    ...adapter,
    functionName: 'observe',
    args: [input, output],
    account,
  })
  const tx = await executor.writeContract({ ...request, chain: executor.chain ?? null })
  const receipt = await client.waitForTransactionReceipt({ hash: tx, timeout: 5_000, checkReplacement: false })
  return receipt.status === 'success'
}

export async function runV3Automation(
  client: V3Client,
  executor: WalletClient,
  deployment: V3Deployment,
  tick: bigint,
  firstPoolId = BigInt(1),
) {
  await proveLocalExecutor(client, executor, deployment)
  const accounts = await executor.getAddresses()
  const account = accounts.at(-1)
  if (!account) throw new Error('Anvil has no unlocked test executor.')
  const ledger = { address: deployment.address, abi: universalRewardsAbi } as const
  const [total, swap] = await Promise.all([
    client.readContract({ ...ledger, functionName: 'poolCount' }),
    client.readContract({ ...ledger, functionName: 'swapAdapter' }),
  ])
  const results: JobResult[] = []
  const checkedRoutes = new Set<string>()
  let observationAttempts = 0
  if (firstPoolId > total) return results
  for (const offset of pickV3Batch(total - firstPoolId + BigInt(1), tick)) {
    const poolId = offset + firstPoolId - BigInt(1)
    try {
      const [plan, tokens] = await Promise.all([
        client.readContract({ ...ledger, functionName: 'fundingState', args: [poolId] }),
        client.readContract({ ...ledger, functionName: 'rewardsOf', args: [poolId] }),
      ])
      if (isAddressEqual(plan.asset, zeroAddress) || plan.paused || plan.deposited === plan.spent + plan.recovered)
        continue
      for (const token of tokens) {
        if (results.length >= V3_AUTOMATION_WINDOW) return results
        let block = await client.getBlock()
        const crossAsset = !isAddressEqual(plan.asset, token)
        const routeKey = `${plan.asset}:${token}`.toLowerCase()
        if (
          crossAsset &&
          swap !== zeroAddress &&
          plan.deposited > plan.spent &&
          observationAttempts < 2 &&
          !checkedRoutes.has(routeKey)
        ) {
          checkedRoutes.add(routeKey)
          observationAttempts++
          if (
            await observeRouteIfDue(client, executor, account, swap, plan.asset, token, block.timestamp).catch(
              () => false,
            )
          ) {
            block = await client.getBlock()
          }
        }
        const input = { ...ledger, blockNumber: block.number }
        const [epoch, amount] = await client.readContract({
          ...input,
          functionName: 'nextReplenishment',
          args: [poolId, token],
        })
        if (amount === ZERO) continue
        let minimum = amount
        if (crossAsset) {
          try {
            const quote = await client.readContract({
              address: swap,
              abi: rewardSwapAbi,
              functionName: 'preview',
              args: [plan.asset, token, amount, ZERO],
              blockNumber: block.number,
            })
            minimum = quote[1]
          } catch {
            results.push({
              poolId: poolId.toString(),
              token,
              epoch,
              status: 'deferred',
              reason: 'Route safety validation did not pass.',
            })
            continue
          }
        }
        const job = { poolId, token, epoch, amount, minimum, deadline: block.timestamp + BigInt(90) }
        results.push(await executeReplenishmentJob(client, executor, deployment, account, job))
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
