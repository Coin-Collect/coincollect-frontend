import { Contract } from '@ethersproject/contracts'
import type { Block, Log, Provider } from '@ethersproject/providers'
import { BigNumber } from '@ethersproject/bignumber'
import nftFactoryAbi from 'config/abi/nftSmartChefFactory.json'
import nftStakeAbi from 'config/abi/smartNftStake.json'
import legacyNftStakeAbi from 'config/abi/coinCollectNftStake.json'
import erc20Abi from 'config/abi/erc20.json'
import erc721Abi from 'config/abi/erc721collection.json'
import { mainnetTokens } from 'config/constants/tokens'
import addresses from 'config/constants/contracts'
import nftFarmsConfig from 'config/constants/nftFarms'
import {
  getCoinCollectNftStakeAddress,
  getNftSmartChefFactoryAddress,
  getNftSmartChefFactoryDeploymentBlock,
} from 'utils/addressHelpers'
import { simplePolygonRpcProvider } from 'utils/providers'
import { POLYGON_BLOCK_TIME } from 'config'
import {
  configuredPoolCollections,
  deriveNftPoolStatus,
  ensureNftCollection,
  getConfiguredPoolAddress,
  getConfiguredRewardToken,
  getConfiguredSideRewards,
  getNftFarmConfig,
  legacyPoolAddress,
  normalizeNftAddress,
  normalizeNftCollectionRegistry,
  NFT_POOL_MANAGER_CHAIN_ID,
} from './registry'
import { readIndexedArrayUntilRevert } from './chainReads'
import { readDeploymentProvenance } from './provenance'
import {
  NftCollection,
  NftPool,
  NftPoolCollection,
  NftPoolHealth,
  NftPoolOnChainTruth,
  NftPoolRegistryResult,
  NftPoolSource,
  NftRewardAsset,
  NftTokenMetadata,
  NftPoolDeploymentProvenance,
  NftPoolSourceEconomics,
} from './types'

const NFT_FACTORY_INDEXER_URL = 'https://polygon.blockscout.com/api/v2'
const NFT_FACTORY_LOG_SCAN_CHUNK = 9_000
const NFT_FACTORY_MAX_RPC_DISCOVERY_BLOCKS = 2_000_000
const NFT_FACTORY_INDEXER_TIMEOUT_MS = 10_000
const NFT_POOL_REGISTRY_CACHE_TTL = 30_000
const NFT_FACTORY_DEPLOYMENT_FALLBACK = 45_594_882
const NFT_POOL_INTROSPECTION_CONCURRENCY = 6
const NFT_POOL_INTROSPECTION_TIMEOUT_MS = 15_000
const ZERO = BigNumber.from(0)

interface FactoryEvent {
  address: string
  blockNumber?: number
  transactionHash?: string
}

type FarmConfigLike = NonNullable<ReturnType<typeof getNftFarmConfig>>

const normalizeOrFallback = (address?: string | null): string => {
  if (!address) return ''
  return normalizeNftAddress(address) || address
}

const valueAsNumber = (value: any): number | undefined => {
  if (value === undefined || value === null) return undefined
  const number = Number(value.toString?.() || value)
  return Number.isFinite(number) ? number : undefined
}

const asBigNumber = (value: any): BigNumber | undefined => {
  try {
    return value === undefined || value === null ? undefined : BigNumber.from(value)
  } catch {
    return undefined
  }
}

async function readOptional<T>(
  contract: Contract,
  method: string,
  args: unknown[] = [],
  fallback?: T,
): Promise<T | undefined> {
  try {
    return (await contract.callStatic[method](...args)) as T
  } catch {
    return fallback
  }
}

const configuredTokenByAddress = new Map<string, NftTokenMetadata>()
Object.values(mainnetTokens).forEach((token: any) => {
  if (token?.chainId === NFT_POOL_MANAGER_CHAIN_ID && token.address) {
    const address = normalizeOrFallback(token.address)
    configuredTokenByAddress.set(address.toLowerCase(), {
      address,
      chainId: NFT_POOL_MANAGER_CHAIN_ID,
      decimals: token.decimals,
      symbol: token.symbol || 'UNKNOWN',
      name: token.name || token.symbol || 'Unknown token',
      isReadable: true,
    })
  }
})

async function readTokenMetadata(provider: Provider, address: string): Promise<NftTokenMetadata> {
  const normalized = normalizeOrFallback(address)
  const configured = configuredTokenByAddress.get(normalized.toLowerCase())
  const token = new Contract(normalized, erc20Abi, provider)
  const [decimals, symbol, name, totalSupply] = await Promise.all([
    readOptional<number>(token, 'decimals'),
    readOptional<string>(token, 'symbol'),
    readOptional<string>(token, 'name'),
    readOptional<BigNumber>(token, 'totalSupply'),
  ])
  return {
    address: normalized,
    chainId: NFT_POOL_MANAGER_CHAIN_ID,
    decimals: decimals === undefined ? configured?.decimals : Number(decimals),
    symbol: symbol || configured?.symbol || 'UNKNOWN',
    name: name || configured?.name || symbol || 'Unknown token',
    isReadable: decimals !== undefined || Boolean(symbol || name || configured),
    totalSupply: asBigNumber(totalSupply),
  }
}

