import { useState } from 'react'
import BigNumber from 'bignumber.js'
import styled from 'styled-components'
import { Card, Flex, Text, Skeleton } from '@pancakeswap/uikit'
import { DeserializedNftFarm } from 'state/types'
import { getPolygonScanLink } from 'utils'
import { useTranslation } from 'contexts/Localization'
import ExpandableSectionButton from 'components/ExpandableSectionButton'
import { getAddress } from 'utils/addressHelpers'
import DetailsSection from './DetailsSection'
import CardHeading from './CardHeading'
import CardActionsContainer from './CardActionsContainer'
import ApyButton from './ApyButton'

export interface NftFarmWithStakedValue extends DeserializedNftFarm {
  apr?: number
  lpRewardsApr?: number
  liquidity?: BigNumber
}

const StyledCard = styled(Card)`
  align-self: baseline;
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

interface FarmCardProps {
  farm: NftFarmWithStakedValue
  displayApr: string
  removed: boolean
  cakePrice?: BigNumber
  account?: string
}

const FarmCard: React.FC<FarmCardProps> = ({ farm, displayApr, removed, cakePrice, account }) => {
  const { t } = useTranslation()

  const [showExpandableSection, setShowExpandableSection] = useState(false)


  const lpLabel = farm.lpSymbol && farm.lpSymbol.toUpperCase().replace('PANCAKE', '')
  const earnLabel = farm.dual ? farm.dual.earnLabel : t('COLLECT')

  const apyModalLink = "/nfts/collections"
  const nftAddress = getAddress(farm.nftAddresses)
  const isPromotedFarm = true //farm.token.symbol === 'COLLECT' Caution: Fix

  return (
    <StyledCard isActive={isPromotedFarm}>
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
              {farm.apr ? (
                displayApr
              ) : (
                <Skeleton height={24} width={80} />
              )}
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
            totalStaked={farm.liquidity}
            startBlock={farm.startBlock}
            endBlock={farm.endBlock}
            stakingLimit={farm.stakingLimit}
            stakingLimitEndBlock={farm.stakingLimitEndBlock}
            lpLabel={lpLabel}
            addLiquidityUrl={apyModalLink}
          />
        )}
      </ExpandingWrapper>
    </StyledCard>
  )
}

export default FarmCard
