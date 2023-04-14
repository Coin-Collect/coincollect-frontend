import { useTranslation } from 'contexts/Localization'
import styled from 'styled-components'
import { Text, Flex, LinkExternal, Skeleton, HelpIcon, useTooltip } from '@pancakeswap/uikit'
import Balance from 'components/Balance'
import BigNumber from 'bignumber.js'
import { getBalanceNumber } from 'utils/formatBalance'

export interface ExpandableSectionProps {
  bscScanAddress?: string
  infoAddress?: string
  removed?: boolean
  totalValueFormatted?: string
  lpLabel?: string
  addLiquidityUrl?: string
  totalStaked?: BigNumber
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
  infoAddress,
  removed,
  totalStaked,
  lpLabel,
  addLiquidityUrl,
}) => {
  const { t } = useTranslation()
  const {
    targetRef: totalStakedTargetRef,
    tooltip: totalStakedTooltip,
    tooltipVisible: totalStakedTooltipVisible,
  } = useTooltip(t('Total amount of NFT staked in this pool'), {
    placement: 'bottom',
  })

  return (
    <Wrapper>
      <Flex mb="2px" justifyContent="space-between" alignItems="center">
      <Text small>{t('Total staked')}:</Text>
      <Flex alignItems="flex-start">
          {totalStaked && totalStaked.gte(0) ? (
            <>
              <Balance small value={getBalanceNumber(totalStaked, 18)} decimals={0} />
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
      {!removed && (
        <StyledLinkExternal href={addLiquidityUrl}>{t('Get %symbol%', { symbol: lpLabel })}</StyledLinkExternal>
      )}
      <StyledLinkExternal href={bscScanAddress}>{t('View Contract')}</StyledLinkExternal>
      {/*
      <StyledLinkExternal href={infoAddress}>{t('See Pair Info')}</StyledLinkExternal>
      */}
    </Wrapper>
  )
}

export default DetailsSection
