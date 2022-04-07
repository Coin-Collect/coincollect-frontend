import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next'
// eslint-disable-next-line camelcase
import { SWRConfig, unstable_serialize } from 'swr'
import CollectionPageRouter from 'views/Nft/market/Collection/CollectionPageRouter'
import { useRouter } from 'next/router'

import PageLoader from 'components/Loader/PageLoader'
import { getCollection } from 'state/nftMarket/helpers'
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
    const collectionData = await getCollectionApi(collectionAddress)
    

    if (collectionData) {
      return {
        props: {
          fallback: {
            [unstable_serialize(['minting', 'collections', collectionAddress.toLowerCase()])]: { ...collectionData },
          },
        },
        revalidate: 60, // 6 hours
      }
    }
    return {
      notFound: true,
      revalidate: 60,
    }
  } catch (error) {
    return {
      notFound: true,
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


