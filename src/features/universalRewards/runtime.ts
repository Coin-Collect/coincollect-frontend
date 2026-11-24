import {
  BaseError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
  createPublicClient,
  getAddress,
  http,
  isAddress,
  isAddressEqual,
  isHex,
  keccak256,
  zeroAddress,
  type Address,
  type Hex,
} from 'viem'
import { getLocalForkRpcUrl, getPolygonRuntimeChainId, isLocalForkMode } from 'config/localFork'
import { treasuryVaultAbi, universalRewardsAbi } from './abi'
import { positionBatchAbi } from './positionBatch'

export interface V3Deployment {
  readonly address: Address
  readonly runtimeHash: Hex
  readonly chainId: number
  readonly id?: string
  readonly primary?: boolean
  readonly treasury?: { readonly address: Address; readonly runtimeHash: Hex }
}

export function parseV3DeploymentRegistry(
  registry: string | undefined,
  primary: V3Deployment,
): V3Deployment[] {
  if (!registry) return [primary]
  const records: unknown = JSON.parse(registry)
  if (!Array.isArray(records) || records.length < 1 || records.length > 16) {
    throw new Error('Invalid V3 deployment registry.')
  }
  const ids = new Set<string>()
  const addresses = new Set<string>()
  const vaults = new Set<string>()
  const entries = records.map((record) => {
    const { id, chainId, address, runtimeHash, treasury } = record ?? {}
    if (
      typeof id !== 'string' || !/^v3\.[0-9]{1,3}(\.[0-9]{1,3})?$/.test(id) ||
      chainId !== primary.chainId ||
      typeof address !== 'string' || !isAddress(address) || isAddressEqual(address, zeroAddress) ||
      !isHex(runtimeHash) || runtimeHash.length !== 66 ||
      typeof treasury?.address !== 'string' || !isAddress(treasury.address) || isAddressEqual(treasury.address, zeroAddress) ||
      !isHex(treasury.runtimeHash) || treasury.runtimeHash.length !== 66
    ) throw new Error('Invalid V3 deployment registry entry.')
    const ledger = getAddress(address)
    const vault = getAddress(treasury.address)
    if (ids.has(id) || addresses.has(ledger) || vaults.has(vault) || isAddressEqual(ledger, vault)) {
      throw new Error('Duplicate V3 deployment, ledger or Treasury.')
    }
    ids.add(id)
    addresses.add(ledger)
    vaults.add(vault)
    const isPrimary = isAddressEqual(ledger, primary.address)
    if (isPrimary && runtimeHash.toLowerCase() !== primary.runtimeHash.toLowerCase()) {
      throw new Error('V3 default ledger hash does not match its registry entry.')
    }
    return { id, chainId, address: ledger, runtimeHash, primary: isPrimary, treasury: {
      address: vault,
      runtimeHash: treasury.runtimeHash,
    } } satisfies V3Deployment
  })
  if (!entries.some(({ primary: isPrimary }) => isPrimary)) throw new Error('V3 default ledger is missing from the registry.')
  return entries
}

export function getV3Deployments(): V3Deployment[] {
  const address = process.env.NEXT_PUBLIC_V3_LEDGER_ADDRESS
  const runtimeHash = process.env.NEXT_PUBLIC_V3_LEDGER_CODE_HASH
  if (!address || !isAddress(address) || !runtimeHash || !isHex(runtimeHash) || runtimeHash.length !== 66)
    return []
  const chainId = getPolygonRuntimeChainId()
  if (chainId !== (isLocalForkMode ? 31337 : 137)) return []
  return parseV3DeploymentRegistry(process.env.NEXT_PUBLIC_V3_DEPLOYMENT_REGISTRY, {
    address: getAddress(address), runtimeHash, chainId,
  })
}

export function getV3Deployment(id?: string | string[]): V3Deployment | undefined {
  const deployments = getV3Deployments()
  if (id !== undefined) return deployments.find((deployment) => deployment.id === id)
  return deployments.find((deployment) => deployment.primary || deployment.id === undefined)
}

