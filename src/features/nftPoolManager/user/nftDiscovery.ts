import { BigNumber } from '@ethersproject/bignumber'
import { MaxUint256 } from '@ethersproject/constants'
import { Contract } from '@ethersproject/contracts'
import { getAddress, isAddress } from '@ethersproject/address'
import type { Provider } from '@ethersproject/providers'
import { resolveNftAssetUrl } from '../assets'
import { v2Erc721UserAbi } from './abi'
import type { V2NftDiscoveryMethod, V2OwnedNfts } from './types'

const PAGE_SIZE = 50
const NFT_DISCOVERY_CAP = 1_000
const ERC721_ENUMERABLE = '0x780e9d63'

function normalizedIds(values: Array<string | BigNumber>): string[] {
  const ids = values.map((value) => BigNumber.from(value).toString())
  if (ids.length > NFT_DISCOVERY_CAP)
    throw new Error(`Wallet NFT discovery exceeded the ${NFT_DISCOVERY_CAP}-NFT safety limit.`)
  if (new Set(ids).size !== ids.length) throw new Error('NFT discovery returned a duplicate token ID.')
  return ids
}

async function verifyOwnership(
  collection: Contract,
  collectionAddress: string,
  account: string,
  ids: string[],
  blockTag: number,
): Promise<string[]> {
  const ownerChecks = await Promise.all(
    ids.map((id) => collection.callStatic.ownerOf(id, { blockTag }) as Promise<string>),
  )
  const wrongOwner = ownerChecks.findIndex((owner) => owner.toLowerCase() !== account.toLowerCase())
  if (wrongOwner >= 0)
    throw new Error(`NFT #${ids[wrongOwner]} is no longer owned by the connected wallet. Refresh your inventory.`)
  return normalizedIds(ids)
}

async function readWalletOfOwner(
  collection: Contract,
  address: string,
  account: string,
  blockTag: number,
): Promise<string[]> {
  const values = await collection.callStatic.walletOfOwner(account, { blockTag })
  return verifyOwnership(collection, address, account, normalizedIds(values), blockTag)
}

async function readPagedWallet(
  collection: Contract,
  address: string,
  account: string,
  blockTag: number,
): Promise<string[]> {
  const ids: string[] = []
  let cursor = BigNumber.from(0)
  while (ids.length < NFT_DISCOVERY_CAP) {
    const [page, nextCursor] = await collection.callStatic.tokensOfOwnerBySize(account, cursor, PAGE_SIZE, { blockTag })
    const pageIds = normalizedIds(page)
    if (pageIds.length > PAGE_SIZE) throw new Error('NFT collection returned a page larger than requested.')
    ids.push(...pageIds)
    const next = BigNumber.from(nextCursor)
    if (next.lte(cursor) || pageIds.length < PAGE_SIZE)
      return verifyOwnership(collection, address, account, normalizedIds(ids), blockTag)
    cursor = next
  }
  throw new Error(`Wallet NFT discovery reached its ${NFT_DISCOVERY_CAP}-NFT safety limit; the list is incomplete.`)
}

async function readEnumerableWallet(
  collection: Contract,
  address: string,
  account: string,
  blockTag: number,
): Promise<string[]> {
  const supports = await collection.callStatic.supportsInterface(ERC721_ENUMERABLE, { blockTag })
  if (!supports) throw new Error('Collection is not ERC721Enumerable.')
  const balance = BigNumber.from(await collection.callStatic.balanceOf(account, { blockTag })).toNumber()
  if (balance > NFT_DISCOVERY_CAP)
    throw new Error(`Wallet NFT discovery exceeded the ${NFT_DISCOVERY_CAP}-NFT safety limit.`)
  const ids = await Promise.all(
    Array.from(
      { length: balance },
      (_, index) => collection.callStatic.tokenOfOwnerByIndex(account, index, { blockTag }) as Promise<BigNumber>,
    ),
  )
  return verifyOwnership(collection, address, account, normalizedIds(ids), blockTag)
}

export async function readV2OwnedNfts(
  provider: Provider,
  collectionAddress: string,
  account: string,
  options: { blockTag?: number; manualTokenIds?: string } = {},
): Promise<V2OwnedNfts> {
  if (!isAddress(collectionAddress) || !isAddress(account))
    throw new Error('NFT collection or wallet address is invalid.')
  const address = getAddress(collectionAddress)
  const wallet = getAddress(account)
  const blockTag = options.blockTag ?? (await provider.getBlockNumber())
  const collection = new Contract(address, v2Erc721UserAbi, provider)
  const code = await provider.getCode(address, blockTag)
  if (!code || code === '0x') throw new Error(`NFT collection ${address} has no contract code on this network.`)

  if (options.manualTokenIds !== undefined) {
    const parts = options.manualTokenIds.split(/[\s,;]+/).filter(Boolean)
    if (!parts.length) throw new Error('Enter one or more NFT token IDs.')
    if (parts.some((id) => !/^\d+$/.test(id))) throw new Error('NFT token IDs must be unsigned integers.')
    const ids = normalizedIds(
      parts.map((id) => {
        const value = BigNumber.from(id)
        if (value.gt(MaxUint256)) throw new Error(`NFT token ID ${id} is outside uint256 range.`)
        return value
      }),
    )
    return {
      collectionAddress: address,
      tokenIds: await verifyOwnership(collection, address, wallet, ids, blockTag),
      complete: true,
      method: 'manual',
    }
  }

  const methods: Array<{ name: V2NftDiscoveryMethod; read: () => Promise<string[]> }> = [
    { name: 'walletOfOwner', read: () => readWalletOfOwner(collection, address, wallet, blockTag) },
    { name: 'tokensOfOwnerBySize', read: () => readPagedWallet(collection, address, wallet, blockTag) },
    { name: 'enumerable', read: () => readEnumerableWallet(collection, address, wallet, blockTag) },
  ]
  const failures: string[] = []
  for (const candidate of methods) {
    try {
      return {
        collectionAddress: address,
        tokenIds: await candidate.read(),
        complete: true,
        method: candidate.name,
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error))
    }
  }
  return {
    collectionAddress: address,
    tokenIds: [],
    complete: false,
    method: 'manual',
    message: failures.length
      ? 'This NFT collection cannot be fully enumerated. Enter token IDs and verify ownership.'
      : undefined,
  }
}

export interface V2NftMetadata {
  name?: string
  image?: string
}

/** Best-effort only: a token URI or metadata host failure never blocks an NFT action. */
export async function readV2NftMetadata(
  provider: Provider,
  collectionAddress: string,
  tokenId: string,
): Promise<V2NftMetadata> {
  try {
    const collection = new Contract(collectionAddress, v2Erc721UserAbi, provider)
    let uri = String(await collection.callStatic.tokenURI(tokenId))
    if (uri.startsWith('ipfs://')) uri = `https://ipfs.io/ipfs/${uri.slice('ipfs://'.length)}`
    if (!/^https?:\/\//i.test(uri)) return {}
    const response = await fetch(uri, { signal: AbortSignal.timeout(4_000) })
    if (!response.ok) return {}
    const json = await response.json()
    let image = typeof json?.image === 'string' ? json.image : undefined
    if (image?.startsWith('ipfs://')) image = `https://ipfs.io/ipfs/${image.slice('ipfs://'.length)}`
    if (image && /^https?:\/\//i.test(image)) image = resolveNftAssetUrl(image)
    return { name: typeof json?.name === 'string' ? json.name : undefined, image }
  } catch {
    return {}
  }
}
