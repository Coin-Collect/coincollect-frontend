import { Contract } from '@ethersproject/contracts'
import type { Block, Log, Provider } from '@ethersproject/providers'
import { BigNumber } from '@ethersproject/bignumber'
import { getAddress } from '@ethersproject/address'
import factoryAbi from 'config/abi/smartChefFactoryV2.json'
import smartChefAbi from 'config/abi/coinStakeSmartChefV2.json'
import erc20Abi from 'config/abi/erc20.json'
import poolsConfig from 'config/constants/pools'
import { mainnetTokens } from 'config/constants/tokens'
import { getSmartChefFactoryAddress, getSmartChefFactoryDeploymentBlock } from 'utils/addressHelpers'
import { getFactoryAuthority } from './authority'
import {
  FACTORY_LOG_SCAN_CHUNK,
  MAX_RPC_DISCOVERY_BLOCKS,
  POOL_MANAGER_CHAIN_ID,
  POOL_MANAGER_INDEXER_URL,
  POOL_MANAGER_INDEXER_TIMEOUT_MS,
  POOL_REGISTRY_CACHE_TTL,
  POLYGON_FALLBACK_SECONDS_PER_BLOCK,
} from './constants'
import { canonicalPoolId, getPoolStatus, median } from './calculations'
import { NormalizedPool, PoolRegistryResult, PoolSource, PoolTokenMetadata } from './types'

interface DiscoveryEvent {
  address: string
  blockNumber?: number
  transactionHash?: string
}

interface PoolReadContext {
  source?: PoolSource
  legacySousId?: number
  discoveredAtBlock?: number
  deploymentTransactionHash?: string
}

const emptyNumber = 0
const emptyBigNumber = BigNumber.from(0)
const factoryInterface = new Contract('0x0000000000000000000000000000000000000001', factoryAbi).interface
const newPoolTopic = factoryInterface.getEventTopic('NewSmartChefContract')
let registryCache: { cachedAt: number; value: PoolRegistryResult } | null = null

const normalizeAddress = (address: string) => {
  try {
    return getAddress(address)
  } catch {
    return address
  }
}

const readOptional = async <T>(
  contract: Contract,
  method: string,
  args: unknown[] = [],
  fallback?: T,
): Promise<T | undefined> => {
  try {
    return (await contract.callStatic[method](...args)) as T
  } catch {
    return fallback
  }
}

const knownTokenByAddress = new Map<string, PoolTokenMetadata>()

Object.values(mainnetTokens).forEach((token: any) => {
  if (token && token.address && token.chainId === POOL_MANAGER_CHAIN_ID) {
    knownTokenByAddress.set(token.address.toLowerCase(), {
      address: normalizeAddress(token.address),
      chainId: POOL_MANAGER_CHAIN_ID,
      decimals: token.decimals,
      symbol: token.symbol || 'TOKEN',
      name: token.name || token.symbol || 'Token',
      projectLink: token.projectLink,
      isConfigured: true,
    })
  }
})

const tokenMetadata = async (provider: Provider, address: string): Promise<PoolTokenMetadata> => {
  const normalized = normalizeAddress(address)
  const configured = knownTokenByAddress.get(normalized.toLowerCase())
  if (configured) return configured

  const token = new Contract(normalized, erc20Abi, provider)
  const [decimals, symbol, name] = await Promise.all([
    readOptional<number>(token, 'decimals'),
    readOptional<string>(token, 'symbol'),
    readOptional<string>(token, 'name'),
  ])

  return {
    address: normalized,
    chainId: POOL_MANAGER_CHAIN_ID,
    decimals: decimals === undefined ? 18 : Number(decimals),
    symbol: symbol || 'UNKNOWN',
    name: name || symbol || 'Unknown token',
    isConfigured: false,
  }
}

const configuredLegacyAddress = (sousId: number) => {
  const pool = poolsConfig.find((item) => item.sousId === sousId)
  return pool?.contractAddress?.[POOL_MANAGER_CHAIN_ID]
}

const legacySousIdByAddress = new Map<string, number>()
poolsConfig.forEach((pool) => {
  const address = configuredLegacyAddress(pool.sousId)
  if (address && pool.sousId > 0) legacySousIdByAddress.set(address.toLowerCase(), pool.sousId)
})

function valueAsNumber(value: any): number {
  return Number(value?.toString?.() || value || 0)
}