async function readCollectionMetadata(provider: Provider, collection: NftCollection): Promise<NftCollection> {
  try {
    const contract = new Contract(collection.address, erc721Abi, provider)
    const [name, symbol] = await Promise.all([
      readOptional<string>(contract, 'name'),
      readOptional<string>(contract, 'symbol'),
    ])
    const readable = Boolean(name || symbol)
    return {
      ...collection,
      name: name || collection.name,
      symbol: symbol || collection.symbol,
      displayName: collection.displayName || name || collection.name,
      source: readable ? 'on-chain' : collection.source,
      verification: readable ? 'VERIFIED' : collection.verification,
    }
  } catch {
    return { ...collection, verification: 'UNREADABLE' }
  }
}

function updateCollectionRegistry(collections: NftCollection[], updated: NftCollection[]) {
  updated.forEach((collection) => {
    const index = collections.findIndex((candidate) => candidate.id === collection.id)
    if (index >= 0) collections[index] = collection
  })
}

function configuredSideRewardAsset(
  provider: Provider,
  address: string,
  poolAddress: string,
  configured?: { symbol?: string; percentage?: string },
  percentage?: BigNumber,
): Promise<NftRewardAsset> {
  const tokenContract = new Contract(address, erc20Abi, provider)
  return Promise.all([
    readTokenMetadata(provider, address),
    readOptional<BigNumber>(tokenContract, 'balanceOf', [poolAddress], ZERO),
  ]).then(([token, poolBalance]) => ({
    token,
    configuredSymbol: configured?.symbol,
    configuredPercentage: configured?.percentage,
    onChainPercentage: percentage,
    poolBalance: asBigNumber(poolBalance) || ZERO,
  }))
}

function mismatch(warnings: string[], message: string) {
  if (!warnings.includes(message)) warnings.push(message)
}

function healthFor(
  onChain: NftPoolOnChainTruth,
  warnings: string[],
  collectionReadable: boolean,
  rewardTokenReadable: boolean,
): NftPoolHealth {
  const healthWarnings = [...warnings]
  return {
    codeFound: onChain.codeFound,
    abiCompatible: onChain.abiCompatible,
    ownerReadable: Boolean(onChain.owner),
    rewardTokenReadable,
    collectionReadable,
    configurationMismatch: healthWarnings.some((warning) => warning.toLowerCase().includes('mismatch')),
    warnings: healthWarnings,
  }
}

function sourceEconomicsFor(
  onChain: NftPoolOnChainTruth,
  deployment: NftPoolDeploymentProvenance,
  sideRewards: NftRewardAsset[],
): NftPoolSourceEconomics {
  const decoded = deployment.decodedInputs
  return {
    originalRewardPerBlock: decoded?.rewardPerBlock || onChain.rewardPerBlock,
    originalStartBlock: decoded?.startBlock !== undefined ? decoded.startBlock : onChain.startBlock,
    originalEndBlock: decoded?.endBlock !== undefined ? decoded.endBlock : onChain.endBlock,
    originalDurationBlocks:
      decoded?.startBlock !== undefined && decoded?.endBlock !== undefined
        ? decoded.endBlock - decoded.startBlock
        : onChain.startBlock !== undefined && onChain.endBlock !== undefined
        ? onChain.endBlock - onChain.startBlock
        : undefined,
    originalSideRewardPercentages: decoded
      ? decoded.sideRewardTokens.map((tokenAddress, index) => ({
          tokenAddress,
          percentage: decoded.sideRewardPercentages[index],
        }))
      : sideRewards
          .filter((reward) => reward.onChainPercentage !== undefined)
          .map((reward) => ({ tokenAddress: reward.token.address, percentage: reward.onChainPercentage as BigNumber })),
    originalParticipantThreshold: decoded?.participantThreshold || onChain.participantThreshold,
    originalInitialPoolCapacity: decoded?.initialPoolCapacity,
    currentRemainingCapacity: onChain.currentRemainingPoolCapacity || onChain.poolCapacity,
    originalPoolLimitPerUser: decoded?.poolLimitPerUser || onChain.poolLimitPerUser,
    originalNumberBlocksForUserLimit:
      decoded?.numberBlocksForUserLimit !== undefined
        ? decoded.numberBlocksForUserLimit
        : onChain.numberBlocksForUserLimit,
    originalAdmin: decoded?.admin || onChain.owner,
  }
}

