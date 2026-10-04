import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import { getAddress, isAddress } from '@ethersproject/address'
import type { Signer } from '@ethersproject/abstract-signer'
import type { Provider, TransactionReceipt, TransactionResponse } from '@ethersproject/providers'
import { getPolygonRuntimeChainId } from 'config/localFork'
import { getNftSmartChefFactoryAddress } from 'utils/addressHelpers'
import { v2Erc721UserAbi, v2PoolUserAbi } from './abi'
import type { PublicV2Pool } from '../publication'
import { readV2UserPosition } from './readers'
import type { V2NftTuple, V2UserPosition } from './types'
import { assertV2StakeLimits, assertV2StakeSelection } from './readers'

const SAFETY_BPS = 125
const GAS_BUFFER_BPS = 125
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export interface V2WriteContext {
  signer: Signer
  poolAddress: string
  poolRecord: PublicV2Pool
  account: string
  expectedChainId?: number
  onSubmitted?: (hash: string) => void
}

export class ConfirmedV2WriteVerificationError extends Error {
  readonly receipt: TransactionReceipt
  private readonly retryVerification: () => Promise<void>

  constructor(receipt: TransactionReceipt, cause: unknown, retryVerification: () => Promise<void>) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    super(
      `Transaction ${receipt.transactionHash.slice(
        0,
        10,
      )}… is confirmed, but on-chain verification is pending: ${detail}`,
    )
    this.name = 'ConfirmedV2WriteVerificationError'
    this.receipt = receipt
    this.retryVerification = retryVerification
    Object.setPrototypeOf(this, new.target.prototype)
  }

  verifyAgain(): Promise<void> {
    return this.retryVerification()
  }
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase()
}

async function verifyConfirmedReceipt(
  receipt: TransactionReceipt,
  verification: () => Promise<void>,
): Promise<TransactionReceipt> {
  try {
    await verification()
    return receipt
  } catch (cause) {
    throw new ConfirmedV2WriteVerificationError(receipt, cause, verification)
  }
}

function allPositionNfts(position: V2UserPosition): V2NftTuple[] {
  return position.collections.flatMap((collection) => collection.staked)
}

function assertPowerAndCount(
  position: V2UserPosition,
  expectedCount: BigNumber,
  expectedPower: BigNumber,
  action: string,
) {
  if (!BigNumber.from(position.nftCount).eq(expectedCount) || !BigNumber.from(position.power).eq(expectedPower)) {
    throw new Error(
      `${action} confirmed, but the verified position is ${position.nftCount} NFTs / ${
        position.power
      } power; expected ${expectedCount.toString()} / ${expectedPower.toString()}.`,
    )
  }
}

async function readPositionAfterReceipt(context: V2WriteContext): Promise<V2UserPosition> {
  const provider = context.signer.provider
  if (!provider) throw new Error('Connected wallet did not expose a transaction provider.')
  return readV2UserPosition(context.poolRecord, provider, context.account, {
    expectedChainId: context.expectedChainId ?? getPolygonRuntimeChainId(),
  })
}

export async function assertV2ConnectedNetwork(
  provider: Provider,
  signer: Signer,
  account: string,
  expectedChainId: number,
) {
  const [network, signerAddress] = await Promise.all([provider.getNetwork(), signer.getAddress()])
  if (network.chainId !== expectedChainId)
    throw new Error(`Wrong wallet network. Select chain ${expectedChainId} before confirming this transaction.`)
  if (!sameAddress(signerAddress, account))
    throw new Error('Wallet account changed. Reconnect the intended wallet and retry the action.')
}

export async function assertV2WriteGas(
  provider: Provider,
  signer: Signer,
  estimatedGas: BigNumber,
  transactionValue: BigNumber,
): Promise<{ gasLimit: BigNumber; requiredBalance: BigNumber }> {
  if (estimatedGas.lte(0)) throw new Error('Transaction gas estimate is invalid; write blocked.')
  const account = await signer.getAddress()
  const [feeData, balance] = await Promise.all([provider.getFeeData(), provider.getBalance(account)])
  const price = BigNumber.from(feeData.maxFeePerGas || feeData.gasPrice || 0)
  if (price.lte(0)) throw new Error('Current gas price is unavailable; write blocked.')
  const gasLimit = estimatedGas.mul(GAS_BUFFER_BPS).div(100)
  const expectedGas = gasLimit.mul(price)
  const safetyGas = expectedGas.mul(SAFETY_BPS).div(100)
  const requiredBalance = safetyGas.add(transactionValue)
  if (BigNumber.from(balance).lt(requiredBalance))
    throw new Error('Insufficient native POL for the pool fee and gas safety margin.')
  return { gasLimit, requiredBalance }
}