export async function introspectPool(
  provider: Provider,
  address: string,
  factoryAddress = getSmartChefFactoryAddress(POOL_MANAGER_CHAIN_ID),
  context: PoolReadContext = {},
): Promise<NormalizedPool | null> {
  if (!factoryAddress) return null

  try {
    const poolAddress = normalizeAddress(address)
    const pool = new Contract(poolAddress, smartChefAbi, provider)
    const [
      owner,
      actualFactory,
      stakedTokenAddress,
      rewardTokenAddress,
      rewardPerBlock,
      startBlock,
      bonusEndBlock,
      poolLimitPerUser,
      numberBlocksForUserLimit,
      participantThreshold,
      userLimit,
      hasUserLimit,
    ] = await Promise.all([
      pool.owner(),
      pool.SMART_CHEF_FACTORY(),
      pool.stakedToken(),
      pool.rewardToken(),
      pool.rewardPerBlock(),
      pool.startBlock(),
      pool.bonusEndBlock(),
      pool.poolLimitPerUser(),
      pool.numberBlocksForUserLimit(),
      pool.participantThreshold(),
      readOptional<boolean>(pool, 'userLimit', [], false),
      readOptional<boolean>(pool, 'hasUserLimit', [], false),
    ])

    if (actualFactory.toLowerCase() !== factoryAddress.toLowerCase()) return null

    const [stakingToken, rewardToken, totalStaked, rewardBalance] = await Promise.all([
      tokenMetadata(provider, stakedTokenAddress),
      tokenMetadata(provider, rewardTokenAddress),
      readOptional<BigNumber>(
        new Contract(stakedTokenAddress, erc20Abi, provider),
        'balanceOf',
        [poolAddress],
        emptyBigNumber,
      ),
      readOptional<BigNumber>(
        new Contract(rewardTokenAddress, erc20Abi, provider),
        'balanceOf',
        [poolAddress],
        emptyBigNumber,
      ),
    ])
    const start = valueAsNumber(startBlock)
    const end = valueAsNumber(bonusEndBlock)
    const legacySousId = context.legacySousId || legacySousIdByAddress.get(poolAddress.toLowerCase())

    return {
      chainId: POOL_MANAGER_CHAIN_ID,
      address: poolAddress,
      canonicalId: canonicalPoolId(POOL_MANAGER_CHAIN_ID, poolAddress),
      logicalPeriodId: `${POOL_MANAGER_CHAIN_ID}:${stakingToken.address.toLowerCase()}:${rewardToken.address.toLowerCase()}:${start}:${end}`,
      source: context.source || (legacySousId ? 'legacy' : 'factory'),
      legacySousId,
      smartChefFactory: normalizeAddress(actualFactory),
      owner: normalizeAddress(owner),
      stakingToken,
      rewardToken,
      rewardPerBlock: BigNumber.from(rewardPerBlock),
      startBlock: start,
      bonusEndBlock: end,
      poolLimitPerUser: BigNumber.from(poolLimitPerUser),
      numberBlocksForUserLimit: valueAsNumber(numberBlocksForUserLimit),
      participantThreshold: BigNumber.from(participantThreshold),
      userLimit: Boolean(userLimit),
      hasUserLimit: Boolean(hasUserLimit),
      totalStaked: BigNumber.from(totalStaked || emptyBigNumber),
      rewardBalance: BigNumber.from(rewardBalance || emptyBigNumber),
      status: getPoolStatus(0, start, end),
      discoveredAtBlock: context.discoveredAtBlock,
      deploymentTransactionHash: context.deploymentTransactionHash,
    }
  } catch (error) {
    return null
  }
}

export async function discoverFactoryPoolAddresses(
  provider: Provider,
  factoryAddress = getSmartChefFactoryAddress(POOL_MANAGER_CHAIN_ID),
  fromBlock = getSmartChefFactoryDeploymentBlock(POOL_MANAGER_CHAIN_ID),
  toBlock?: number,
): Promise<{ events: DiscoveryEvent[]; warning?: string }> {
  if (!factoryAddress || fromBlock === null) return { events: [], warning: 'Factory discovery is not configured.' }
  const latest = toBlock === undefined ? await provider.getBlockNumber() : toBlock
  const events = new Map<string, DiscoveryEvent>()
  let indexerError = ''

  // The indexer is the fast path for historical factory events. A full RPC
  // scan from deployment to head would be thousands of bounded requests.
  try {
    let nextPageParams: Record<string, string> | undefined
    do {
      const query = nextPageParams
        ? `?${new URLSearchParams(Object.entries(nextPageParams).map(([key, value]) => [key, String(value)]))}`
        : ''
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), POOL_MANAGER_INDEXER_TIMEOUT_MS)
      const response = await fetch(`${POOL_MANAGER_INDEXER_URL}/addresses/${factoryAddress}/logs${query}`, {
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!response.ok) throw new Error(`Indexer returned HTTP ${response.status}`)
      const payload: any = await response.json()
      ;(payload.items || []).forEach((item: any) => {
        if (item.event_type && item.event_type !== 'event') return
        const decoded = item.decoded?.parameters?.find((parameter: any) => parameter.name === 'smartChef')
        const address = decoded?.value || (item.topics?.[1] ? `0x${item.topics[1].slice(-40)}` : '')
        if (address)
          events.set(address.toLowerCase(), {
            address: normalizeAddress(address),
            blockNumber: Number(item.block_number || item.blockNumber || 0) || undefined,
            transactionHash: item.transaction_hash || item.transactionHash,
          })
      })
      nextPageParams = payload.next_page_params || undefined
    } while (nextPageParams)
    if (events.size > 0) return { events: Array.from(events.values()) }
    indexerError = 'Indexer returned no NewSmartChefContract events.'
  } catch (error) {
    indexerError = error instanceof Error ? error.message : 'Indexer discovery failed.'
  }

  try {
    const scanFrom = Math.max(fromBlock, latest - MAX_RPC_DISCOVERY_BLOCKS + 1)
    for (let start = scanFrom; start <= latest; start += FACTORY_LOG_SCAN_CHUNK) {
      const end = Math.min(start + FACTORY_LOG_SCAN_CHUNK - 1, latest)
      const logs = await provider.getLogs({
        address: factoryAddress,
        topics: [newPoolTopic],
        fromBlock: start,
        toBlock: end,
      })
      logs.forEach((log: Log) => {
        const address = log.topics[1] ? `0x${log.topics[1].slice(-40)}` : ''
        if (address)
          events.set(address.toLowerCase(), {
            address: normalizeAddress(address),
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
          })
      })
    }
    return {
      events: Array.from(events.values()),
      warning:
        scanFrom > fromBlock
          ? `Historical indexer unavailable; RPC fallback scanned the latest ${MAX_RPC_DISCOVERY_BLOCKS.toLocaleString()} blocks. ${indexerError}`
          : undefined,
    }
  } catch (error) {
    return {
      events: Array.from(events.values()),
      warning: `Pool discovery partially unavailable. RPC: ${
        error instanceof Error ? error.message : 'unknown error'
      } Indexer: ${indexerError}`,
    }
  }
}

