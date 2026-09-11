import type { NftCollection, NftPool, NftPoolDraft } from './types'

export const NFT_COLLECTION_PLACEHOLDER = '/images/nfts/no-profile-md2.png'

const legacyAssetAliases: Record<string, string> = {
  'https://coincollect.org/assets/images/clone/banner-lg.png': '/images/coincollect-assets/clone/banner-lg.png',
  'https://coincollect.org/assets/images/clone/banners/bannerBronzeSm.png':
    '/images/coincollect-assets/clone/banners/bannerBronzeSm.png',
  'https://coincollect.org/assets/images/clone/banners/bannerGoldSm.png':
    '/images/coincollect-assets/clone/banners/bannerGoldSm.png',
  'https://coincollect.org/assets/images/clone/banners/bannerLotSm.png':
    '/images/coincollect-assets/clone/banners/bannerLotSm.png',
  'https://coincollect.org/assets/images/clone/banners/bannerSilverSm.png':
    '/images/coincollect-assets/clone/banners/bannerSilverSm.png',
  'https://coincollect.org/assets/images/clone/banners/profileBronze.png':
    '/images/coincollect-assets/clone/banners/profileBronze.png',
  'https://coincollect.org/assets/images/clone/banners/profileGold.png':
    '/images/coincollect-assets/clone/banners/profileGold.png',
  'https://coincollect.org/assets/images/clone/banners/profileLot.png': '/images/collections/lotshare/lslogo.webp',
  'https://coincollect.org/assets/images/clone/banners/profileSilver.png':
    '/images/coincollect-assets/clone/banners/profileSilver.png',
  'https://coincollect.org/assets/images/clone/nft350.png': '/images/coincollect-assets/clone/nft350.png',
  'https://coincollect.org/assets/images/collections/banners/cyberpunk.jpg':
    '/images/coincollect-assets/partners/cyberpunk/bannerLg-min.png',
  'https://coincollect.org/assets/images/collections/banners/lens.jpg': '/images/home/collections/lens.jpg',
  'https://coincollect.org/assets/images/collections/banners/sandbox.jpg': '/images/home/collections/sandbox.jpg',
  'https://coincollect.org/assets/images/collections/banners/smartcats.jpg': '/images/home/collections/smartcat.jpg',
  'https://coincollect.org/assets/images/collections/banners/udomains.jpg': '/images/home/collections/udomains.jpg',
  'https://coincollect.org/assets/images/collections/logos/lens.jpg': '/images/home/collections/lens.jpg',
  'https://coincollect.org/assets/images/collections/logos/sandbox.jpg': '/images/home/collections/sandbox.jpg',
  'https://coincollect.org/assets/images/collections/logos/smartcat.jpg': '/images/home/collections/smartcat.jpg',
  'https://coincollect.org/assets/images/collections/logos/udomains.jpg': '/images/home/collections/udomains.jpg',
  'https://coincollect.org/assets/images/partners/galxe/GalxeClaim.png':
    '/images/coincollect-assets/claim/GalxeClaim.webp',
  'https://coincollect.org/assets/images/partners/galxe/galxeOATstake.png': '/images/home/collections/galxe.jpg',
  'https://coincollect.org/assets/images/partners/galxe/oatLogo128.png':
    '/images/coincollect-assets/claim/GalxeClaim.webp',
  'https://coincollect.org/assets/images/partners/key/key128.jpg': '/images/poolBanners/nfts/key.webp',
  'https://coincollect.org/assets/images/partners/key/keyBanner.gif': '/images/poolBanners/nfts/key.webp',
  'https://coincollect.org/assets/images/partners/taskon/taskON.gif':
    '/images/coincollect-assets/claim/taskonclaim.webp',
  'https://coincollect.org/assets/images/partners/taskon/taskon256.png':
    '/images/coincollect-assets/claim/taskonclaim.webp',
  'https://coincollect.org/assets/images/showcase/250logo.png': '/images/coincollect-assets/clone/nft350.png',
  'https://coincollect.org/assets/images/showcase/shibBronze.png':
    '/images/coincollect-assets/clone/banners/bannerBronzeSm.png',
  'https://coincollect.org/assets/images/showcase/shibGold.png':
    '/images/coincollect-assets/clone/banners/bannerGoldSm.png',
  'https://coincollect.org/assets/images/showcase/shibSilver.png':
    '/images/coincollect-assets/clone/banners/bannerSilverSm.png',
  'https://coincollect.org/assets/images/showcase/shibStarter.png': '/images/coincollect-assets/clone/banner-lg.png',
  'https://coincollect.org/assets/images/showcase/tetherPool.png': '/images/poolBanners/54.webp',
}

