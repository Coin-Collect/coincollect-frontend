import { useRouter } from 'next/router'
import { PublishedPoolDetailsPage } from 'views/NftFarms/PoolDetailsPage'

export default function PublishedNftPoolPage() {
  const { query } = useRouter()
  return <PublishedPoolDetailsPage address={typeof query.address === 'string' ? query.address : undefined} />
}
