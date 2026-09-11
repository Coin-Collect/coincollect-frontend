import {
  collectionImageCandidates,
  poolArtworkCandidates,
  resolveNftAssetUrl,
  NFT_COLLECTION_PLACEHOLDER,
} from '../assets'

describe('NFT pool asset fallbacks', () => {
  it('resolves retired hosted artwork to the bundled local asset', () => {
    expect(resolveNftAssetUrl('https://coincollect.org/assets/images/clone/nft350.png')).toBe(
      '/images/coincollect-assets/clone/nft350.png',
    )
  })

  it('prefers the known collection artwork and always ends with a safe placeholder', () => {
    const candidates = collectionImageCandidates({
      knownPid: 2,
      image: 'https://coincollect.org/assets/images/clone/banners/profileBronze.png',
    })

    expect(candidates[0]).toBe('/images/coincollect-assets/clone/banners/profileBronze.png')
    expect(candidates[candidates.length - 1]).toBe(NFT_COLLECTION_PLACEHOLDER)
  })

  it('prefers bundled pool artwork for configured pool ids', () => {
    expect(
      poolArtworkCandidates({
        pid: 11,
        metadata: { name: 'Brawler NFT', banner: 'https://example.com/missing-banner.png' },
      })[0],
    ).toBe('/images/coincollect-assets/partners/blitz/blitzBannerLg.png')
  })
})
