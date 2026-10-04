import { getImageProps } from 'next/image'
import { isRemoteNftImageSource } from './nftFallback'

describe('remote NFT artwork', () => {
  it('bypasses the Next.js image optimizer for public custom banner hosts', () => {
    const banner = 'https://images.example.org/custom-pool-banner.webp'
    const props = getImageProps({
      src: banner,
      alt: 'Pool banner',
      width: 550,
      height: 220,
      unoptimized: isRemoteNftImageSource(banner),
    })

    expect(isRemoteNftImageSource(banner)).toBe(true)
    expect(props.props.src).toBe(banner)
    expect(isRemoteNftImageSource('/images/poolBanners/54.webp')).toBe(false)
  })
})
