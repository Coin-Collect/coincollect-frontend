import { GetStaticProps } from 'next/types'
import NftMarket from 'views/Nft/market/Home'

const NftMarketPage = () => {
  return <NftMarket />
}

//Page disabled
export const getStaticProps: GetStaticProps = async () => {
  return {
    notFound: true,
  }
}

export default NftMarketPage