function unreadablePool(
  farm: FarmConfigLike | undefined,
  address: string,
  source: NftPoolSource,
  collections: NftCollection[],
  warning: string,
  deployment: NftPoolDeploymentProvenance = { decodeStatus: 'not-applicable' },
): NftPool {
  const configuredReward = getConfiguredRewardToken(farm as any)
  const primaryAddress = (farm && normalizeNftAddress((farm.nftAddresses as any)?.[NFT_POOL_MANAGER_CHAIN_ID])) || ''
  const primaryCollection = primaryAddress
    ? ensureNftCollection(collections, primaryAddress, NFT_POOL_MANAGER_CHAIN_ID, farm?.lpSymbol)
    : undefined
  const token: NftTokenMetadata = {
    address: normalizeOrFallback(configuredReward?.address),
    chainId: NFT_POOL_MANAGER_CHAIN_ID,
    decimals: configuredReward?.decimals,
    symbol: configuredReward?.symbol || 'UNKNOWN',
    name: configuredReward?.name || 'Unknown token',
    isReadable: false,
  }
  const onChain: NftPoolOnChainTruth = { codeFound: false, abiCompatible: false }
  const health = healthFor(onChain, [warning], false, false)
  return {
    id: address.toLowerCase(),
    canonicalId: `${NFT_POOL_MANAGER_CHAIN_ID}:${address.toLowerCase()}`,
    pid: farm?.pid || 0,
    chainId: NFT_POOL_MANAGER_CHAIN_ID,
    kind: 'POOL',
    address,
    protocolVersion: source === 'legacy-masterchef' ? 'LegacyNFTStake' : 'Unknown',
    source,
    metadata: {
      name: farm?.lpSymbol || 'Unlabelled NFT pool',
      banner: farm?.banner,
      avatar: farm?.avatar,
      projectUrl: farm?.projectLink?.mainLink,
      getNftUrl: farm?.projectLink?.getNftLink,
      isCommunity: farm?.isCommunity,
      configuredFinished: farm?.isFinished,
    },
    onChain,
    sourceEconomics: {
      originalSideRewardPercentages: [],
    },
    deployment,
    collections: primaryCollection
      ? [{ collection: primaryCollection, primary: true, weight: BigNumber.from(1), weightSource: 'default' }]
      : [],
    rewards: { primary: { token }, side: [] },
    status: 'UNKNOWN',
    statusSource: 'frontend-fallback',
    health,
    warnings: health.warnings,
    cloneSupport: 'UNAVAILABLE',
  }
}

