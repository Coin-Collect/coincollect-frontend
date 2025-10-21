import { useState } from 'react'
import type { ComponentType } from 'react'
import BigNumber from 'bignumber.js'
import styled, { css } from 'styled-components'
import {
  Card,
  Flex,
  Text,
  Skeleton,
  CardRibbon,
  HomeIcon,
  NftIcon,
  SmartContractIcon,
  useTooltip,
  useMatchBreakpoints,
} from '@pancakeswap/uikit'
import type { SvgProps } from '@pancakeswap/uikit'
import { DeserializedNftFarm } from 'state/types'
import { getPolygonScanLink } from 'utils'
import { useTranslation } from 'contexts/Localization'
import ExpandableSectionButton from 'components/ExpandableSectionButton'
import { getAddress } from 'utils/addressHelpers'
import DetailsSection from './DetailsSection'
import CardHeadingWithBanner from './CardHeadingWithBanner'
import CardActionsContainer from './CardActionsContainer'
import ApyButton from './ApyButton'
import nftFarmsConfig from 'config/constants/nftFarms'
import formatRewardAmount from 'utils/formatRewardAmount'

export interface NftFarmWithStakedValue extends DeserializedNftFarm {
  apr?: number
  lpRewardsApr?: number
  liquidity?: BigNumber
}

const StyledCard = styled(Card)<{ $variant: 'default' | 'expanded' }>`
  align-self: baseline;
  max-width: 100%;
  margin: ${({ $variant }) => ($variant === 'expanded' ? '0 0 32px' : '0 0 24px 0')};
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(0);
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12), 0 4px 10px rgba(0, 0, 0, 0.08);
    border-color: ${({ theme }) => theme.colors.primary};
  }
  
  ${({ theme, $variant }) =>
    $variant === 'default'
      ? css`
          ${theme.mediaQueries.sm} {
            max-width: 350px;
            margin: 0 12px 46px;
          }
        `
      : css`
          max-width: 350px;
          margin: 0 auto 32px;
          ${theme.mediaQueries.sm} {
            margin: 0 auto 32px;
          }
        `}
`

const FarmCardInnerContainer = styled(Flex)`
  flex-direction: column;
  justify-content: space-around;
  padding: 16px;
`

const ExpandingWrapper = styled.div`
  padding: 12px;
  border-top: 2px solid ${({ theme }) => theme.colors.cardBorder};
  overflow: hidden;
`

const FooterTopRow = styled(Flex)`
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const FooterLinks = styled(Flex)`
  gap: 12px;
`

const FooterIconWrapper = styled.span`
  display: inline-flex;
`

const FooterIconLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.background};
  transition: color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.secondary};
    border-color: ${({ theme }) => theme.colors.secondary};
    transform: translateY(-2px);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`

interface FooterIconWithTooltipProps {
  href: string
  label: string
  IconComponent: ComponentType<SvgProps>
}

const FooterIconWithTooltip: React.FC<FooterIconWithTooltipProps> = ({ href, label, IconComponent }) => {
  const { targetRef, tooltip, tooltipVisible } = useTooltip(label, { placement: 'top' })
  const { isXs, isSm, isMd } = useMatchBreakpoints()
  const isTouch =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore
      navigator.msMaxTouchPoints > 0)
  const disableTooltip = isXs || isSm || isMd || isTouch

  return (
    <>
      {!disableTooltip && tooltipVisible && tooltip}
      <FooterIconWrapper ref={!disableTooltip ? targetRef : undefined}>
        <FooterIconLink href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
          <IconComponent color="currentColor" />
        </FooterIconLink>
      </FooterIconWrapper>
    </>
  )
}

const MetricText = styled(Text)<{ metricType?: 'high' | 'medium' | 'low' | 'reward' }>`
  color: ${({ theme, metricType }) => {
    switch (metricType) {
      case 'high':
        return theme.colors.success;
      case 'medium':
        return theme.colors.warning;
      case 'low':
        return theme.colors.failure;
      case 'reward':
        return theme.colors.primary;
      default:
        return theme.colors.text;
    }
  }};
  font-weight: ${({ metricType }) => metricType ? '600' : 'inherit'};
`

const RewardBadge = styled.div<{ rewardType?: 'primary' | 'secondary' }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 4px;
  margin-bottom: 4px;
  border-radius: 6px;
  background: ${({ theme, rewardType }) => 
    rewardType === 'primary' 
      ? `${theme.colors.primary}20`
      : `${theme.colors.secondary}20`
  };
  border: 1px solid ${({ theme, rewardType }) => 
    rewardType === 'primary' 
      ? `${theme.colors.primary}40`
      : `${theme.colors.secondary}40`
  };