export function v3DeploymentPath(path: string, deployment?: V3Deployment) {
  return deployment?.id ? `${path}?deployment=${deployment.id}` : path
}

export function createV3Client() {
  const endpoint = isLocalForkMode ? getLocalForkRpcUrl() : '/api/rpc/polygon'
  return createPublicClient({ transport: http(endpoint, { timeout: 10_000, retryCount: 1 }), pollingInterval: 2_000 })
}

export type V3Client = ReturnType<typeof createV3Client>

export async function readV3Capacity(client: V3Client, deployment: V3Deployment, blockNumber?: bigint) {
  return Number(
    await client.readContract({
      address: deployment.address,
      abi: universalRewardsAbi,
      functionName: 'MAX_POSITIONS',
      blockNumber,
    }),
  )
}

export function isV3MissingSelector(error: unknown) {
  return (
    error instanceof BaseError &&
    Boolean(
      error.walk(
        (cause) =>
          cause instanceof ContractFunctionZeroDataError ||
          (cause instanceof ContractFunctionRevertedError &&
            !cause.data &&
            !cause.signature &&
            (!cause.reason || /^execution reverted(?: for an unknown reason\.)?$/i.test(cause.reason))),
      ),
    )
  )
}

export async function readV3ClaimPeriod(client: V3Client, deployment: V3Deployment, blockNumber?: bigint) {
  try {
    return await client.readContract({
      address: deployment.address,
      abi: universalRewardsAbi,
      functionName: 'CLAIM_PERIOD',
      blockNumber,
    })
  } catch (error) {
    // Older, already deployed ledgers do not implement this selector.
    if (isV3MissingSelector(error)) return undefined
    throw error
  }
}

export async function readV3BatchLimit(client: V3Client, deployment: V3Deployment, blockNumber?: bigint) {
  try {
    const limit = await client.readContract({
      address: deployment.address,
      abi: positionBatchAbi,
      functionName: 'batchPositionLimit',
      blockNumber,
    })
    return limit > BigInt(0) && limit <= BigInt(32) ? Number(limit) : 0
  } catch (error) {
    if (isV3MissingSelector(error)) return 0
    throw error
  }
}

export async function validateV3Deployment(client: V3Client, deployment: V3Deployment, blockNumber?: bigint) {
  const [actualChain, code] = await Promise.all([
    client.getChainId(),
    client.getCode({ address: deployment.address, blockNumber }),
  ])
  if (
    actualChain !== deployment.chainId ||
    !code ||
    keccak256(code).toLowerCase() !== deployment.runtimeHash.toLowerCase()
  ) {
    throw new Error('The V3 deployment could not be verified on the selected chain.')
  }
  const { treasury } = deployment
  if (!treasury) return
  const [vault, vaultCode, vaultLedger] = await Promise.all([
    client.readContract({ address: deployment.address, abi: universalRewardsAbi, functionName: 'treasuryVault', blockNumber }),
    client.getCode({ address: treasury.address, blockNumber }),
    client.readContract({ address: treasury.address, abi: treasuryVaultAbi, functionName: 'ledger', blockNumber }),
  ])
  if (
    !isAddressEqual(vault, treasury.address) || !isAddressEqual(vaultLedger, deployment.address) ||
    !vaultCode || keccak256(vaultCode).toLowerCase() !== treasury.runtimeHash.toLowerCase()
  ) {
    throw new Error('The Treasury could not be verified for this V3 ledger.')
  }
}

export async function readV3Operator(client: V3Client, deployment: V3Deployment) {
  const blockNumber = await client.getBlockNumber()
  await validateV3Deployment(client, deployment, blockNumber)
  return client.readContract({
    address: deployment.address,
    abi: universalRewardsAbi,
    functionName: 'admin',
    blockNumber,
  })
}
