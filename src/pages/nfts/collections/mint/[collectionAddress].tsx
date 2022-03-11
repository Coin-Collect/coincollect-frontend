import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next'
// eslint-disable-next-line camelcase
import { SWRConfig, unstable_serialize } from 'swr'
import CollectionPageRouter from 'views/Nft/market/Collection/CollectionPageRouter'
import { useRouter } from 'next/router'
import Collections from './CollectionPage'
import PageLoader from 'components/Loader/PageLoader'
import { getCollection } from 'state/nftMarket/helpers'
import { API_NFT } from 'config/constants/endpoints'

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
      <Collections/>
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
  const res = await fetch(`${API_NFT}/collections/0x0D464bDde2301C30871bB4C29bB7DD935f5a985C`)
  if (res.ok) {
    const json = await res.json()
    return json.data
  }
  console.error(`API: Failed to fetch NFT collection ${collectionAddress}`, res.statusText)
  return null
}


