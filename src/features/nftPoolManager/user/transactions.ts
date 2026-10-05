import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import { getAddress, isAddress } from '@ethersproject/address'
import type { Signer } from '@ethersproject/abstract-signer'
import type { Provider, TransactionReceipt, TransactionResponse } from '@ethersproject/providers'
import { getPolygonRuntimeChainId } from 'config/localFork'
import { getNftSmartChefFactoryAddress } from 'utils/addressHelpers'
import { readNftPoolPublicReadiness, verifyNftPoolFactoryEventAtBlock } from '../discovery'
import { v2Erc721UserAbi, v2PoolUserAbi } from './abi'
import type { PublicV2Pool, V2PoolIdentity } from '../publication'
import { readV2UserPosition } from './readers'
import { readV2UserRecoveryPosition } from './recovery'
import type { V2NftTuple, V2RecoveryPosition, V2UserPosition } from './types'
import { assertV2StakeLimits, assertV2StakeSelection } from './readers'

const SAFETY_BPS = 125
const GAS_BUFFER_BPS = 125
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export interface V2WriteContext {
  signer: Signer
  poolAddress: string
  poolRecord: V2PoolIdentity
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

function allPositionNfts(position: V2UserPosition | V2RecoveryPosition): V2NftTuple[] {
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
  if (!('snapshot' in context.poolRecord))
    throw new Error('The full public pool snapshot is unavailable for this action.')
  const provider = context.signer.provider
  if (!provider) throw new Error('Connected wallet did not expose a transaction provider.')
  return readV2UserPosition(context.poolRecord as PublicV2Pool, provider, context.account, {
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

async function assertFreshV2PoolIdentity(
  context: V2WriteContext,
  provider: Provider,
  expectedChainId: number,
): Promise<{ expectedFactory: string; checkedAtBlock: number }> {
  if (
    !isAddress(context.poolAddress) ||
    !isAddress(context.account) ||
    !context.poolRecord ||
    context.poolRecord.verified !== true ||
    !sameAddress(context.poolRecord.address, context.poolAddress)
  )
    throw new Error('The pool does not match its verified CoinCollect factory identity.')
  await assertV2ConnectedNetwork(provider, context.signer, context.account, expectedChainId)
  const expectedFactory = getNftSmartChefFactoryAddress(137)
  if (!expectedFactory || !sameAddress(context.poolRecord.factoryAddress, expectedFactory))
    throw new Error('This pool identity does not match the configured CoinCollect factory.')
  if (
    !context.poolRecord.deploymentHash ||
    !Number.isSafeInteger(context.poolRecord.deploymentBlock) ||
    (context.poolRecord.deploymentBlock as number) < 0
  )
    throw new Error('Fresh factory deployment provenance is unavailable; pool write blocked.')
  const checkedAtBlock = await provider.getBlockNumber()
  const [poolCode, factoryCode, actualFactory, eventProvenance] = await Promise.all([
    provider.getCode(context.poolAddress, checkedAtBlock),
    provider.getCode(expectedFactory, checkedAtBlock),
    new Contract(context.poolAddress, v2PoolUserAbi, provider).callStatic.SMART_CHEF_FACTORY({
      blockTag: checkedAtBlock,
    }),
    verifyNftPoolFactoryEventAtBlock(
      provider,
      expectedFactory,
      context.poolAddress,
      context.poolRecord.deploymentBlock as number,
      context.poolRecord.deploymentHash,
    ),
  ])
  if (!poolCode || poolCode === '0x' || !factoryCode || factoryCode === '0x')
    throw new Error('Pool or factory code is unavailable on the connected network.')
  if (!sameAddress(actualFactory, expectedFactory)) throw new Error('Pool factory verification failed; write blocked.')
  if (!eventProvenance) throw new Error('Fresh factory deployment event verification failed; pool write blocked.')
  return { expectedFactory, checkedAtBlock }
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
  const provider = context.signer.provider
  if (!provider) throw new Error('Connected wallet did not expose a transaction provider.')
  const expectedChainId = context.expectedChainId ?? getPolygonRuntimeChainId()
  const { expectedFactory, checkedAtBlock } = await assertFreshV2PoolIdentity(context, provider, expectedChainId)
  if (method === 'stakeAll' && !('publicReady' in context.poolRecord && context.poolRecord.publicReady))
    throw new Error('This verified pool is not public-ready; new staking is unavailable.')
  if (method === 'stakeAll') {
    const readiness = await readNftPoolPublicReadiness(provider, context.poolAddress, expectedFactory, checkedAtBlock)
    if (!readiness.ready)
      throw new Error(`This pool is not public-ready for new staking: ${readiness.reasons.join(' ')}`)
  }
  const poolRead = new Contract(context.poolAddress, v2PoolUserAbi, context.signer)
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
  const { checkedAtBlock } = await assertFreshV2PoolIdentity(context, provider, expectedChainId)
  const collectionCode = await provider.getCode(collectionAddress, checkedAtBlock)
  if (!collectionCode || collectionCode === '0x')
    throw new Error('Pool, NFT collection or factory code is unavailable on the connected network.')
  const poolRead = new Contract(context.poolAddress, v2PoolUserAbi, provider)
  const readAt = { blockTag: checkedAtBlock }
  const primaryCollection = await poolRead.callStatic.stakedToken(readAt)
  let belongsToPool = sameAddress(primaryCollection, collectionAddress)
  for (let index = 0; !belongsToPool && index < 32; index += 1) {
    try {
      const communityCollection = await poolRead.callStatic.communityCollections(index, readAt)
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
  nfts: Array<{ collectionAddress: string; tokenId: string }>,
  owners: string[],
): Promise<TransactionReceipt> {
  const provider = context.signer.provider
  if (!provider || !('snapshot' in context.poolRecord))
    throw new Error('A public-ready pool and connected read provider are required for staking.')
  const expectedChainId = context.expectedChainId ?? getPolygonRuntimeChainId()
  const readiness = await readNftPoolPublicReadiness(
    provider,
    context.poolAddress,
    getNftSmartChefFactoryAddress(137) || undefined,
  )
  if (!readiness.ready) throw new Error(`This pool is not public-ready for new staking: ${readiness.reasons.join(' ')}`)
  const currentPosition = await readV2UserPosition(context.poolRecord as PublicV2Pool, provider, context.account, {
    expectedChainId,
  })
  assertV2StakeSelection(nfts, currentPosition.collections)
  assertV2StakeLimits(currentPosition, nfts.length)
  if (owners.length !== nfts.length || owners.some((owner) => !sameAddress(owner, context.account)))
    throw new Error('Selected NFT ownership changed. Refresh and select the wallet-owned NFTs again.')
  const currentOwners = await Promise.all(
    nfts.map((nft) => new Contract(nft.collectionAddress, v2Erc721UserAbi, provider).callStatic.ownerOf(nft.tokenId)),
  )
  if (currentOwners.some((owner) => !sameAddress(owner, context.account)))
    throw new Error('Selected NFT ownership changed. Refresh and select the wallet-owned NFTs again.')
  const selectedCollections = new Set(nfts.map((item) => item.collectionAddress.toLowerCase()))
  const missing = currentPosition.collections.filter(
    (item) => selectedCollections.has(item.address.toLowerCase()) && !item.approved,
  )
  if (missing.length) throw new Error(`Approve ${missing.map((item) => item.name).join(', ')} before staking.`)
  const currentFee = sameAddress(currentPosition.feeTo, ZERO_ADDRESS)
    ? BigNumber.from(0)
    : BigNumber.from(currentPosition.performanceFee)
  const expectedPower = BigNumber.from(currentPosition.power).add(
    nfts.reduce((sum, nft) => {
      const collection = currentPosition.collections.find((item) => sameAddress(item.address, nft.collectionAddress))
      if (!collection) throw new Error('Selected collection is not in the verified position.')
      return sum.add(collection.weight)
    }, BigNumber.from(0)),
  )
  const expectedCount = BigNumber.from(currentPosition.nftCount).add(nfts.length)
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
  nfts: Array<{ collectionAddress: string; tokenId: string }>,
): Promise<TransactionReceipt> {
  if (!nfts.length) throw new Error('Select at least one staked NFT to withdraw.')
  const provider = context.signer.provider
  if (!provider) throw new Error('Connected wallet did not expose a transaction provider.')
  const expectedChainId = context.expectedChainId ?? getPolygonRuntimeChainId()
  const current = await readV2UserRecoveryPosition(context.poolRecord, provider, context.account, {
    expectedChainId,
    resumePartial: false,
  })
  const currentlyStaked = new Set(
    current.collections.flatMap((collection) =>
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
    const tuple = current.collections
      .flatMap((collection) => collection.staked)
      .find(
        (item) =>
          sameAddress(item.collectionAddress, nft.collectionAddress) && BigNumber.from(item.tokenId).eq(nft.tokenId),
      )
    if (!tuple) throw new Error('Selected NFT is not in the verified on-chain position.')
    return sum.add(tuple.weight)
  }, BigNumber.from(0))
  const expectedCount = BigNumber.from(current.nftCount).sub(nfts.length)
  const expectedPower = BigNumber.from(current.power).sub(selectedPower)
  if (expectedCount.lt(0) || expectedPower.lt(0)) throw new Error('Selected withdrawal exceeds the verified position.')
  const receipt = await executeV2PoolWrite(context, 'unstakeAll', [
    nfts.map((item) => getAddress(item.collectionAddress)),
    nfts.map((item) => BigNumber.from(item.tokenId)),
  ])
  return verifyConfirmedReceipt(receipt, async () => {
    const owners = await Promise.all(
      nfts.map((nft) =>
        new Contract(nft.collectionAddress, v2Erc721UserAbi, provider).callStatic.ownerOf(nft.tokenId, {
          blockTag: receipt.blockNumber,
        }),
      ),
    )
    if (owners.some((owner) => !sameAddress(owner, context.account)))
      throw new Error('A withdrawn NFT is not back in the connected wallet at the confirmed block.')
    const after = await readV2UserRecoveryPosition(context.poolRecord, provider, context.account, {
      expectedChainId,
      blockTag: receipt.blockNumber,
      resumePartial: false,
    })
    if (!BigNumber.from(after.nftCount).eq(expectedCount) || !BigNumber.from(after.power).eq(expectedPower))
      throw new Error('NFT withdrawal confirmed, but the remaining position count or stored power did not match.')
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
  confirmed: boolean,
): Promise<TransactionReceipt> {
  if (!confirmed) throw new Error('Confirm that emergency withdrawal forfeits pending rewards.')
  const provider = context.signer.provider
  if (!provider) throw new Error('Connected wallet did not expose a transaction provider.')
  const expectedChainId = context.expectedChainId ?? getPolygonRuntimeChainId()
  const current = await readV2UserRecoveryPosition(context.poolRecord, provider, context.account, {
    expectedChainId,
    resumePartial: false,
  })
  if (current.nftCount === '0' || !current.complete || allPositionNfts(current).length !== Number(current.nftCount))
    throw new Error('The complete position could not be verified; emergency withdrawal is blocked.')
  const nfts = allPositionNfts(current)
  const receipt = await executeV2PoolWrite(context, 'emergencyWithdraw')
  return verifyConfirmedReceipt(receipt, async () => {
    const owners = await Promise.all(
      nfts.map((nft) =>
        new Contract(nft.collectionAddress, v2Erc721UserAbi, provider).callStatic.ownerOf(nft.tokenId, {
          blockTag: receipt.blockNumber,
        }),
      ),
    )
    if (owners.some((owner) => !sameAddress(owner, context.account)))
      throw new Error('An emergency-withdrawn NFT is not back in the connected wallet at the confirmed block.')
    const after = await readV2UserRecoveryPosition(context.poolRecord, provider, context.account, {
      expectedChainId,
      blockTag: receipt.blockNumber,
      resumePartial: false,
    })
    if (after.nftCount !== '0' || after.power !== '0')
      throw new Error('Emergency withdrawal confirmed, but a position remains at the confirmed block.')
  })
}

export async function harvestV2Pool(context: V2WriteContext): Promise<TransactionReceipt> {
  const receipt = await executeV2PoolWrite(context, 'harvest')
  return verifyConfirmedReceipt(receipt, async () => {
    // A complete read refreshes primary pending, side estimates, and each reward-token wallet balance.
    await readPositionAfterReceipt(context)
  })
}
