import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next'
import { useLayoutEffect } from 'react'
// eslint-disable-next-line camelcase
import { SWRConfig, unstable_serialize } from 'swr'
import CollectionPageRouter from 'views/Nft/market/Collection/CollectionPageRouter'
import { useRouter } from 'next/router'

import PageLoader from 'components/Loader/PageLoader'
import { getCollection } from 'state/nftMarket/helpers'
import { mintingConfig } from 'config/constants'
import { API_NFT } from 'config/constants/endpoints'
import Minting from 'views/Nft/market/Collection/Minting/Minting'
import { DEFAULT_META } from 'config/constants/meta'

const CollectionPage = ({ fallback = {} }: InferGetStaticPropsType<typeof getStaticProps>) => {
  const router = useRouter()

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  if (router.isFallback) {
    return <PageLoader />
  }

  return (
    <SWRConfig
      value={{
        fallback,
      }}
    >
      <Minting/>
    </SWRConfig>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    fallback: true,
    paths: [],
  }
}

type MintCollectionMetaSource = {
  name?: string
  description?: string
  banner?: { large?: string; small?: string }
  avatar?: string
  sampleNftImage?: { image?: string } | null
}

const buildMintPageMeta = (collection: MintCollectionMetaSource | null, address: string) => {
  const name = collection?.name?.trim()
  const description = collection?.description?.trim()
  const bannerLarge = collection?.banner?.large?.trim()
  const bannerSmall = collection?.banner?.small?.trim()
  const avatar = collection?.avatar?.trim()
  const sampleImage = collection?.sampleNftImage?.image?.trim()

  const image = [bannerLarge, bannerSmall, avatar, sampleImage, DEFAULT_META.image].find(Boolean)
  const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL ?? 'https://app.coincollect.org'
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const path = `/nfts/collections/mint/${address.toLowerCase()}`

  return {
    title: name ? `${name} NFT Mint | CoinCollect` : `NFT Mint | CoinCollect`,
    description:
      description && description.length > 160
        ? `${description.slice(0, 157)}...`
        : description || DEFAULT_META.description,
    image,
    url: `${normalizedBaseUrl}${path}`,
  }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const collectionAddress = params?.collectionAddress
  if (typeof collectionAddress !== 'string') {
    return {
      notFound: true,
    }
  }

  try {
    // Try API first
    const collectionData = await getCollectionApi(collectionAddress)

    // Fallback to config-derived minimal data to avoid 404 and allow client SWR to hydrate
    const minting = mintingConfig.find((m) => m.address?.toLowerCase() === collectionAddress.toLowerCase())
    const minimal = minting
      ? {
          address: minting.address,
          name: minting.name,
          description: minting.description ?? '',
          symbol: minting.symbol,
          totalSupply: minting.totalSupply ?? 0,
          maxSupply: minting.totalSupply ?? 0,
          cost: minting.lastPrice ?? 0,
          status: minting.status ?? 'live',
          avatar: minting.avatar,
          banner: { large: minting.banner?.large ?? '', small: minting.banner?.small ?? '' },
          sampleNftImage: minting.sampleNftImage ?? null,
          attributes: [],
        }
      : null

    const resolved = collectionData || minimal || {}
    const meta = buildMintPageMeta(resolved, collectionAddress)

    return {
      props: {
        fallback: {
          [unstable_serialize(['minting', 'collections', collectionAddress.toLowerCase()])]: resolved,
        },
        meta,
      },
      revalidate: 60,
    }
  } catch (error) {
    // On failure, still provide minimal fallback if possible
    const minting = mintingConfig.find((m) => m.address?.toLowerCase() === String(collectionAddress).toLowerCase())
    const minimal = minting
      ? {
          address: minting.address,
          name: minting.name,
          description: minting.description ?? '',
          symbol: minting.symbol,
          totalSupply: minting.totalSupply ?? 0,
          maxSupply: minting.totalSupply ?? 0,
          cost: minting.lastPrice ?? 0,
          status: minting.status ?? 'live',
          avatar: minting.avatar,
          banner: { large: minting.banner?.large ?? '', small: minting.banner?.small ?? '' },
          sampleNftImage: minting?.sampleNftImage ?? null,
          attributes: [],
        }
      : {}
    const meta = buildMintPageMeta(minimal, String(collectionAddress))
    return {
      props: {
        fallback: {
          [unstable_serialize(['minting', 'collections', String(collectionAddress).toLowerCase()])]: minimal,
        },
        meta,
      },
      revalidate: 60,
    }
  }
}

export default CollectionPage

export const getCollectionApi = async (collectionAddress: string): Promise<any> => {
  const res = await fetch(`${API_NFT}/collections/${collectionAddress}`)
  if (res.ok) {
    const json = await res.json()
    return json.data
  }
  console.error(`API: Failed to fetch NFT collection ${collectionAddress}`, res.statusText)
  return null
}
