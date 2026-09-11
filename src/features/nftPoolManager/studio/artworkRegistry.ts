export interface PoolArtworkOption {
  id: string
  label: string
  src: string
  category: 'Pool banners' | 'Partner artwork' | 'NFT artwork'
}

/** Curated from artwork already shipped by the frontend. No upload backend is assumed. */
export const poolArtworkRegistry: PoolArtworkOption[] = [
  { id: 'pool-54', label: 'Neon orbit', src: '/images/poolBanners/54.webp', category: 'Pool banners' },
  { id: 'pool-15', label: 'Golden glow', src: '/images/poolBanners/15.webp', category: 'Pool banners' },
  { id: 'pool-42', label: 'Electric blue', src: '/images/poolBanners/42.webp', category: 'Pool banners' },
  { id: 'pool-39', label: 'Purple circuit', src: '/images/poolBanners/39.webp', category: 'Pool banners' },
  { id: 'pool-5', label: 'Pixel night', src: '/images/poolBanners/5.webp', category: 'Pool banners' },
  { id: 'pool-58', label: 'Cosmic pink', src: '/images/poolBanners/58.webp', category: 'Pool banners' },
  { id: 'partner-1', label: 'Partner one', src: '/images/poolBanners/partners/1.webp', category: 'Partner artwork' },
  { id: 'partner-3', label: 'Partner three', src: '/images/poolBanners/partners/3.webp', category: 'Partner artwork' },
  { id: 'partner-8', label: 'Partner eight', src: '/images/poolBanners/partners/8.webp', category: 'Partner artwork' },
  { id: 'nft-key', label: 'Key NFT', src: '/images/poolBanners/nfts/key.webp', category: 'NFT artwork' },
  {
    id: 'nft-cyberpunk',
    label: 'Cyberpunk NFT',
    src: '/images/poolBanners/nfts/cyberpunk.webp',
    category: 'NFT artwork',
  },
  { id: 'nft-lootbox', label: 'Lootbox NFT', src: '/images/poolBanners/nfts/lootbox.webp', category: 'NFT artwork' },
]
