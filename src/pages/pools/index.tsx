import { GetStaticProps } from 'next/types'
import Pools from 'views/Pools'

//Page disabled
export const getStaticProps: GetStaticProps = async () => {
    return {
      notFound: true,
    }
  }

export default Pools
