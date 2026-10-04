import type { PublicV2Pool } from '../publication'
import FarmCard from 'views/NftFarms/components/FarmCard/FarmCard'

/** Same FarmCard entry point; only the address-native data/transaction adapter differs. */
export default function PublicNftPoolCard({ pool, error }: { pool: PublicV2Pool; error?: string }) {
  return <FarmCard publishedPool={pool} error={error} />
}