async function readV2Pool(
  provider: Provider,
  address: string,
  farm: FarmConfigLike | undefined,
  source: NftPoolSource,
  collections: NftCollection[],
  currentBlock: number,
  deploymentHint?: FactoryEvent,
): Promise<NftPool> {
  const poolAddress = normalizeOrFallback(address)
  const deploymentHintValue: NftPoolDeploymentProvenance = {
    factoryAddress: getNftSmartChefFactoryAddress(NFT_POOL_MANAGER_CHAIN_ID) || undefined,
    transactionHash: deploymentHint?.transactionHash,
    blockNumber: deploymentHint?.blockNumber,
    decodeStatus: deploymentHint?.transactionHash ? 'unavailable' : 'not-applicable',
  }
  try {
    const code = await provider.getCode(poolAddress)
    if (!code || code === '0x')
      return unreadablePool(
        farm,
        poolAddress,
        source,
        collections,
        'No contract code was found at this address.',
        deploymentHintValue,
      )
    const pool = new Contract(poolAddress, nftStakeAbi, provider)
    const [
      owner,
      factoryAddress,
      stakingAddress,
      rewardAddress,
      rewardPerBlock,
      startBlock,
      endBlock,
      participantThreshold,
      poolCapacity,
      totalShares,
      poolLimitPerUser,
      numberBlocksForUserLimit,
      userLimit,
      sideRewardActive,
    ] = await Promise.all([
      pool.owner(),
      pool.SMART_CHEF_FACTORY(),
      pool.stakedToken(),
      pool.rewardToken(),
      pool.rewardPerBlock(),
      pool.startBlock(),
      pool.bonusEndBlock(),
      pool.participantThreshold(),
      pool.poolCapacity(),
      pool.totalShares(),
      readOptional<BigNumber>(pool, 'poolLimitPerUser'),
      readOptional<BigNumber>(pool, 'numberBlocksForUserLimit'),
      readOptional<boolean>(pool, 'userLimit', [], false),
      readOptional<boolean>(pool, 'isSideRewardActive', [], false),
    ])
    const normalizedStakingAddress = normalizeOrFallback(stakingAddress)
    const normalizedRewardAddress = normalizeOrFallback(rewardAddress)
    const configuredSideRewards = getConfiguredSideRewards(farm)
    const [communityAddressesResult, sideAddressesResult, deployment] = await Promise.all([
      readIndexedArrayUntilRevert<string>(pool, 'communityCollections', {
        hardCap: 32,
        timeoutMs: NFT_POOL_INTROSPECTION_TIMEOUT_MS,
      }),
      readIndexedArrayUntilRevert<string>(pool, 'sideRewardTokens', {
        hardCap: 32,
        timeoutMs: NFT_POOL_INTROSPECTION_TIMEOUT_MS,
      }),
      readDeploymentProvenance(
        provider,
        normalizeOrFallback(factoryAddress) || getNftSmartChefFactoryAddress(NFT_POOL_MANAGER_CHAIN_ID) || undefined,
        deploymentHint?.transactionHash,
        deploymentHint?.blockNumber,
      ),
    ])
    const sideAddresses = sideAddressesResult.values.map(normalizeOrFallback).filter(Boolean)
    const primaryCollection = ensureNftCollection(
      collections,
      normalizedStakingAddress,
      NFT_POOL_MANAGER_CHAIN_ID,
      'Primary NFT collection',
    )
    const communityAddresses = communityAddressesResult.values
      .map(normalizeOrFallback)
      .filter((candidate) => candidate && candidate.toLowerCase() !== normalizedStakingAddress.toLowerCase())
    const configuredPool = configuredPoolCollections(farm, collections)
    const configuredByCollection = new Map(
      configuredPool.map((entry) => [entry.collection.address.toLowerCase(), entry]),
    )
    const poolCollections: NftPoolCollection[] = [
      { collection: primaryCollection, primary: true, weight: BigNumber.from(1), weightSource: 'default' },
      ...communityAddresses.map((communityAddress) => {
        const configured = configuredByCollection.get(communityAddress.toLowerCase())
        return {
          collection: ensureNftCollection(
            collections,
            communityAddress,
            NFT_POOL_MANAGER_CHAIN_ID,
            configured?.collection.name || 'Community NFT collection',
          ),
          primary: false,
          weight: configured?.weight || BigNumber.from(1),
          weightSource: configured ? 'frontend-config' : 'default',
        } as NftPoolCollection
      }),
    ]
    const [stakingToken, rewardToken, rewardBalance, collectionMetadata] = await Promise.all([
      readCollectionMetadata(provider, primaryCollection),
      readTokenMetadata(provider, normalizedRewardAddress),
      readOptional<BigNumber>(
        new Contract(normalizedRewardAddress, erc20Abi, provider),
        'balanceOf',
        [poolAddress],
        ZERO,
      ),
      Promise.all(poolCollections.map(({ collection }) => readCollectionMetadata(provider, collection))),
    ])
    const updatedById = new Map(collectionMetadata.map((collection) => [collection.id, collection]))
    updateCollectionRegistry(collections, collectionMetadata)
    let resolvedPoolCollections = poolCollections.map((entry) => ({
      ...entry,
      collection: updatedById.get(entry.collection.id) || entry.collection,
    }))
    const weightResults = await Promise.all(
      resolvedPoolCollections.map((entry) =>
        readOptional<BigNumber>(pool, 'collectionWeights', [entry.collection.address]),
      ),
    )
    resolvedPoolCollections = resolvedPoolCollections.map((entry, index) => ({
      ...entry,
      weight: asBigNumber(weightResults[index]) || entry.weight,
      weightSource: weightResults[index] === undefined ? entry.weightSource : 'on-chain',
    }))
    const sidePercentages = await Promise.all(
      sideAddresses.map((sideAddress) => readOptional<BigNumber>(pool, 'sideRewardPercentage', [sideAddress])),
    )
    const configuredSideByAddress = new Map(
      configuredSideRewards.filter((item) => item.address).map((item) => [item.address.toLowerCase(), item]),
    )
    const sideRewards = await Promise.all(
      sideAddresses.map((sideAddress, index) =>
        configuredSideRewardAsset(
          provider,
          sideAddress,
          poolAddress,
          configuredSideByAddress.get(sideAddress.toLowerCase()),
          sidePercentages[index],
        ),
      ),
    )
    const warnings: string[] = []
    if (communityAddressesResult.stoppedBy === 'hard-cap')
      warnings.push('Community collection discovery reached its safety cap; review the pool manually.')
    if (sideAddressesResult.stoppedBy === 'hard-cap')
      warnings.push('Side reward discovery reached its safety cap; review the pool manually.')
    const configuredPrimary = normalizeNftAddress((farm?.nftAddresses as any)?.[NFT_POOL_MANAGER_CHAIN_ID])
    const configuredReward = getConfiguredRewardToken(farm as any)
    if (configuredPrimary && configuredPrimary.toLowerCase() !== normalizedStakingAddress.toLowerCase())
      mismatch(warnings, 'Primary NFT configuration mismatch with on-chain stakedToken.')
    if (configuredReward?.address && configuredReward.address.toLowerCase() !== normalizedRewardAddress.toLowerCase())
      mismatch(warnings, 'Primary reward configuration mismatch with on-chain rewardToken.')
    const configuredMainWeight = farm?.mainCollectionWeight
    if (
      configuredMainWeight !== undefined &&
      asBigNumber(configuredMainWeight)?.toString() !== resolvedPoolCollections[0].weight.toString()
    )
      mismatch(warnings, 'Primary collection weight mismatch with on-chain collectionWeights.')
    if (farm?.isFinished !== undefined && farm.isFinished !== Number(endBlock) <= currentBlock)
      mismatch(warnings, 'Frontend finished flag disagrees with on-chain block status.')
    const expectedSide = configuredSideRewards.map((side) => side.address.toLowerCase()).filter(Boolean)
    if (
      expectedSide.length &&
      expectedSide.some((expected) => !sideAddresses.some((actual) => actual.toLowerCase() === expected))
    )
      mismatch(warnings, 'Side reward configuration mismatch with on-chain sideRewardTokens.')
    if (farm && communityAddresses.length !== configuredPool.filter((entry) => !entry.primary).length)
      mismatch(warnings, 'Community collection configuration differs from the on-chain collection list.')
    const onChain: NftPoolOnChainTruth = {
      codeFound: true,
      abiCompatible: true,
      factoryAddress: normalizeOrFallback(factoryAddress),
      owner: normalizeOrFallback(owner),
      stakingTokenAddress: normalizedStakingAddress,
      rewardTokenAddress: normalizedRewardAddress,
      sideRewardActive: Boolean(sideRewardActive),
      startBlock: valueAsNumber(startBlock),
      endBlock: valueAsNumber(endBlock),
      rewardPerBlock: asBigNumber(rewardPerBlock),
      participantThreshold: asBigNumber(participantThreshold),
      poolCapacity: asBigNumber(poolCapacity),
      configuredInitialPoolCapacity: deployment.decodedInputs?.initialPoolCapacity,
      currentRemainingPoolCapacity: asBigNumber(poolCapacity),
      totalShares: asBigNumber(totalShares),
      poolLimitPerUser: asBigNumber(poolLimitPerUser),
      numberBlocksForUserLimit: valueAsNumber(numberBlocksForUserLimit),
      userLimit: Boolean(userLimit),
      rewardBalance: asBigNumber(rewardBalance) || ZERO,
      currentBlock,
    }
    const status = deriveNftPoolStatus(currentBlock, onChain.startBlock, onChain.endBlock)
    onChain.status = status
    const sourceEconomics = sourceEconomicsFor(onChain, deployment, sideRewards)
    const health = healthFor(
      onChain,
      warnings,
      poolCollections.every(({ collection }) => collection.verification !== 'UNREADABLE'),
      rewardToken.isReadable,
    )
    return {
      id: poolAddress.toLowerCase(),
      canonicalId: `${NFT_POOL_MANAGER_CHAIN_ID}:${poolAddress.toLowerCase()}`,
      pid: farm?.pid || 0,
      chainId: NFT_POOL_MANAGER_CHAIN_ID,
      kind: 'POOL',
      address: poolAddress,
      protocolVersion: 'NftStakeV2',
      source,
      metadata: {
        name: farm?.lpSymbol || stakingToken.displayName || stakingToken.name,
        banner: farm?.banner,
        avatar: farm?.avatar,
        projectUrl: farm?.projectLink?.mainLink,
        getNftUrl: farm?.projectLink?.getNftLink,
        isCommunity: farm?.isCommunity,
        configuredFinished: farm?.isFinished,
      },
      onChain,
      sourceEconomics,
      deployment,
      collections: resolvedPoolCollections,
      rewards: {
        primary: { token: rewardToken },
        side: sideRewards,
      },
      status,
      statusSource: 'on-chain',
      health,
      warnings: health.warnings,
      cloneSupport: health.abiCompatible && rewardToken.isReadable ? 'FULL' : 'PARTIAL',
    }
  } catch (error) {
    return unreadablePool(
      farm,
      poolAddress,
      source,
      collections,
      error instanceof Error ? `Pool introspection failed: ${error.message}` : 'Pool introspection failed.',
      deploymentHintValue,
    )
  }
}

