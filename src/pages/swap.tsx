import { GetStaticProps } from 'next/types'
import Swap from '../views/Swap'

const SwapPage = () => {
  return <Swap />
}

//Page disabled
export const getStaticProps: GetStaticProps = async () => {
  return {
    notFound: true,
  }
}

export default SwapPage
