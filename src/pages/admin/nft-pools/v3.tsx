import ConnectWalletButton from 'components/ConnectWalletButton'
import V3Studio from 'features/universalRewards/V3Studio'

export default function UniversalRewardsStudioPage() {
  return <V3Studio connect={<ConnectWalletButton />} />
}
