import { GetStaticProps } from 'next/types'
import { nftsBaseUrl } from 'views/Nft/market/constants'
import NftMarket from 'views/Nft/market/Home'

const NftMarketPage = () => {
  return <NftMarket />
}

//Page redirected
export const getServerSideProps: GetStaticProps = async () => {
  return {
    redirect: {
      destination: `${nftsBaseUrl}/collections`,
      permanent: true
    }
  }
}

export default NftMarketPage
