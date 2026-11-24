import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { V3FarmCardGrid } from 'views/NftFarms/components/FarmCard/V3FarmCard'
import V3Catalogue from 'features/universalRewards/V3Catalogue'
import { getV3Deployment, type V3Deployment } from 'features/universalRewards/runtime'
import { V3Page } from 'features/universalRewards/styles'

export const getServerSideProps: GetServerSideProps<{ deployment: V3Deployment | null }> = async ({ query }) => {
  const deployment = getV3Deployment(query.deployment)
  return query.deployment !== undefined && !deployment ? { notFound: true } : { props: { deployment: deployment ?? null } }
}

export default function UniversalRewardsPage({ deployment }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <V3Page>
      <V3Catalogue key={deployment?.address} Cards={V3FarmCardGrid} selectedDeployment={deployment ?? undefined} />
    </V3Page>
  )
}
