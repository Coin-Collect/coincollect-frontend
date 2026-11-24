import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { light } from '@pancakeswap/uikit'
import { ThemeProvider } from 'styled-components'
import { isLocalForkMode } from 'config/localFork'
import V3PoolDetail from 'features/universalRewards/V3PoolDetail'
import { PoolShowroomCover, PoolShowroomDiscover } from 'features/universalRewards/V3PoolShowroom'
import { parseV3PoolId } from 'features/universalRewards/poolPresentation'
import { poolShowroomArtwork, type V3PoolShowroomData, type V3PoolTeaser } from 'features/universalRewards/poolShowroom'
import { readV3PoolShowroom } from 'features/universalRewards/poolShowroom.server'
import { Showroom } from 'features/universalRewards/poolShowroomStyles'
import { getV3Deployment, v3DeploymentPath, type V3Deployment } from 'features/universalRewards/runtime'
import V3FarmCard from 'views/NftFarms/components/FarmCard/V3FarmCard'

interface PoolPageProps {
  poolId: string
  deployment: V3Deployment
  initialPool: V3PoolShowroomData | null
  related: V3PoolTeaser[]
  initialMeta: { title: string; description: string; image: string; url: string; robots: string }
}

export const getServerSideProps: GetServerSideProps<PoolPageProps> = async ({ params, query, req, res }) => {
  const poolId = parseV3PoolId(params?.poolId)
  const deployment = getV3Deployment(query.deployment)
  if (!poolId || !deployment) return { notFound: true }

  const host = req.headers.host ?? ''
  const base =
    isLocalForkMode && /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host)
      ? `http://${host}`
      : process.env.NEXT_PUBLIC_APP_BASE_URL || 'https://app.coincollect.org'
  const url = new URL(v3DeploymentPath(`/nftpools/v3/${poolId}`, deployment), base).href
  const props = (initialPool: V3PoolShowroomData | null, related: V3PoolTeaser[]): PoolPageProps => ({
    poolId: poolId.toString(),
    deployment,
    initialPool,
    related,
    initialMeta: {
      title: initialPool ? `${initialPool.name} | CoinCollect` : 'NFT rewards pool | CoinCollect',
      description:
        initialPool?.description.replace(/\s+/g, ' ').trim() ||
        (initialPool
          ? `Explore ${initialPool.name} on CoinCollect. See eligible NFT collections, ${initialPool.rewards
              .map(({ symbol }) => symbol)
              .join(', ')} rewards and pool dates.`
          : 'Discover eligible NFT collections, pool rewards and how to participate on CoinCollect.'),
      image: new URL(initialPool?.artwork ?? poolShowroomArtwork, base).href,
      url,
      robots: isLocalForkMode || !initialPool ? 'noindex, nofollow' : 'index, follow',
    },
  })

  try {
    const showroom = await readV3PoolShowroom(deployment, poolId)
    if (!showroom) return { notFound: true }
    res.setHeader('Cache-Control', isLocalForkMode ? 'no-store' : 'public, s-maxage=30, stale-while-revalidate=60')
    return { props: props(showroom.pool, showroom.related) }
  } catch {
    res.statusCode = 503
    res.setHeader('Cache-Control', 'no-store')
    return { props: props(null, []) }
  }
}

function UniversalRewardPoolPage({
  poolId,
  deployment,
  initialPool,
  related,
  initialMeta,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <V3PoolDetail
      key={`${deployment.address}:${poolId}`}
      poolId={BigInt(poolId)}
      deployment={deployment}
      initialPool={initialPool}
      related={related}
      shareUrl={initialMeta.url}
      Card={V3FarmCard}
    />
  )
}

// Public content is available in the first HTML response. Wallet and saved settings hydrate through the app gate.
UniversalRewardPoolPage.PublicFallback = function PoolShowroomFallback({ initialPool, related, initialMeta, deployment }: PoolPageProps) {
  return (
    <ThemeProvider theme={light}>
      <Showroom>
        {initialPool && (
          <PoolShowroomCover pool={initialPool} url={initialMeta.url} hasCardHeading={false} interactive={false} />
        )}
        <PoolShowroomDiscover related={related} deployment={deployment} />
      </Showroom>
    </ThemeProvider>
  )
}

export default UniversalRewardPoolPage
