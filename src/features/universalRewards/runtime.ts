import {
  BaseError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
  createPublicClient,
  getAddress,
  http,
  isAddress,
  isHex,
  keccak256,
  type Address,
  type Hex,
} from 'viem'
import { getLocalForkRpcUrl, getPolygonRuntimeChainId, isLocalForkMode } from 'config/localFork'
import { universalRewardsAbi } from './abi'
import { allowsLocalPositionBatch, localPositionBatchAbi } from './localPositionBatch'

export interface V3Deployment {
  readonly address: Address
  readonly runtimeHash: Hex
  readonly chainId: number
}

export function getV3Deployment(): V3Deployment | undefined {
  const address = process.env.NEXT_PUBLIC_V3_LEDGER_ADDRESS
  const runtimeHash = process.env.NEXT_PUBLIC_V3_LEDGER_CODE_HASH
  if (!address || !isAddress(address) || !runtimeHash || !isHex(runtimeHash) || runtimeHash.length !== 66)
    return undefined
  const chainId = getPolygonRuntimeChainId()
  if (chainId !== (isLocalForkMode ? 31337 : 137)) return undefined
  return { address: getAddress(address), runtimeHash, chainId }
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

export async function readV3BatchLimit(client: V3Client, deployment: V3Deployment, blockNumber: bigint) {
  if (!allowsLocalPositionBatch(deployment)) return 0
  try {
    const limit = await client.readContract({
      address: deployment.address,
      abi: localPositionBatchAbi,
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