const collectionArtworkByPid: Record<number, string> = {
  1: '/images/coincollect-assets/clone/nft350.png',
  2: '/images/coincollect-assets/clone/banners/profileBronze.png',
  3: '/images/coincollect-assets/clone/banners/profileSilver.png',
  4: '/images/coincollect-assets/clone/banners/profileGold.png',
  5: '/images/collections/lotshare/lslogo.webp',
  6: '/images/coincollect-assets/clone/nft350.png',
  7: '/images/coincollect-assets/clone/banners/profileBronze.png',
  8: '/images/coincollect-assets/clone/banners/profileSilver.png',
  9: '/images/coincollect-assets/clone/banners/profileGold.png',
  10: '/images/coincollect-assets/clone/nft350.png',
  11: '/images/collections/blitz/blitzLogo.png',
  12: '/images/collections/avatar/avlogo.png',
  13: '/images/coincollect-assets/claim/GalxeClaim.webp',
  14: '/images/collections/beasthunter/bhlogo.webp',
  15: '/images/poolBanners/nfts/key.webp',
  16: '/images/collections/nitro/nilogo.jpeg',
  17: '/images/collections/placedj/pllogo.png',
  18: '/images/coincollect-assets/claim/taskonclaim.webp',
  19: '/images/collections/zidanogo/zilogo.png',
  20: '/images/collections/sapienx/sxlogo.gif',
  21: '/images/home/collections/lens.jpg',
  22: '/images/home/collections/udomains.jpg',
  23: '/images/home/collections/unicorns.jpg',
  24: '/images/poolBanners/nfts/key.webp',
  25: '/images/home/collections/unicorns.jpg',
  26: '/images/poolBanners/nfts/cyberpunk.webp',
  27: '/images/home/collections/smartcat.jpg',
  28: '/images/collections/lotshare/lslogo.webp',
  29: '/images/home/collections/unicorns.jpg',
  30: '/images/home/collections/sandbox.jpg',
  31: '/images/home/collections/unicorns.jpg',
}

const poolArtworkByPid: Record<number, string> = {
  1: '/images/coincollect-assets/clone/banner-lg.png',
  2: '/images/coincollect-assets/clone/banners/bannerBronzeSm.png',
  3: '/images/coincollect-assets/clone/banners/bannerSilverSm.png',
  4: '/images/coincollect-assets/clone/banners/bannerGoldSm.png',
  5: '/images/coincollect-assets/clone/banners/bannerLotSm.png',
  6: '/images/poolBanners/54.webp',
  7: '/images/poolBanners/15.webp',
  8: '/images/poolBanners/42.webp',
  9: '/images/poolBanners/39.webp',
  10: '/images/poolBanners/5.webp',
  11: '/images/coincollect-assets/partners/blitz/blitzBannerLg.png',
  12: '/images/coincollect-assets/partners/avatar/avatarBannerLg.png',
  13: '/images/home/collections/galxe.jpg',
  14: '/images/coincollect-assets/partners/BeastHunter/hunterBannerLg.png',
  15: '/images/poolBanners/nfts/key.webp',
  16: '/images/coincollect-assets/partners/NitroClash/nitroBannerLg.jpg',
  17: '/images/coincollect-assets/partners/placedj/placedjBannerMin.png',
  18: '/images/coincollect-assets/claim/taskonclaim.webp',
  19: '/images/coincollect-assets/partners/zidanogo/zidanogoBannerLg-min.png',
  20: '/images/coincollect-assets/partners/sapienx/sapienBannerSm-min.png',
  21: '/images/home/collections/lens.jpg',
  22: '/images/home/collections/udomains.jpg',
  23: '/images/poolBanners/54.webp',
  24: '/images/poolBanners/15.webp',
  25: '/images/poolBanners/42.webp',
  26: '/images/coincollect-assets/partners/cyberpunk/bannerLg-min.png',
  27: '/images/home/collections/smartcat.jpg',
  28: '/images/coincollect-assets/clone/banners/bannerLotSm.png',
  29: '/images/poolBanners/39.webp',
  30: '/images/home/collections/sandbox.jpg',
  31: '/images/poolBanners/5.webp',
}

function unique(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

export function resolveNftAssetUrl(source?: string): string | undefined {
  const value = source?.trim()
  if (!value) return undefined
  return legacyAssetAliases[value] || value
}

export function collectionImageCandidates(collection: Pick<NftCollection, 'image' | 'knownPid'>): string[] {
  return unique([
    collection.knownPid ? collectionArtworkByPid[collection.knownPid] : undefined,
    resolveNftAssetUrl(collection.image),
    NFT_COLLECTION_PLACEHOLDER,
  ])
}

export function poolArtworkCandidates(pool: Pick<NftPool, 'pid' | 'metadata'>): string[] {
  return unique([
    pool.pid ? poolArtworkByPid[pool.pid] : undefined,
    resolveNftAssetUrl(pool.metadata.banner),
    resolveNftAssetUrl(pool.metadata.avatar),
  ])
}

export function draftArtworkCandidates(draft: Pick<NftPoolDraft, 'banner' | 'avatar'>): string[] {
  return unique([resolveNftAssetUrl(draft.banner), resolveNftAssetUrl(draft.avatar)])
}

export function collectionArtworkForPid(pid?: number): string | undefined {
  return pid ? collectionArtworkByPid[pid] : undefined
}