export async function waitForV2Receipt(
  transaction: TransactionResponse,
  destination: string,
  expectedData: string,
): Promise<TransactionReceipt> {
  try {
    const receipt = await transaction.wait(1)
    if (!receipt || receipt.status !== 1) throw new Error('Pool transaction reverted.')
    return receipt
  } catch (error: any) {
    if (error?.code === 'TRANSACTION_REPLACED' && error.cancelled !== true && error.replacement && error.receipt) {
      if (
        !sameAddress(error.replacement.to || '', destination) ||
        error.replacement.data !== expectedData ||
        !BigNumber.from(error.replacement.value || 0).eq(BigNumber.from(transaction.value || 0))
      )
        throw new Error('A different transaction replaced this action; verify the pool position before retrying.')
      if (error.receipt.status !== 1) throw new Error('Replacement pool transaction reverted.')
      return error.receipt
    }
    if (error?.code === 'TRANSACTION_REPLACED' && error.cancelled)
      throw new Error('Transaction was cancelled in the wallet.')
    if (error?.code === 4001 || error?.code === 'ACTION_REJECTED')
      throw new Error('Transaction was rejected in the wallet.')
    throw error
  }
}

export async function executeV2PoolWrite(
  context: V2WriteContext,
  method: string,
  args: unknown[] = [],
  value = BigNumber.from(0),
): Promise<TransactionReceipt> {
  if (!isAddress(context.poolAddress) || !isAddress(context.account))
    throw new Error('Pool or wallet address is invalid.')
  if (!context.poolRecord || !sameAddress(context.poolRecord.address, context.poolAddress))
    throw new Error('The pool does not match its verified address-native publication record.')
  const provider = context.signer.provider
  if (!provider) throw new Error('Connected wallet did not expose a transaction provider.')
  const expectedChainId = context.expectedChainId ?? getPolygonRuntimeChainId()
  await assertV2ConnectedNetwork(provider, context.signer, context.account, expectedChainId)
  const expectedFactory = getNftSmartChefFactoryAddress(137)
  if (!expectedFactory) throw new Error('Configured Polygon NFT SmartChef Factory is unavailable.')
  const [poolCode, factoryCode] = await Promise.all([
    provider.getCode(context.poolAddress),
    provider.getCode(expectedFactory),
  ])
  if (!poolCode || poolCode === '0x' || !factoryCode || factoryCode === '0x')
    throw new Error('Pool or factory code is unavailable on the connected network.')
  const poolRead = new Contract(context.poolAddress, v2PoolUserAbi, context.signer)
  const actualFactory = await poolRead.SMART_CHEF_FACTORY()
  if (!sameAddress(actualFactory, expectedFactory)) throw new Error('Pool factory verification failed; write blocked.')
  if (
    !poolRead.interface.functions[
      `${method}(${method === 'stakeAll' || method === 'unstakeAll' ? 'address[],uint256[]' : ''})`
    ]
  )
    throw new Error(`Unsupported pool action: ${method}.`)
  const overrides = { from: getAddress(context.account), value }
  // Both simulation and gas estimation go through the connected signer context.
  await poolRead.callStatic[method](...args, overrides)
  const estimatedGas = BigNumber.from(await poolRead.estimateGas[method](...args, overrides))
  const gas = await assertV2WriteGas(provider, context.signer, estimatedGas, value)
  const transaction = await poolRead[method](...args, { ...overrides, gasLimit: gas.gasLimit })
  context.onSubmitted?.(transaction.hash)
  return waitForV2Receipt(transaction, context.poolAddress, transaction.data)
}

