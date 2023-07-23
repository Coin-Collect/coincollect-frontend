import BigNumber from 'bignumber.js'
import {
  Text,
  Flex,
  Box,
  CheckmarkCircleIcon,
  FlexProps,
  HelpIcon,
  useTooltip,
  Button,
  AutoRenewIcon,
  BunnyPlaceholderIcon,
  Message,
  MessageText,
  useModal,
  Link,
  ErrorIcon,
} from '@pancakeswap/uikit'
import styled from 'styled-components'
import { useWeb3React } from '@web3-react/core'
import { Token } from '@coincollect/sdk'
import { Ifo, Minting, PoolIds } from 'config/constants/types'
import tokens from 'config/constants/tokens'
// TODO: fix this
//@ts-ignore
import { cakeBnbLpToken } from 'config/constants/ifo'
import { PublicIfoData, WalletIfoData } from 'views/Nft/market/Collection/Minting/types'
import { useTranslation } from 'contexts/Localization'
import { getBalanceNumber } from 'utils/formatBalance'
import { TokenImage, TokenPairImage } from 'components/TokenImage'
import VaultStakeModal from 'views/Pools/components/CakeVaultCard/VaultStakeModal'
import { useIfoPoolVault, useIfoPoolCredit, useIfoWithApr } from 'state/pools/hooks'
import { BIG_ZERO } from 'utils/bigNumber'
import { EnableStatus } from '../types'
import PercentageOfTotal from './PercentageOfTotal'
import { SkeletonCardTokens } from './Skeletons'
import IFORequirements from './IFORequirements'
import NFTMedia from 'views/Nft/market/components/NFTMedia'
import PreviewImage from 'views/Nft/market/components/CollectibleCard/PreviewImage'

interface TokenSectionProps extends FlexProps {
  primaryToken?: Token
  secondaryToken?: Token
}

const TokenSection: React.FC<TokenSectionProps> = ({ primaryToken, secondaryToken, children, ...props }) => {
  const renderTokenComponent = () => {
    if (!primaryToken) {
      return <BunnyPlaceholderIcon width={32} mr="16px" />
    }

    if (primaryToken && secondaryToken) {
      return (
        <TokenPairImage
          variant="inverted"
          primaryToken={primaryToken}
          height={32}
          width={32}
          secondaryToken={secondaryToken}
          mr="16px"
        />
      )
    }

    return <TokenImage token={primaryToken} height={32} width={32} mr="16px" />
  }

  return (
    <Flex {...props}>
      {renderTokenComponent()}
      <div>{children}</div>
    </Flex>
  )
}

const CommitTokenSection: React.FC<TokenSectionProps & { commitToken: Token }> = ({ commitToken, ...props }) => {
  if (commitToken.equals(cakeBnbLpToken)) {
    return <TokenSection primaryToken={tokens.cake} secondaryToken={tokens.wbnb} {...props} />
  }
  return <TokenSection primaryToken={commitToken} {...props} />
}

const Label = (props) => <Text bold fontSize="12px" color="secondary" textTransform="uppercase" {...props} />

const Value = (props) => <Text bold fontSize="20px" style={{ wordBreak: 'break-all' }} {...props} />

interface IfoCardTokensProps {
  poolId: PoolIds
  ifo: Minting
  publicIfoData: PublicIfoData
  walletIfoData: WalletIfoData
  hasProfile: boolean
  isLoading: boolean
  onApprove: () => Promise<any>
  enableStatus: EnableStatus
  criterias?: any
  isEligible?: boolean
}

const OnSaleInfo = ({ token, saleAmount, distributionRatio }) => {
  const { t } = useTranslation()
  return (
    <TokenSection primaryToken={token}>
      <Flex flexDirection="column">
        {/*<Label>{t('On sale').toUpperCase()}</Label>*/}
        <Value>{saleAmount}</Value>
        <Text fontSize="14px" color="textSubtle">
          {t('%ratio% NFT minted', { ratio: distributionRatio })}
        </Text>
      </Flex>
    </TokenSection>
  )
}

const MessageTextLink = styled(Link)`
  display: inline;
  text-decoration: underline;
  font-weight: bold;
  font-size: 14px;
  white-space: nowrap;
`

const IfoCardTokens: React.FC<IfoCardTokensProps> = ({
  criterias,
  isEligible,
  poolId,
  ifo,
  publicIfoData,
  walletIfoData,
  hasProfile,
  isLoading,
  onApprove,
  enableStatus,
}) => {
  const { account } = useWeb3React()
  const { t } = useTranslation()
  const { targetRef, tooltip, tooltipVisible } = useTooltip(
    t(
      'Sorry, you didn’t contribute enough CAKE to meet the minimum threshold. You didn’t buy anything in this sale, but you can still reclaim your CAKE.',
    ),
    { placement: 'bottom' },
  )
  
  const { isHolder, discountAmount, } = walletIfoData
  const { holderDiscountPercentage } = publicIfoData
  const publicPoolCharacteristics = publicIfoData[poolId]
  const { totalSupply } = publicIfoData
  const userPoolCharacteristics = walletIfoData[poolId]

  const { currency, token, version } = ifo
  const { hasClaimed } = userPoolCharacteristics
  const distributionRatio = ifo[poolId].distributionRatio * 100

  const ifoPoolVault = useIfoPoolVault()
  const { pool } = useIfoWithApr()
  const credit = useIfoPoolCredit()

  const stakingTokenBalance = pool?.userData?.stakingTokenBalance
    ? new BigNumber(pool.userData.stakingTokenBalance)
    : BIG_ZERO

  const [onPresentStake] = useModal(
    <VaultStakeModal
      stakingMax={stakingTokenBalance}
      performanceFee={ifoPoolVault.fees.performanceFeeAsDecimal}
      pool={pool}
    />,
  )

  let { showCase, address, name, openSeaUrl } = ifo
  const nfts = showCase ? showCase.map((item, index) => ({ 'tokenId': item.tokenId, 'collectionAddress': address, 'name': `#${item.tokenId}`, 'collectionName': name, 'image': { 'thumbnail': item.image } })) : [];
  const nft = nfts[0]

  const renderTokenSection = () => {
    if (isLoading) {
      return <SkeletonCardTokens />
    }
   
      return (
        <>
          <OnSaleInfo token={token} distributionRatio={totalSupply} saleAmount={ifo[poolId].saleAmount} />

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <NFTMedia style={{ backgroundPosition: "center" }} as={PreviewImage} nft={nft} height={200} width={200} mt="10px" borderRadius="8px" />
          </div>

          <Box mt="16px">

          {(account && !isHolder && version == 3.1) && (
            <Message my="24px" p="8px" variant="warning">
            <Box>
            <MessageText display="inline">
            {t(`You don't have any CoinCollect NFT, NFT holders get %${holderDiscountPercentage} discount and doesn't have to wait for the countdown.`)}
              </MessageText>{' '}
              <MessageTextLink display="inline" fontWeight={700} href="https://opensea.io/CoinCollectNFT" target="_blank" color="failure">
                {t('Not too late')} »
              </MessageTextLink>
            </Box>
          </Message>
          )}
        
          {(account && isHolder && version == 3.1) && (
            <Message mt="24px" p="8px" variant="success">
              <MessageText small display="inline">
                {t(`Wow! You are holder. You save ${discountAmount} MATIC and no need to wait for the countdown.`)}
              </MessageText>
            </Message>
          )}

        </Box>
        
        </>
      )
  
    return null
  }
  return (
    <Box>
      {tooltipVisible && tooltip}
      {renderTokenSection()}
    </Box>
  )
}

export default IfoCardTokens
