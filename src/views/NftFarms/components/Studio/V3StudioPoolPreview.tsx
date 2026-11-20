import type { V3StudioPreviewProps } from 'features/universalRewards/V3StudioPool'
import V3FarmCard from '../FarmCard/V3FarmCard'

export default function V3StudioPoolPreview({ pool, deployment }: V3StudioPreviewProps) {
  return (
    <section aria-label="FarmCard preview">
      <V3FarmCard pool={pool} deployment={deployment} preview />
    </section>
  )
}
