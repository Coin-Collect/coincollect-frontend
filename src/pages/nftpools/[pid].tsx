import Head from 'next/head'
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
  const { title, description, image, url } = initialMeta

  return (
    <>
      <Head>
        <title key="pool:title">{title}</title>
        <meta key="pool:description" name="description" content={description} />
        <meta key="pool:og:title" property="og:title" content={title} />
        <meta key="pool:og:description" property="og:description" content={description} />
        <meta key="pool:og:image" property="og:image" content={image} />
        <meta key="pool:og:image:secure_url" property="og:image:secure_url" content={image} />
        <meta key="pool:og:url" property="og:url" content={url} />
        <meta key="pool:og:type" property="og:type" content="website" />
        <meta key="pool:twitter:card" name="twitter:card" content="summary_large_image" />
        <meta key="pool:twitter:title" name="twitter:title" content={title} />
        <meta key="pool:twitter:description" name="twitter:description" content={description} />
        <meta key="pool:twitter:image" name="twitter:image" content={image} />
        <link key="pool:canonical" rel="canonical" href={url} />
      </Head>
      <PoolDetailsPage pid={pid} />
    </>
  )
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
