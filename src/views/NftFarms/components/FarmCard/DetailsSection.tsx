import { useTranslation } from 'contexts/Localization'
import type { ReactNode } from 'react'
import styled from 'styled-components'
import { Text, Flex, LinkExternal, Skeleton, HelpIcon, useTooltip } from '@pancakeswap/uikit'
import Balance from 'components/Balance'
import BigNumber from 'bignumber.js'
import { useCurrentBlock } from 'state/block/hooks'
import { getNftFarmBlockInfo } from 'views/NftFarms/helpers'
import MaxStakeRow from 'views/NftFarms/components/MaxStakeRow'
import { Token } from '@coincollect/sdk'
import { ProjectLink } from 'config/constants/types'
import { TimeCountdownDisplay } from '../Cells/EndsInCell'
import type { PublicV2Pool } from 'features/nftPoolManager/publication'
import { ScheduleCountdown, TimestampScheduleCountdown, type TimestampSchedule } from './ScheduleCountdown'

export interface ExpandableSectionProps {
  bscScanAddress?: string
  earningToken?: Pick<Token, 'address'>
  tokenInfoUrl?: string
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
  publishedPool?: PublicV2Pool
  timestampSchedule?: TimestampSchedule
  editSchedule?: ReactNode
  additionalDetails?: ReactNode
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
  tokenInfoUrl,
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
  publishedPool,
  timestampSchedule,
  editSchedule,
  additionalDetails,
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
    getNftFarmBlockInfo(startTimestamp || 0, endTimestamp || 0, Boolean(isFinished), currentBlock)
  const status = timestampSchedule?.status ?? publishedPool?.snapshot.status
  const publishedScheduleLabel =
    status === 'UPCOMING' ? 'Starts in' : status === 'ACTIVE' || status === 'FINISHED' ? 'Ends in' : 'Schedule'

  return (
    <Wrapper>
      {
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
      }
      {(publishedPool || timestampSchedule || editSchedule) && (
        <Flex mb="2px" justifyContent="space-between" alignItems="center" style={{ gap: 12 }}>
          <Text small>{t(publishedScheduleLabel)}:</Text>
          {editSchedule ??
            (timestampSchedule ? (
              <TimestampScheduleCountdown schedule={timestampSchedule} />
            ) : (
              publishedPool && <ScheduleCountdown pool={publishedPool} />
            ))}
        </Flex>
      )}
      {additionalDetails}
      {stakingLimit && stakingLimit.gt(0) && (
        <MaxStakeRow
          small
          currentBlock={currentBlock}
          hasPoolStarted={hasPoolStarted}
          stakingLimit={stakingLimit}
          stakingLimitEndTimestamp={stakingLimitEndTimestamp || 0}
          stakingTokenSymbol={lpLabel || ''}
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
      {!removed && (projectLink?.getNftLink || addLiquidityUrl) && (
        <StyledLinkExternal href={projectLink?.getNftLink ?? addLiquidityUrl}>
          {t('Get %symbol%', { symbol: lpLabel || 'NFT' })}
        </StyledLinkExternal>
      )}
      {bscScanAddress && <StyledLinkExternal href={bscScanAddress}>{t('View Contract')}</StyledLinkExternal>}

      {(tokenInfoUrl || earningToken?.address) && (
        <StyledLinkExternal href={tokenInfoUrl ?? `https://app.uniswap.org/#/tokens/polygon/${earningToken?.address}`}>
          {t('See Token Info')}
        </StyledLinkExternal>
      )}
      {projectLink?.mainLink && (
        <StyledLinkExternal href={projectLink.mainLink}>{t('View Project Site')}</StyledLinkExternal>
      )}
    </Wrapper>
  )
}

export default DetailsSection
