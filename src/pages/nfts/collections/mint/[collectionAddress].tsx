import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next'
// eslint-disable-next-line camelcase
import { SWRConfig, unstable_serialize } from 'swr'
import CollectionPageRouter from 'views/Nft/market/Collection/CollectionPageRouter'
import { useRouter } from 'next/router'

import PageLoader from 'components/Loader/PageLoader'
import { getCollection } from 'state/nftMarket/helpers'
import { mintingConfig } from 'config/constants'
import { API_NFT } from 'config/constants/endpoints'
import Minting from 'views/Nft/market/Collection/Minting/Minting'

const CollectionPage = ({ fallback = {} }: InferGetStaticPropsType<typeof getStaticProps>) => {
  const router = useRouter()
  
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

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { collectionAddress } = params
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
          attributes: [],
        }
      : null

    const resolved = collectionData || minimal || {}

    return {
      props: {
        fallback: {
          [unstable_serialize(['minting', 'collections', collectionAddress.toLowerCase()])]: resolved,
        },
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
          attributes: [],
        }
      : {}
    return {
      props: {
        fallback: {
          [unstable_serialize(['minting', 'collections', String(collectionAddress).toLowerCase()])]: minimal,
        },
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

