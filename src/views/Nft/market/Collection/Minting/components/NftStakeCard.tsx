import {
  Box,
  Card,
  CardBody,
  CardHeader,
  ExpandableButton,
  Flex,
  Text,
  useMatchBreakpoints,
  useTooltip,
} from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useState } from 'react'
import { useFarmFromPid, usePriceCakeBusd } from 'state/nftFarms/hooks'
import { useIfoPoolCredit, useIfoPoolVault, useIfoWithApr } from 'state/pools/hooks'
import styled from 'styled-components'
import { getBalanceNumber } from 'utils/formatBalance'
import CardActionsContainer from 'views/NftFarms/components/FarmCard/CardActionsContainer'
import CardHeading from 'views/NftFarms/components/FarmCard/CardHeading'
import PoolCardHeader, { PoolCardHeaderTitle } from 'views/Pools/components/PoolCard/PoolCardHeader'
import StyledCard from 'views/Pools/components/PoolCard/StyledCard'
import { ActionContainer } from 'views/Pools/components/PoolsTable/ActionPanel/styles'
import { getAddress } from 'utils/addressHelpers'
import ExpandableSectionButton from 'components/ExpandableSectionButton'
import DetailsSection from 'views/NftFarms/components/FarmCard/DetailsSection'
import { getPolygonScanLink } from 'utils'
import { getNftFarmApr } from 'utils/apr'
import BigNumber from 'bignumber.js'
import { getDisplayApr } from 'views/NftFarms/Farms'


const StyledCardMobile = styled(Card)`
  max-width: 400px;
  width: 100%;
`

const StyledTokenContent = styled(Flex)`
  ${Text} {
    line-height: 1.2;
    white-space: nowrap;
  }
`

const StyledCardFooter = styled(Box)`
  padding: 16px;
  background-color: ${({ theme }) => theme.colors.dropdown};
`

const StyledCardBody = styled(CardBody)`
  display: grid;
  padding: 16px;
  background-color: ${({ theme }) => theme.colors.dropdown};
  gap: 16px;
  ${ActionContainer} {
    margin: 0;
    background-color: ${({ theme }) => theme.colors.invertedContrast};
  }
`

const FarmCardInnerContainer = styled(Flex)`
  flex-direction: column;
  justify-content: space-around;
  padding: 24px;
`

const ExpandingWrapper = styled.div`
  padding: 24px;
  border-top: 2px solid ${({ theme }) => theme.colors.cardBorder};
  overflow: hidden;
`

const NftStakeCardBody= ({farm, account}) => {
  const { t } = useTranslation()
  const [showExpandableSection, setShowExpandableSection] = useState(false)
  const lpLabel = farm.lpSymbol && farm.lpSymbol.replace('CoinCollect', '')
  const earnLabel = farm.dual ? farm.dual.earnLabel : t('COLLECT')
  const apyModalLink = "/nfts/collections"
  const nftAddress = getAddress(farm.nftAddresses)
  const isPromotedFarm = true //farm.token.symbol === 'COLLECT' Caution: Fix
  const cakePrice = usePriceCakeBusd()
  const removed = false

  const totalLiquidity = farm.totalStaked
  const totalLiquidityWithThreshold = new BigNumber(Math.max(farm.participantThreshold ?? 0, totalLiquidity.toNumber()))
  const { cakeRewardsApr, lpRewardsApr } = getNftFarmApr(new BigNumber(farm.poolWeight), farm.tokenPerBlock ? parseFloat(farm.tokenPerBlock) : null, totalLiquidityWithThreshold)

  return (
    <>
    <StyledCardBody>
        <FarmCardInnerContainer>
          <CardHeading
            lpLabel={lpLabel}
            multiplier={farm.multiplier}
            nftToken= {nftAddress}
          />
          {!removed && (
            <Flex justifyContent="space-between" alignItems="center">
              <Text>{t('Daily Reward')}:</Text>
              <Text bold style={{ display: 'flex', alignItems: 'center' }}>
                {getDisplayApr(cakeRewardsApr)}
              </Text>
            </Flex>
          )}
          <Flex justifyContent="space-between">
            <Text>{t('Earn')}:</Text>
            <Text bold>{earnLabel}</Text>
          </Flex>
          <CardActionsContainer
            farm={farm}
            lpLabel={lpLabel}
            account={account}
            cakePrice={cakePrice}
            addLiquidityUrl={apyModalLink}
          />
        </FarmCardInnerContainer>
      </StyledCardBody>
      <ExpandingWrapper>
        <ExpandableSectionButton
          onClick={() => setShowExpandableSection(!showExpandableSection)}
          expanded={showExpandableSection}
        />
        {showExpandableSection && (
          <DetailsSection
            removed={removed}
            bscScanAddress={getPolygonScanLink(nftAddress, 'address')}
            infoAddress={`/info/pool/`}
            totalStaked={farm.totalStaked}
            lpLabel={lpLabel}
            addLiquidityUrl={apyModalLink}
          />
        )}
      </ExpandingWrapper>
      </>
  )
}

const NftStakeCardMobile= ({farm}) => {
  const { account } = useActiveWeb3React()
  const { t } = useTranslation()
  const credit = useIfoPoolCredit()
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <StyledCardMobile isActive>
      <CardHeader p="16px">
        <Flex justifyContent="space-between" alignItems="center">
        <PoolCardHeaderTitle
          title={`Do you have ${farm.lpSymbol}?`}
          subTitle="Stake now and start earning"
        />
          <ExpandableButton expanded={isExpanded} onClick={() => setIsExpanded((prev) => !prev)} />
        </Flex>
      </CardHeader>
      {isExpanded && (
        <>
          <NftStakeCardBody farm={farm} account={account}/>
        </>
      )}
    </StyledCardMobile>
  )
}

const NftStakeCard = ({farm, account}) => {
  const { isMd, isXs, isSm } = useMatchBreakpoints()
  const isSmallerThanTablet = isMd || isXs || isSm
  
  if (isSmallerThanTablet) {
    return <NftStakeCardMobile farm={farm}  />
  }

  return (
  <StyledCard isActive>
    <PoolCardHeader isStaking={true}>
        <PoolCardHeaderTitle
          title={`Do you have ${farm.lpSymbol}?`}
          subTitle="Stake now and start earning"
        />
        {/*<TokenPairImage {...vaultPoolConfig[pool.vaultKey].tokenImage} width={64} height={64} />*/}
      </PoolCardHeader>  
      <NftStakeCardBody farm={farm} account={account}/>
  </StyledCard>
  )
}

export default NftStakeCard