async function readLegacyPool(
  provider: Provider,
  farm: FarmConfigLike,
  collections: NftCollection[],
  currentBlock: number,
): Promise<NftPool> {
  const address =
    legacyPoolAddress() || normalizeOrFallback((addresses.coinCollectNftStake as any)?.[NFT_POOL_MANAGER_CHAIN_ID])
  if (!address)
    return unreadablePool(
      farm,
      'legacy-masterchef',
      'legacy-masterchef',
      collections,
      'Legacy NFT MasterChef is not configured.',
    )
  try {
    const code = await provider.getCode(address)
    if (!code || code === '0x')
      return unreadablePool(
        farm,
        address,
        'legacy-masterchef',
        collections,
        'No legacy MasterChef code was found at this address.',
      )
    const masterChef = new Contract(address, legacyNftStakeAbi, provider)
    const [owner, rewardAddress, rewardPerBlock, startBlock, poolInfo] = await Promise.all([
      masterChef.owner(),
      masterChef.rewardToken(),
      masterChef.rewardPerBlock(),
      masterChef.startBlock(),
      masterChef.poolInfo(farm?.pid),
    ])
    const stakingAddress = normalizeOrFallback(poolInfo[1])
    const [rewardToken, collection] = await Promise.all([
      readTokenMetadata(provider, normalizeOrFallback(rewardAddress)),
      readCollectionMetadata(
        provider,
        ensureNftCollection(collections, stakingAddress, NFT_POOL_MANAGER_CHAIN_ID, farm?.lpSymbol),
      ),
    ])
    updateCollectionRegistry(collections, [collection])
    const stakedBalance = await readOptional<BigNumber>(
      new Contract(stakingAddress, erc721Abi, provider),
      'balanceOf',
      [address],
      ZERO,
    )
    const collectionEntry: NftPoolCollection = {
      collection,
      primary: true,
      weight: BigNumber.from(1),
      weightSource: 'default',
    }
    const warnings = [
      'Legacy MasterChef has no pool-specific bonusEndBlock; status uses the frontend finished flag.',
      'Legacy pool collection weights are not enumerable through this contract ABI.',
    ]
    const status: NftPool['status'] = farm?.isFinished
      ? 'FINISHED'
      : deriveNftPoolStatus(currentBlock, valueAsNumber(startBlock), undefined)
    const onChain: NftPoolOnChainTruth = {
      codeFound: true,
      abiCompatible: true,
      owner: normalizeOrFallback(owner),
      stakingTokenAddress: stakingAddress,
      rewardTokenAddress: normalizeOrFallback(rewardAddress),
      startBlock: valueAsNumber(startBlock),
      rewardPerBlock: asBigNumber(rewardPerBlock),
      poolCapacity: asBigNumber(poolInfo[5]),
      currentRemainingPoolCapacity: asBigNumber(poolInfo[5]),
      stakedBalance: asBigNumber(stakedBalance) || ZERO,
      rewardBalance: ZERO,
      currentBlock,
      status,
    }
    const health = healthFor(onChain, warnings, collection.verification !== 'UNREADABLE', rewardToken.isReadable)
    return {
      id: `legacy-${farm.pid}`,
      canonicalId: `${NFT_POOL_MANAGER_CHAIN_ID}:${address.toLowerCase()}:${farm.pid}`,
      pid: farm.pid,
      chainId: NFT_POOL_MANAGER_CHAIN_ID,
      kind: 'POOL',
      address,
      protocolVersion: 'LegacyNFTStake',
      source: 'legacy-masterchef',
      metadata: {
        name: farm.lpSymbol,
        banner: farm.banner,
        avatar: farm.avatar,
        projectUrl: farm.projectLink?.mainLink,
        getNftUrl: farm.projectLink?.getNftLink,
        isCommunity: farm.isCommunity,
        configuredFinished: farm.isFinished,
      },
      onChain,
      sourceEconomics: {
        originalRewardPerBlock: asBigNumber(rewardPerBlock),
        originalStartBlock: valueAsNumber(startBlock),
        originalSideRewardPercentages: [],
        currentRemainingCapacity: asBigNumber(poolInfo[5]),
        originalAdmin: normalizeOrFallback(owner),
      },
      deployment: { decodeStatus: 'not-applicable' },
      collections: [collectionEntry],
      rewards: { primary: { token: rewardToken }, side: [] },
      status,
      statusSource: 'frontend-fallback',
      health,
      warnings: health.warnings,
      cloneSupport: 'PARTIAL',
    }
  } catch (error) {
    return unreadablePool(
      farm,
      address,
      'legacy-masterchef',
      collections,
      error instanceof Error ? error.message : 'Legacy pool introspection failed.',
    )
  }
}

