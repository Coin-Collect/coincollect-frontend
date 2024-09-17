import { useTranslation } from 'contexts/Localization'
import styled from 'styled-components'
import { Text, Flex, LinkExternal, Skeleton, HelpIcon, useTooltip, Link, TimerIcon } from '@pancakeswap/uikit'
import Balance from 'components/Balance'
import BigNumber from 'bignumber.js'
import { useCurrentBlock } from 'state/block/hooks'
import { getPolygonScanLink } from 'utils'
import { getNftFarmBlockInfo } from 'views/NftFarms/helpers'
import MaxStakeRow from 'views/NftFarms/components/MaxStakeRow'
import { Token } from '@coincollect/sdk'
import { ProjectLink } from 'config/constants/types'
import { TimeCountdownDisplay } from '../Cells/EndsInCell'

export interface ExpandableSectionProps {
  bscScanAddress?: string
  earningToken?: Token
  removed?: boolean
  totalValueFormatted?: string
  lpLabel?: string
  addLiquidityUrl?: string
  totalStaked?: BigNumber
  startTimestamp?: number
  endTimestamp?: number
  stakingLimit?: BigNumber
  stakingLimitEndTimestamp?: number
  isFinished?: boolean
  projectLink?: ProjectLink
}

const Wrapper = styled.div`
  margin-top: 24px;

  svg {
    height: 14px;
    width: 14px;
  }
`

const StyledLinkExternal = styled(LinkExternal)`
  font-weight: 400;
`

const DetailsSection: React.FC<ExpandableSectionProps> = ({
  bscScanAddress,
  earningToken,
  removed,
  totalStaked,
  lpLabel,
  addLiquidityUrl,
  startTimestamp,
  endTimestamp,
  stakingLimit,
  stakingLimitEndTimestamp,
  isFinished,
  projectLink,
}) => {

  const { t } = useTranslation()
  const currentBlock = useCurrentBlock()
  const {
    targetRef: totalStakedTargetRef,
    tooltip: totalStakedTooltip,
    tooltipVisible: totalStakedTooltipVisible,
  } = useTooltip(t('Total amount of NFT staked in this pool'), {
    placement: 'bottom',
  })

  const { shouldShowBlockCountdown, timeUntilStart, timeRemaining, hasPoolStarted, timeToDisplay } =
    getNftFarmBlockInfo(startTimestamp, endTimestamp, isFinished, currentBlock)

  return (
    <Wrapper>
      <Flex mb="2px" justifyContent="space-between" alignItems="center">
        <Text small>{t('Total staked')}:</Text>
        <Flex alignItems="flex-start">
          {totalStaked && totalStaked.gte(0) ? (
            <>
              <Balance small value={totalStaked.toNumber()} decimals={0} />
              <span ref={totalStakedTargetRef}>
                <HelpIcon color="textSubtle" width="20px" ml="6px" mt="4px" />
              </span>
            </>
          ) : (
            <Skeleton width="90px" height="21px" />
          )}
          {totalStakedTooltipVisible && totalStakedTooltip}
        </Flex>
      </Flex>
      {stakingLimit && stakingLimit.gt(0) && (
        <MaxStakeRow
          small
          currentBlock={currentBlock}
          hasPoolStarted={hasPoolStarted}
          stakingLimit={stakingLimit}
          stakingLimitEndTimestamp={stakingLimitEndTimestamp || 0}
          stakingTokenSymbol={lpLabel}
          endTimestamp={endTimestamp || 0}
        />
      )}
      {shouldShowBlockCountdown && (
        <Flex mb="2px" justifyContent="space-between" alignItems="center">
          <Text small>{hasPoolStarted ? t('Ends in') : t('Starts in')}:</Text>
          {timeRemaining || timeUntilStart ? (
            <TimeCountdownDisplay timestamp={(hasPoolStarted ? endTimestamp : startTimestamp) || 0} />
          ) : (
            <Skeleton width="54px" height="21px" />
          )}
        </Flex>
      )}
      {(!removed && (projectLink?.getNftLink || addLiquidityUrl)) && (
        <StyledLinkExternal href={projectLink?.getNftLink ?? addLiquidityUrl}>{t('Get %symbol%', { symbol: lpLabel })}</StyledLinkExternal>
      )}
      <StyledLinkExternal href={bscScanAddress}>{t('View Contract')}</StyledLinkExternal>


      {earningToken?.address && (<StyledLinkExternal href={`https://app.uniswap.org/#/tokens/polygon/${earningToken.address}`}>{t('See Token Info')}</StyledLinkExternal>)}
      {projectLink?.mainLink && (<StyledLinkExternal href={projectLink.mainLink}>{t('View Project Site')}</StyledLinkExternal>)}


    </Wrapper>
  )
}

export default DetailsSection
