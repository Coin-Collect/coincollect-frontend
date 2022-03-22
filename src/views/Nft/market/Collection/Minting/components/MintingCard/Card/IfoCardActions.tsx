import { useTranslation } from 'contexts/Localization'
import { Button } from '@pancakeswap/uikit'
import { useWeb3React } from '@web3-react/core'
import { NextLinkFromReactRouter } from 'components/NextLink'
import { Ifo, Minting, PoolIds } from 'config/constants/types'
import { WalletIfoData, PublicIfoData } from 'views/Nft/market/Collection/Minting/types'
import { nftsBaseUrl } from 'views/Nft/market/constants'
import ConnectWalletButton from 'components/ConnectWalletButton'
import ContributeButton from './ContributeButton'
import ClaimButton from './ClaimButton'
import { SkeletonCardActions } from './Skeletons'
import { EnableStatus } from '../types'

interface Props {
  poolId: PoolIds
  ifo: Minting
  publicIfoData: PublicIfoData
  walletIfoData: WalletIfoData
  hasProfile: boolean
  isLoading: boolean
  isEligible: boolean
  enableStatus: EnableStatus
}

const IfoCardActions: React.FC<Props> = ({
  poolId,
  ifo,
  publicIfoData,
  walletIfoData,
  hasProfile,
  isLoading,
  isEligible,
  enableStatus,
}) => {
  const { t } = useTranslation()
  const { account } = useWeb3React()
  const userPoolCharacteristics = walletIfoData[poolId]

  if (isLoading) {
    return <SkeletonCardActions />
  }

  if (!account) {
    return <ConnectWalletButton width="100%" />
  }


  return <ClaimButton poolId={poolId} ifoVersion={ifo.version} walletIfoData={walletIfoData} />
  

}

export default IfoCardActions
