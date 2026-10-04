import type { PublicV2Pool } from '../publication'
import { PublishedNftPoolFarmCard } from 'views/NftFarms/components/FarmCard/FarmCard'

/** Address-native V2 pools use the existing public NFT farm card presentation without legacy staking actions. */
export default function PublicNftPoolCard({ pool, error }: { pool: PublicV2Pool; error?: string }) {
  return <PublishedNftPoolFarmCard pool={pool} error={error} />
}
