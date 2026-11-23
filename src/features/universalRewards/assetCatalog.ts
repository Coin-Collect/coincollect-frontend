import nftFarms from 'config/constants/nftFarms'
import { mainnetTokens } from 'config/constants/tokens'
import { collectionArtworkForPid } from 'features/nftPoolManager/assets'

const POLYGON = '137'
const ECOSYSTEM_POWER = '10'

// Use the canonical collection addresses already configured for CoinCollect NFT Stake.
const collectionPresets = [
  { pid: 1, name: 'CoinCollect Starter NFT', power: '3' },
  { pid: 2, name: 'CoinCollect Bronze NFT', power: '5' },
  { pid: 3, name: 'CoinCollect Silver NFT', power: '10' },
  { pid: 4, name: 'CoinCollect Gold NFT', power: '15' },
  { pid: 15, name: 'Key 2 Web 3 · KEY', power: '1' },
  { pid: 5, name: 'LotShare Prime NFT' },
  { pid: 11, name: 'BlitzBrawler Player' },
  { pid: 12, name: 'AvatarsAI Heroes' },
  { pid: 14, name: 'BeastHunter' },
  { pid: 16, name: 'NitroClash' },
  { pid: 17, name: 'PlaceDJ 2.0 NFT' },
  { pid: 19, name: 'Zidanogo GentleMals' },
  { pid: 20, name: 'SapienX AI Agents' },
  { pid: 26, name: 'CyberPunk Space Citizenship' },
  { pid: 45, name: 'QuestGalaxy LootBox', image: '/images/poolBanners/nfts/lootbox.webp' },
  { pid: 13, name: 'Galxe OAT' },
  { pid: 21, name: 'Lens Handles' },
  { pid: 22, name: 'Unstoppable Domains' },
  { pid: 23, name: 'Uniswap V3 Positions', image: '/images/games/tokens/uni.png' },
  { pid: 27, name: 'SmartCat Reward' },
  { pid: 30, name: 'The Sandbox LAND' },
  {
    pid: 31,
    name: 'Aavegotchi',
    image: '/images/games/tokens/aave-min.png',
    requiresCompatibility: true,
  },
]

export const studioCollections = collectionPresets.map(({ pid, name, power, image, requiresCompatibility }) => {
  const farm = nftFarms.find((item) => item.pid === pid)
  if (!farm?.nftAddresses[137]) throw new Error(`Missing Polygon NFT collection for pool ${pid}`)
  return {
    address: farm.nftAddresses[137],
    sourceChain: POLYGON,
    name,
    power: power ?? ECOSYSTEM_POWER,
    image: image ?? collectionArtworkForPid(pid),
    requiresCompatibility,
  }
})

export function studioCollection(chain: string | bigint, address: string) {
  if (String(chain) !== POLYGON) return undefined
  return studioCollections.find((collection) => collection.address.toLowerCase() === address.toLowerCase())
}

export const studioTokens = [
  mainnetTokens.collect,
  mainnetTokens.lot,
  mainnetTokens.blitz,
  mainnetTokens.avatar,
  mainnetTokens.hunt,
  mainnetTokens.nitro,
  mainnetTokens.dj,
  mainnetTokens.z,
]

export function studioToken(address: string) {
  return studioTokens.find((token) => token.address.toLowerCase() === address.toLowerCase())
}

export function preferStudioTokens<T extends { address: string }>(tokens: readonly T[]): T[] {
  const byAddress = new Map(tokens.map((token) => [token.address.toLowerCase(), token]))
  const preferred = studioTokens.flatMap(({ address }) => {
    const asset = byAddress.get(address.toLowerCase())
    byAddress.delete(address.toLowerCase())
    return asset ? [asset] : []
  })
  return [...preferred, ...byAddress.values()]
}