const factoryInterface = new Contract('0x0000000000000000000000000000000000000001', nftFactoryAbi).interface
const newPoolTopic = factoryInterface.getEventTopic('NewSmartChefContract')

export async function discoverNftFactoryPoolAddresses(
  provider: Provider,
  factoryAddress = getNftSmartChefFactoryAddress(NFT_POOL_MANAGER_CHAIN_ID),
  fromBlock = getNftSmartChefFactoryDeploymentBlock(NFT_POOL_MANAGER_CHAIN_ID) || NFT_FACTORY_DEPLOYMENT_FALLBACK,
  toBlock?: number,
): Promise<{ events: FactoryEvent[]; warning?: string }> {
  if (!factoryAddress) return { events: [], warning: 'NFT SmartChefFactory is not configured.' }
  const latest = toBlock === undefined ? await provider.getBlockNumber() : toBlock
  const events = new Map<string, FactoryEvent>()
  let indexerError = ''
  try {
    let nextPageParams: Record<string, string> | undefined
    do {
      const query = nextPageParams
        ? `?${new URLSearchParams(Object.entries(nextPageParams).map(([key, value]) => [key, String(value)]))}`
        : ''
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), NFT_FACTORY_INDEXER_TIMEOUT_MS)
      const response = await fetch(`${NFT_FACTORY_INDEXER_URL}/addresses/${factoryAddress}/logs${query}`, {
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!response.ok) throw new Error(`Indexer returned HTTP ${response.status}`)
      const payload: any = await response.json()
      ;(payload.items || []).forEach((item: any) => {
        if (item.topics?.[0] && item.topics[0].toLowerCase() !== newPoolTopic.toLowerCase()) return
        const decoded = item.decoded?.parameters?.find((parameter: any) => parameter.name === 'smartChef')
        const address = decoded?.value || (item.topics?.[1] ? `0x${item.topics[1].slice(-40)}` : '')
        if (address)
          events.set(address.toLowerCase(), {
            address: normalizeOrFallback(address),
            blockNumber: Number(item.block_number || 0) || undefined,
            transactionHash: item.transaction_hash,
          })
      })
      nextPageParams = payload.next_page_params || undefined
    } while (nextPageParams)
    if (events.size > 0) return { events: Array.from(events.values()) }
    indexerError = 'Indexer returned no NFT pool events.'
  } catch (error) {
    indexerError = error instanceof Error ? error.message : 'NFT factory indexer discovery failed.'
  }
  try {
    const scanFrom = Math.max(fromBlock, latest - NFT_FACTORY_MAX_RPC_DISCOVERY_BLOCKS + 1)
    for (let start = scanFrom; start <= latest; start += NFT_FACTORY_LOG_SCAN_CHUNK) {
      const end = Math.min(start + NFT_FACTORY_LOG_SCAN_CHUNK - 1, latest)
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
            address: normalizeOrFallback(address),
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
          })
      })
    }
    return {
      events: Array.from(events.values()),
      warning:
        scanFrom > fromBlock
          ? `NFT factory indexer unavailable; RPC scanned the latest ${NFT_FACTORY_MAX_RPC_DISCOVERY_BLOCKS.toLocaleString()} blocks. ${indexerError}`
          : undefined,
    }
  } catch (error) {
    return {
      events: Array.from(events.values()),
      warning: `NFT factory discovery partially unavailable. ${
        error instanceof Error ? error.message : 'Unknown RPC error'
      } Indexer: ${indexerError}`,
    }
  }
}