async function sampleBlockTime(
  provider: Provider,
  currentBlock: number,
): Promise<{ secondsPerBlock: number; source: 'measured' | 'fallback' }> {
  try {
    const offsets = [0, 3, 6, 9, 12]
    const blocks = await Promise.all(offsets.map((offset) => provider.getBlock(Math.max(0, currentBlock - offset))))
    const rates: number[] = []
    for (let index = 1; index < blocks.length; index += 1) {
      const newer = blocks[index - 1]
      const older = blocks[index]
      const blockDelta = newer.number - older.number
      if (blockDelta > 0 && newer.timestamp > older.timestamp)
        rates.push((newer.timestamp - older.timestamp) / blockDelta)
    }
    const measured = median(rates)
    return measured > 0
      ? { secondsPerBlock: measured, source: 'measured' }
      : { secondsPerBlock: POLYGON_FALLBACK_SECONDS_PER_BLOCK, source: 'fallback' }
  } catch {
    return { secondsPerBlock: POLYGON_FALLBACK_SECONDS_PER_BLOCK, source: 'fallback' }
  }
}

const legacyPoolAddresses = () =>
  Array.from(legacySousIdByAddress.entries()).map(([address, legacySousId]) => ({ address, legacySousId }))

export async function getUnifiedPoolRegistry(
  provider: Provider,
  account?: string | null,
  forceRefresh = false,
): Promise<PoolRegistryResult> {
  if (!forceRefresh && registryCache && Date.now() - registryCache.cachedAt < POOL_REGISTRY_CACHE_TTL)
    return registryCache.value

  const factoryAddress = getSmartChefFactoryAddress(POOL_MANAGER_CHAIN_ID)
  const currentBlock = await provider.getBlockNumber()
  const currentBlockData: Block = await provider.getBlock(currentBlock)
  const blockTime = await sampleBlockTime(provider, currentBlock)
  const authority = await getFactoryAuthority(provider, account, POOL_MANAGER_CHAIN_ID)
  const discovery = await discoverFactoryPoolAddresses(provider, factoryAddress || undefined, undefined, currentBlock)
  const discovered = new Map<string, DiscoveryEvent>()
  discovery.events.forEach((event) => discovered.set(event.address.toLowerCase(), event))
  legacyPoolAddresses().forEach(({ address, legacySousId }) => {
    if (!discovered.has(address))
      discovered.set(address, {
        address,
        blockNumber: poolsConfig.find((pool) => pool.sousId === legacySousId)?.deployedBlockNumber,
      })
  })

  const pools = (
    await Promise.all(
      Array.from(discovered.values()).map(async (event) => {
        const legacySousId = legacySousIdByAddress.get(event.address.toLowerCase())
        return introspectPool(provider, event.address, factoryAddress || undefined, {
          source: legacySousId ? 'legacy' : 'factory',
          legacySousId,
          discoveredAtBlock: event.blockNumber,
          deploymentTransactionHash: event.transactionHash,
        })
      }),
    )
  ).filter(Boolean) as NormalizedPool[]

  const withStatus = pools.map((pool) => ({
    ...pool,
    status: getPoolStatus(currentBlock, pool.startBlock, pool.bonusEndBlock),
  }))
  const value: PoolRegistryResult = {
    pools: withStatus.sort((left, right) => (left.legacySousId || 999999) - (right.legacySousId || 999999)),
    currentBlock,
    currentTimestamp: currentBlockData?.timestamp,
    secondsPerBlock: blockTime.secondsPerBlock,
    blockTimeSource: blockTime.source,
    factoryAddress: factoryAddress || '',
    factoryOwner: authority.ownerAddress,
    discoveryWarning: discovery.warning,
  }

  // Keep BigNumber instances intact in memory. JSON persistence would turn
  // ethers BigNumbers into plain objects that cannot be formatted later.
  registryCache = { cachedAt: Date.now(), value }
  return value
}
