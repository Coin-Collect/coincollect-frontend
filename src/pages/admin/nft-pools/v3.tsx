import ConnectWalletButton from 'components/ConnectWalletButton'
import V3Studio from 'features/universalRewards/V3Studio'
import V3FarmCardStudio from 'views/NftFarms/components/Studio/V3FarmCardStudio'

import V3StudioPoolPreview from 'views/NftFarms/components/Studio/V3StudioPoolPreview'

export default function UniversalRewardsStudioPage() {
  return <V3Studio connect={<ConnectWalletButton />} Composer={V3FarmCardStudio} Preview={V3StudioPoolPreview} />
}