`

interface FarmCardProps {
  farm: NftFarmWithStakedValue
  displayApr: string
  removed: boolean
  cakePrice?: BigNumber
  account?: string
  variant?: 'default' | 'expanded'
}

const FarmCard: React.FC<FarmCardProps> = ({ farm, displayApr, removed, cakePrice, account, variant = 'default' }) => {
  const { t } = useTranslation()

  const [showExpandableSection, setShowExpandableSection] = useState(false)

  const lpLabel = farm.lpSymbol && farm.lpSymbol.replace('CoinCollect', '')
  const earnLabel = farm.earningToken ? farm.earningToken.symbol: t('COLLECT')

  const nftAddress = getAddress(farm.nftAddresses)
  const apyModalLink = "/nfts/collections/mint/" + nftAddress
  const isPromotedFarm = false //farm.token.symbol === 'COLLECT' Caution: Fix
  const sideRewards = farm.sideRewards ? farm.sideRewards : []
  const farmConfig = nftFarmsConfig.filter((farmConfig) => farmConfig.pid == farm.pid)[0]
  const { stakedBalance } = farm.userData || {}
  const dailyRewardAmount = farm.apr !== undefined && farm.apr !== null ? new BigNumber(farm.apr) : new BigNumber(0)
  const dailyRewardDisplay = displayApr ?? formatRewardAmount(dailyRewardAmount)
  
  // Helper function to determine APR color based on value
  const getAprMetricType = (aprValue?: BigNumber | null) => {
    if (!aprValue) return undefined

    const numericApr = aprValue.toNumber()
    if (numericApr >= 100) return 'high'
    if (numericApr >= 50) return 'medium'
    if (numericApr > 0) return 'low'
    return undefined
  }

  const contractLink = getPolygonScanLink(farm.contractAddresses ? getAddress(farm.contractAddresses) : nftAddress, 'address')
  const mainLink = farmConfig?.projectLink?.mainLink
  const mintLink = farmConfig?.projectLink?.getNftLink ?? apyModalLink

  return (
    <StyledCard
      $variant={variant}
      ribbon={farm.isFinished && <CardRibbon variantColor="textDisabled" text={t('Finished')} />}
      isActive={isPromotedFarm}
    >
      <FarmCardInnerContainer>
        <CardHeadingWithBanner
          lpLabel={lpLabel}
          multiplier={farm.multiplier}
          isCommunity={farm.isCommunity}
          nftToken={nftAddress}
          pid={farm.pid}
          disabled={farm.isFinished}
        />

{(!removed && stakedBalance?.eq(0)) && (
  <>
    {sideRewards.length === 0 ? (
      <Flex justifyContent="space-between" alignItems="center">
        <Text>{t('Daily Reward')}:</Text>
        <MetricText bold metricType={displayApr !== null ? getAprMetricType(dailyRewardAmount) : undefined} style={{ display: 'flex', alignItems: 'center' }}>
          {displayApr !== null ? dailyRewardDisplay : <Skeleton height={24} width={80} />}
        </MetricText>
      </Flex>
    ) : (
      <>
        <Flex justifyContent="center" alignItems="center">
          <Text>{t('Daily Rewards')}</Text>
        </Flex>
        <Flex justifyContent="space-between">
          <RewardBadge rewardType="primary">
            <MetricText fontSize="12px" metricType="reward">{earnLabel}</MetricText>
          </RewardBadge>
          <MetricText bold metricType={displayApr !== null ? getAprMetricType(dailyRewardAmount) : undefined}>
            {displayApr !== null ? dailyRewardDisplay : <Skeleton height={24} width={80} />}
          </MetricText>
        </Flex>
        {sideRewards.map((reward, index) => (
          <Flex key={index} justifyContent="space-between">
            <RewardBadge rewardType="secondary">
              <MetricText fontSize="12px" metricType="reward">{reward.token}</MetricText>
            </RewardBadge>
            <MetricText bold metricType="medium">
              {formatRewardAmount(dailyRewardAmount.multipliedBy(reward.percentage).dividedBy(100))}
            </MetricText>
          </Flex>
        ))}
      </>
    )}
  </>
)}

{sideRewards.length === 0 && (
  <Flex justifyContent="space-between">
    <Text>{t('Earn')}:</Text>
    <Text bold>{earnLabel}</Text>
  </Flex>
)}


        <CardActionsContainer
          farm={farm}
          lpLabel={lpLabel}
          account={account}
          cakePrice={cakePrice}
          addLiquidityUrl={apyModalLink}
        />
      </FarmCardInnerContainer>

      <ExpandingWrapper>
        <FooterTopRow>
          <FooterLinks>
            {mainLink && (
              <FooterIconWithTooltip href={mainLink} label={t('Visit project website')} IconComponent={HomeIcon} />
            )}
            {mintLink && (
              <FooterIconWithTooltip href={mintLink} label={t('Open mint page')} IconComponent={NftIcon} />
            )}
            {contractLink && (
              <FooterIconWithTooltip href={contractLink} label={t('View contract on explorer')} IconComponent={SmartContractIcon} />
            )}
          </FooterLinks>
          <ExpandableSectionButton
            onClick={() => setShowExpandableSection(!showExpandableSection)}
            expanded={showExpandableSection}
          />
        </FooterTopRow>
        {showExpandableSection && (
          <DetailsSection
            removed={removed}
            bscScanAddress={contractLink}
            earningToken={farm.earningToken}
            totalStaked={farm.liquidity}
            startTimestamp={farm.startTimestamp}
            endTimestamp={farm.endTimestamp}
            stakingLimit={farm.stakingLimit}
            stakingLimitEndTimestamp={farm.stakingLimitEndTimestamp}
            lpLabel={lpLabel}
            addLiquidityUrl={apyModalLink}
            isFinished={farm.isFinished}
            projectLink={farmConfig.projectLink}
          />
        )}
      </ExpandingWrapper>
    </StyledCard>
  )
}

export default FarmCard
