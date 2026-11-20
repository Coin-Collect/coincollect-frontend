import { useRouter } from 'next/router'
import V3FarmCard from 'views/NftFarms/components/FarmCard/V3FarmCard'
import { UINT256_MAX } from 'features/universalRewards/units'
import V3PoolDetail from 'features/universalRewards/V3PoolDetail'
import { V3Page, V3Muted } from 'features/universalRewards/styles'

export default function UniversalRewardPoolPage() {
  const { isReady, query } = useRouter()
  if (!isReady) return null
  if (typeof query.poolId !== 'string' || !/^[1-9]\d{0,77}$/.test(query.poolId) || BigInt(query.poolId) > UINT256_MAX) {
    return (
      <V3Page>
        <V3Muted role="status">Enter a valid V3 pool number.</V3Muted>
      </V3Page>
    )
  }
  return <V3PoolDetail key={query.poolId} poolId={BigInt(query.poolId)} Card={V3FarmCard} />
}