export async function approveV2PoolCollection(
  context: V2WriteContext,
  collectionAddress: string,
): Promise<TransactionReceipt> {
  if (!isAddress(collectionAddress)) throw new Error('NFT collection address is invalid.')
  const provider = context.signer.provider
  if (!provider) throw new Error('Connected wallet did not expose a transaction provider.')
  const expectedChainId = context.expectedChainId ?? getPolygonRuntimeChainId()
  await assertV2ConnectedNetwork(provider, context.signer, context.account, expectedChainId)
  const expectedFactory = getNftSmartChefFactoryAddress(137)
  if (!expectedFactory) throw new Error('Configured Polygon NFT SmartChef Factory is unavailable.')
  const [poolCode, factoryCode, collectionCode] = await Promise.all([
    provider.getCode(context.poolAddress),
    provider.getCode(expectedFactory),
    provider.getCode(collectionAddress),
  ])
  if ([poolCode, factoryCode, collectionCode].some((code) => !code || code === '0x'))
    throw new Error('Pool, NFT collection or factory code is unavailable on the connected network.')
  const poolRead = new Contract(context.poolAddress, v2PoolUserAbi, provider)
  if (!sameAddress(await poolRead.SMART_CHEF_FACTORY(), expectedFactory))
    throw new Error('Pool factory verification failed; approval blocked.')
  const primaryCollection = await poolRead.stakedToken()
  let belongsToPool = sameAddress(primaryCollection, collectionAddress)
  for (let index = 0; !belongsToPool && index < 16; index += 1) {
    try {
      const communityCollection = await poolRead.communityCollections(index)
      belongsToPool = sameAddress(communityCollection, collectionAddress)
    } catch (error: any) {
      if (error?.code === 'CALL_EXCEPTION' || error?.error?.code === 'CALL_EXCEPTION') break
      throw error
    }
  }
  if (!belongsToPool) throw new Error('This collection is not configured in the verified pool; approval blocked.')
  const collection = new Contract(collectionAddress, v2Erc721UserAbi, context.signer)
  const approved = await collection.callStatic.isApprovedForAll(context.account, context.poolAddress)
  if (approved) throw new Error('This NFT collection is already approved for the pool.')
  const overrides = { from: getAddress(context.account), value: BigNumber.from(0) }
  await collection.callStatic.setApprovalForAll(context.poolAddress, true, overrides)
  const estimatedGas = BigNumber.from(
    await collection.estimateGas.setApprovalForAll(context.poolAddress, true, overrides),
  )
  const gas = await assertV2WriteGas(provider, context.signer, estimatedGas, BigNumber.from(0))
  const transaction = await collection.setApprovalForAll(context.poolAddress, true, {
    ...overrides,
    gasLimit: gas.gasLimit,
  })
  context.onSubmitted?.(transaction.hash)
  const receipt = await waitForV2Receipt(transaction, collectionAddress, transaction.data)
  return verifyConfirmedReceipt(receipt, async () => {
    const approvedAfter = await collection.callStatic.isApprovedForAll(context.account, context.poolAddress, {
      blockTag: receipt.blockNumber,
    })
    if (!approvedAfter) throw new Error('The collection operator approval is not present at the confirmed block.')
  })
}

export async function stakeV2Nfts(
  context: V2WriteContext,
  position: V2UserPosition,
  nfts: Array<{ collectionAddress: string; tokenId: string }>,
  owners: string[],
): Promise<TransactionReceipt> {
  assertV2StakeSelection(nfts, position.collections)
  assertV2StakeLimits(position, nfts.length)
  if (owners.length !== nfts.length || owners.some((owner) => !sameAddress(owner, context.account)))
    throw new Error('Selected NFT ownership changed. Refresh and select the wallet-owned NFTs again.')
  const selectedCollections = new Set(nfts.map((item) => item.collectionAddress.toLowerCase()))
  const missing = position.collections.filter(
    (item) => selectedCollections.has(item.address.toLowerCase()) && !item.approved,
  )
  if (missing.length) throw new Error(`Approve ${missing.map((item) => item.name).join(', ')} before staking.`)
  const currentFee = sameAddress(position.feeTo, ZERO_ADDRESS)
    ? BigNumber.from(0)
    : BigNumber.from(position.performanceFee)
  const expectedPower = BigNumber.from(position.power).add(
    nfts.reduce((sum, nft) => {
      const collection = position.collections.find((item) => sameAddress(item.address, nft.collectionAddress))
      if (!collection) throw new Error('Selected collection is not in the verified position.')
      return sum.add(collection.weight)
    }, BigNumber.from(0)),
  )
  const expectedCount = BigNumber.from(position.nftCount).add(nfts.length)
  const receipt = await executeV2PoolWrite(
    context,
    'stakeAll',
    [nfts.map((item) => getAddress(item.collectionAddress)), nfts.map((item) => BigNumber.from(item.tokenId))],
    currentFee,
  )
  return verifyConfirmedReceipt(receipt, async () => {
    const after = await readPositionAfterReceipt(context)
    assertPowerAndCount(after, expectedCount, expectedPower, 'NFT stake')
    const staked = new Map(
      allPositionNfts(after).map((item) => [`${item.collectionAddress.toLowerCase()}:${item.tokenId}`, item]),
    )
    for (const nft of nfts) {
      const key = `${nft.collectionAddress.toLowerCase()}:${BigNumber.from(nft.tokenId).toString()}`
      if (!staked.has(key)) throw new Error(`Staked NFT ${nft.tokenId} was not found in the verified position.`)
    }
  })
}

