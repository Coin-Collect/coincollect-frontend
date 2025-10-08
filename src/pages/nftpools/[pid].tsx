import { GetStaticPaths, GetStaticProps, NextPage } from 'next'
import nftFarmsConfig from 'config/constants/nftFarms'
import PoolDetailsPage from 'views/NftFarms/PoolDetailsPage'

interface PoolPageProps {
  pid: number
  initialMeta: {
    title: string
    description: string
    image: string
    url: string
  }
}

const NftPoolSoloPage: NextPage<PoolPageProps> = ({ pid, initialMeta }) => {
  return <PoolDetailsPage pid={pid} initialMeta={initialMeta} />
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

  const selectedConfig = nftFarmsConfig.find((farm) => farm.pid === pid)
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL ?? 'https://app.coincollect.org'
  const normalizeImage = (image?: string) => {
    if (!image) {
      return 'https://coincollect.org/assets/images/clone/ogbanner.png'
    }
    if (image.startsWith('http')) {
      return image
    }
    const base = appBaseUrl.endsWith('/') ? appBaseUrl.slice(0, -1) : appBaseUrl
    const path = image.startsWith('/') ? image : `/${image}`
    return `${base}${path}`
  }

  const shareTitle = selectedConfig?.lpSymbol ? `${selectedConfig.lpSymbol} | CoinCollect` : 'CoinCollect NFT Pool'
  const displayName = selectedConfig?.lpSymbol?.replace('CoinCollect', '').trim() || 'this collection'
  const shareDescription = `Stake ${displayName} NFTs on CoinCollect to earn rewards and perks.`
  const shareImage = normalizeImage(selectedConfig?.banner)
  const normalisedBaseUrl = appBaseUrl.endsWith('/') ? appBaseUrl.slice(0, -1) : appBaseUrl
  const shareUrl = `${normalisedBaseUrl}/nftpools/${pid}`

  return {
    props: {
      pid,
      initialMeta: {
        title: shareTitle,
        description: shareDescription,
        image: shareImage,
        url: shareUrl,
      },
    },
  }
}

export default NftPoolSoloPage
