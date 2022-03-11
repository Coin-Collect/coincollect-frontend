import { GetStaticProps } from 'next/types'
import Liquidity from '../views/Pool'

//Page disabled
export const getStaticProps: GetStaticProps = async () => {
    return {
      notFound: true,
    }
}

export default Liquidity