export async function unstakeV2Nfts(
  context: V2WriteContext,
  position: V2UserPosition,
  nfts: Array<{ collectionAddress: string; tokenId: string }>,
): Promise<TransactionReceipt> {
  if (!nfts.length) throw new Error('Select at least one staked NFT to withdraw.')
  const currentlyStaked = new Set(
    position.collections.flatMap((collection) =>
      collection.staked.map((item) => `${item.collectionAddress.toLowerCase()}:${item.tokenId}`),
    ),
  )
  const seen = new Set<string>()
  for (const item of nfts) {
    const key = `${item.collectionAddress.toLowerCase()}:${BigNumber.from(item.tokenId).toString()}`
    if (seen.has(key) || !currentlyStaked.has(key))
      throw new Error('Selected NFT is not in the verified on-chain position.')
    seen.add(key)
  }
  const selectedPower = nfts.reduce((sum, nft) => {
    const tuple = position.collections
      .flatMap((collection) => collection.staked)
      .find(
        (item) =>
          sameAddress(item.collectionAddress, nft.collectionAddress) && BigNumber.from(item.tokenId).eq(nft.tokenId),
      )
    if (!tuple) throw new Error('Selected NFT is not in the verified on-chain position.')
    return sum.add(tuple.weight)
  }, BigNumber.from(0))
  const expectedCount = BigNumber.from(position.nftCount).sub(nfts.length)
  const expectedPower = BigNumber.from(position.power).sub(selectedPower)
  if (expectedCount.lt(0) || expectedPower.lt(0)) throw new Error('Selected withdrawal exceeds the verified position.')
  const receipt = await executeV2PoolWrite(context, 'unstakeAll', [
    nfts.map((item) => getAddress(item.collectionAddress)),
    nfts.map((item) => BigNumber.from(item.tokenId)),
  ])
  return verifyConfirmedReceipt(receipt, async () => {
    const provider = context.signer.provider!
    const owners = await Promise.all(
      nfts.map((nft) =>
        new Contract(nft.collectionAddress, v2Erc721UserAbi, provider).callStatic.ownerOf(nft.tokenId, {
          blockTag: receipt.blockNumber,
        }),
      ),
    )
    if (owners.some((owner) => !sameAddress(owner, context.account)))
      throw new Error('A withdrawn NFT is not back in the connected wallet at the confirmed block.')
    const after = await readPositionAfterReceipt(context)
    assertPowerAndCount(after, expectedCount, expectedPower, 'NFT withdrawal')
    const remaining = new Set(
      allPositionNfts(after).map((item) => `${item.collectionAddress.toLowerCase()}:${item.tokenId}`),
    )
    if (
      nfts.some((nft) =>
        remaining.has(`${nft.collectionAddress.toLowerCase()}:${BigNumber.from(nft.tokenId).toString()}`),
      )
    )
      throw new Error('A withdrawn NFT is still listed in the verified position.')
  })
}

export async function emergencyWithdrawV2Position(
  context: V2WriteContext,
  position: V2UserPosition,
  confirmed: boolean,
): Promise<TransactionReceipt> {
  if (!confirmed) throw new Error('Confirm that emergency withdrawal forfeits pending rewards.')
  if (
    position.nftCount === '0' ||
    position.collections.reduce((sum, collection) => sum + collection.staked.length, 0) !== Number(position.nftCount)
  )
    throw new Error('The complete position could not be verified; emergency withdrawal is blocked.')
  const nfts = allPositionNfts(position)
  const receipt = await executeV2PoolWrite(context, 'emergencyWithdraw')
  return verifyConfirmedReceipt(receipt, async () => {
    const provider = context.signer.provider!
    const owners = await Promise.all(
      nfts.map((nft) =>
        new Contract(nft.collectionAddress, v2Erc721UserAbi, provider).callStatic.ownerOf(nft.tokenId, {
          blockTag: receipt.blockNumber,
        }),
      ),
    )
    if (owners.some((owner) => !sameAddress(owner, context.account)))
      throw new Error('An emergency-withdrawn NFT is not back in the connected wallet at the confirmed block.')
    const after = await readPositionAfterReceipt(context)
    assertPowerAndCount(after, BigNumber.from(0), BigNumber.from(0), 'Emergency withdrawal')
  })
}

export async function harvestV2Pool(context: V2WriteContext): Promise<TransactionReceipt> {
  const receipt = await executeV2PoolWrite(context, 'harvest')
  return verifyConfirmedReceipt(receipt, async () => {
    // A complete read refreshes primary pending, side estimates, and each reward-token wallet balance.
    await readPositionAfterReceipt(context)
  })
}