async function sampleBlockTime(provider: Provider, currentBlock: number): Promise<number> {
  try {
    const blocks = await Promise.all(
      [0, 3, 6, 9, 12].map((offset) => provider.getBlock(Math.max(0, currentBlock - offset))),
    )
    const rates = blocks
      .slice(1)
      .map((older, index) => {
        const newer = blocks[index]
        return newer.number > older.number ? (newer.timestamp - older.timestamp) / (newer.number - older.number) : 0
      })
      .filter((rate) => rate > 0)
    if (rates.length) return rates.sort((left, right) => left - right)[Math.floor(rates.length / 2)]
  } catch {
    // Use the known Polygon fallback below.
  }
  return POLYGON_BLOCK_TIME
}

let registryCache: { cachedAt: number; value: NftPoolRegistryResult } | null = null

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await worker(items[index])
    }
  })
  await Promise.all(workers)
  return results
}

async function readV2PoolWithTimeout(
  provider: Provider,
  event: FactoryEvent,
  farm: FarmConfigLike | undefined,
  source: NftPoolSource,
  collections: NftCollection[],
  currentBlock: number,
): Promise<NftPool> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const fallback = new Promise<NftPool>((resolve) => {
    timeout = setTimeout(
      () =>
        resolve(
          unreadablePool(
            farm,
            event.address,
            source,
            collections,
            `Pool introspection timed out after ${NFT_POOL_INTROSPECTION_TIMEOUT_MS / 1000} seconds.`,
            {
              factoryAddress: getNftSmartChefFactoryAddress(NFT_POOL_MANAGER_CHAIN_ID) || undefined,
              transactionHash: event.transactionHash,
              blockNumber: event.blockNumber,
              decodeStatus: event.transactionHash ? 'unavailable' : 'not-applicable',
            },
          ),
        ),
      NFT_POOL_INTROSPECTION_TIMEOUT_MS,
    )
  })
  try {
    return await Promise.race([
      readV2Pool(provider, event.address, farm, source, collections, currentBlock, event),
      fallback,
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

async function readLegacyPoolWithTimeout(
  provider: Provider,
  farm: FarmConfigLike,
  collections: NftCollection[],
  currentBlock: number,
): Promise<NftPool> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const fallback = new Promise<NftPool>((resolve) => {
    timeout = setTimeout(
      () =>
        resolve(
          unreadablePool(
            farm,
            legacyPoolAddress() || 'legacy-masterchef',
            'legacy-masterchef',
            collections,
            `Legacy pool introspection timed out after ${NFT_POOL_INTROSPECTION_TIMEOUT_MS / 1000} seconds.`,
          ),
        ),
      NFT_POOL_INTROSPECTION_TIMEOUT_MS,
    )
  })
  try {
    return await Promise.race([readLegacyPool(provider, farm, collections, currentBlock), fallback])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export async function getNftPoolRegistry(
  provider: Provider = simplePolygonRpcProvider,
  forceRefresh = false,
): Promise<NftPoolRegistryResult> {
  if (!forceRefresh && registryCache && Date.now() - registryCache.cachedAt < NFT_POOL_REGISTRY_CACHE_TTL)
    return registryCache.value
  const currentBlock = await provider.getBlockNumber()
  const currentBlockData: Block = await provider.getBlock(currentBlock)
  const [secondsPerBlock, discovery] = await Promise.all([
    sampleBlockTime(provider, currentBlock),
    discoverNftFactoryPoolAddresses(provider, undefined, undefined, currentBlock),
  ])
  const factoryAddress = getNftSmartChefFactoryAddress(NFT_POOL_MANAGER_CHAIN_ID) || undefined
  const configuredFarms = (nftFarmsConfig as any[]).filter(
    (farm) => farm.nftAddresses?.[NFT_POOL_MANAGER_CHAIN_ID],
  ) as FarmConfigLike[]
  const configByAddress = new Map<string, FarmConfigLike>()
  configuredFarms.forEach((farm) => {
    const address = getConfiguredPoolAddress(farm as any, NFT_POOL_MANAGER_CHAIN_ID)
    if (address) configByAddress.set(address.toLowerCase(), farm)
  })
  const events = new Map<string, FactoryEvent>()
  discovery.events.forEach((event) => events.set(event.address.toLowerCase(), event))
  configByAddress.forEach((farm, address) => {
    if (!events.has(address)) events.set(address, { address })
  })
  const collections = normalizeNftCollectionRegistry(configuredFarms as any, NFT_POOL_MANAGER_CHAIN_ID)
  const v2Pools = await mapWithConcurrency(Array.from(events.values()), NFT_POOL_INTROSPECTION_CONCURRENCY, (event) =>
    readV2PoolWithTimeout(
      provider,
      event,
      configByAddress.get(event.address.toLowerCase()),
      discovery.events.some((candidate) => candidate.address.toLowerCase() === event.address.toLowerCase())
        ? 'nft-factory'
        : 'nft-farms-config',
      collections,
      currentBlock,
    ),
  )
  const legacyFarms = configuredFarms.filter((farm) => !farm.contractAddresses && farm.pid > 0)
  const legacyPools = await mapWithConcurrency(legacyFarms, NFT_POOL_INTROSPECTION_CONCURRENCY, (farm) =>
    readLegacyPoolWithTimeout(provider, farm, collections, currentBlock),
  )
  let factoryOwner: string | undefined
  if (factoryAddress) {
    try {
      factoryOwner = normalizeOrFallback(await new Contract(factoryAddress, nftFactoryAbi, provider).owner())
    } catch {
      factoryOwner = undefined
    }
  }
  const value: NftPoolRegistryResult = {
    pools: [...legacyPools, ...v2Pools].sort((left, right) => (left.pid || 999999) - (right.pid || 999999)),
    collections: collections.sort((left, right) => (left.knownPid || 999999) - (right.knownPid || 999999)),
    chainId: NFT_POOL_MANAGER_CHAIN_ID,
    currentBlock,
    currentTimestamp: currentBlockData?.timestamp,
    secondsPerBlock,
    factoryAddress,
    factoryOwner,
    warning: discovery.warning,
  }
  registryCache = { cachedAt: Date.now(), value }
  return value
}

export function clearNftPoolRegistryCache() {
  registryCache = null
}
