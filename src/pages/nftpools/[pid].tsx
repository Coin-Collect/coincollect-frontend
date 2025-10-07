import { GetStaticPaths, GetStaticProps, NextPage } from 'next'
import nftFarmsConfig from 'config/constants/nftFarms'
import PoolDetailsPage from 'views/NftFarms/PoolDetailsPage'

interface PoolPageProps {
  pid: number
}

const NftPoolSoloPage: NextPage<PoolPageProps> = ({ pid }) => {
  return <PoolDetailsPage pid={pid} />
}

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = nftFarmsConfig.map((farm) => ({
    params: { pid: farm.pid.toString() },
  }))

  return {
    paths,
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps<PoolPageProps> = async ({ params }) => {
  const pidParam = params?.pid
  const pid = Number(pidParam)

  if (!Number.isFinite(pid)) {
    return {
      notFound: true,
    }
  }

  const farmExists = nftFarmsConfig.some((farm) => farm.pid === pid)

  if (!farmExists) {
    return {
      notFound: true,
    }
  }

  return {
    props: {
      pid,
    },
  }
}

export default NftPoolSoloPage
