import styled, { keyframes, css } from 'styled-components'
import { useTranslation } from 'contexts/Localization'
import { Flex, Link, LinkExternal, Skeleton, Text, TimerIcon } from '@pancakeswap/uikit'
import { NftFarmWithStakedValue } from 'views/NftFarms/components/FarmCard/FarmCard'
import getLiquidityUrlPathParts from 'utils/getLiquidityUrlPathParts'
import { getAddress } from 'utils/addressHelpers'
import { getBscScanLink, getPolygonScanLink } from 'utils'
import { FarmAuctionTag, CoreTag, DualTag } from 'components/Tags'

import HarvestAction from './HarvestAction'
import StakedAction from './StakedAction'
import Apr, { AprProps } from '../Apr'
import Multiplier, { MultiplierProps } from '../Multiplier'
import Liquidity, { LiquidityProps } from '../Liquidity'
import { useCurrentBlock } from 'state/block/hooks'
import { getNftFarmBlockInfo } from 'views/NftFarms/helpers'
import Balance from 'components/Balance'
import MaxStakeRow from '../../MaxStakeRow'
import nftFarmsConfig from 'config/constants/nftFarms'

export interface ActionPanelProps {
  apr: AprProps
  multiplier: MultiplierProps
  liquidity: LiquidityProps
  details: NftFarmWithStakedValue
  userDataReady: boolean
  expanded: boolean
}

const expandAnimation = keyframes`
  from {
    max-height: 0px;
  }
  to {
    max-height: 500px;
  }
`

const collapseAnimation = keyframes`
  from {
    max-height: 500px;
  }
  to {
    max-height: 0px;
  }
`

const Container = styled.div<{ expanded }>`
  animation: ${({ expanded }) =>
    expanded
      ? css`
          ${expandAnimation} 300ms linear forwards
        `
      : css`
          ${collapseAnimation} 300ms linear forwards
        `};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background};
  display: flex;
  width: 100%;
  flex-direction: column-reverse;
  padding: 24px;

  ${({ theme }) => theme.mediaQueries.lg} {
    flex-direction: row;
    padding: 16px 32px;
  }
`

const StyledLinkExternal = styled(LinkExternal)`
  font-weight: 400;
`

const StakeContainer = styled.div`
  color: ${({ theme }) => theme.colors.text};
  align-items: center;
  display: flex;
  justify-content: space-between;

  ${({ theme }) => theme.mediaQueries.sm} {
    justify-content: flex-start;
  }
`

const TagsContainer = styled.div`
  display: flex;
  align-items: center;
  margin-top: 25px;

  ${({ theme }) => theme.mediaQueries.sm} {
    margin-top: 16px;
  }

  > div {
    height: 24px;
    padding: 0 6px;
    font-size: 14px;
    margin-right: 4px;

    svg {
      width: 14px;
    }
  }
`

const ActionContainer = styled.div`
  display: flex;
  flex-direction: column;

  ${({ theme }) => theme.mediaQueries.sm} {
    flex-direction: row;
    align-items: center;
    flex-grow: 1;
    flex-basis: 0;
  }
`

const InfoContainer = styled.div`
  min-width: 200px;
`

const ValueContainer = styled.div`
  display: block;

  ${({ theme }) => theme.mediaQueries.lg} {
    display: none;
  }
`

const ValueWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 4px 0px;
`

const ActionPanel: React.FunctionComponent<ActionPanelProps> = ({
  details,
  apr,
  multiplier,
  liquidity,
  userDataReady,
  expanded,
}) => {
  const farm = details

  const { t } = useTranslation()
  const currentBlock = useCurrentBlock()
  const isActive = farm.multiplier !== '0X'
  const { dual } = farm
  const lpLabel = farm.lpSymbol && farm.lpSymbol.toUpperCase().replace('PANCAKE', '')

  const apyModalLink = "/nfts/collections"
  const nftAddress = getAddress(farm.nftAddresses)
  const bsc = getPolygonScanLink(nftAddress, 'address')
  const farmConfig = nftFarmsConfig.filter((farmConfig) => farmConfig.pid == farm.pid)[0]

  const { shouldShowBlockCountdown, blocksUntilStart, blocksRemaining, hasPoolStarted, blocksToDisplay } =
    getNftFarmBlockInfo(farm.startBlock, farm.endBlock, farm.isFinished, currentBlock)

  return (
    <Container expanded={expanded}>
      <InfoContainer>
        {farm.stakingLimit && farm.stakingLimit.gt(0) && (
          <MaxStakeRow
            small
            currentBlock={currentBlock}
            hasPoolStarted={hasPoolStarted}
            stakingLimit={farm.stakingLimit}
            stakingLimitEndBlock={farm.stakingLimitEndBlock}
            stakingTokenSymbol={lpLabel}
          />
        )}
        {shouldShowBlockCountdown && (
          <Flex mb="2px" justifyContent="space-between" alignItems="center">
            <Text small>{hasPoolStarted ? t('Ends in') : t('Starts in')}:</Text>
            {blocksRemaining || blocksUntilStart ? (
              <Flex alignItems="center">
                <Link external href={getBscScanLink(hasPoolStarted ? farm.endBlock : farm.startBlock, 'countdown')}>
                  <Balance small value={blocksToDisplay} decimals={0} color="primary" />
                  <Text small ml="4px" color="primary" textTransform="lowercase">
                    {t('Blocks')}
                  </Text>
                  <TimerIcon ml="4px" color="primary" />
                </Link>
              </Flex>
            ) : (
              <Skeleton width="54px" height="21px" />
            )}
          </Flex>
        )}
        {isActive && (
          <StakeContainer>
            <StyledLinkExternal href={apyModalLink}>
              {t('Get %symbol%', { symbol: lpLabel.replace('COINCOLLECT', '') })}
            </StyledLinkExternal>
          </StakeContainer>
        )}
        <StyledLinkExternal href={bsc}>{t('View Contract')}</StyledLinkExternal>

        {farm.earningToken?.address && (<StyledLinkExternal href={`https://app.uniswap.org/#/tokens/polygon/${farm.earningToken.address}`}>{t('See Token Info')}</StyledLinkExternal>)}
        {farmConfig.projectLink && (<StyledLinkExternal href={farmConfig.projectLink}>{t('View Project Site')}</StyledLinkExternal>)}

        <TagsContainer>
          {dual ? <DualTag /> : null}
        </TagsContainer>
      </InfoContainer>
      <ValueContainer>
        <ValueWrapper>
          <Text>{t('APR')}</Text>
          <Apr {...apr} />
        </ValueWrapper>
        <ValueWrapper>
          <Text>{t('Multiplier')}</Text>
          <Multiplier {...multiplier} />
        </ValueWrapper>
        <ValueWrapper>
          <Text>{t('Total Staked')}</Text>
          <Liquidity {...liquidity} />
        </ValueWrapper>
      </ValueContainer>
      <ActionContainer>
        <HarvestAction {...farm} userDataReady={userDataReady} />
        <StakedAction {...farm} userDataReady={userDataReady} lpLabel={lpLabel} displayApr={apr.value} />
      </ActionContainer>
    </Container>
  )
}

export default ActionPanel
