import RewardTokenIcon from './RewardTokenIcon'
import { AddIcon, Flex, Heading, MinusIcon, Text } from '@pancakeswap/uikit'
import { formatUnits } from '@ethersproject/units'
import Decimal from 'bignumber.js'
import AnimatedValue from 'components/AnimatedValue'
import useAnimatedRewardValue from 'hooks/useAnimatedRewardValue'
import { useTranslation } from 'contexts/Localization'
import { ActionChipButton, IconButtonWrapper } from './StakeAction'
import {
  RewardsPanel,
  RewardsHeader,
  RewardsGrid,
  RewardRow,
  TokenLabel,
  RewardValue,
  HarvestButton,
} from './HarvestAction'

interface PositionReward {
  address: string
  symbol: string
  decimals: number | null
  amount: string
  estimated?: boolean
}

function PendingRewardValue({ amount, decimals }: { amount: string; decimals: number }) {
  const { displayValue, isAnimating } = useAnimatedRewardValue(new Decimal(formatUnits(amount, decimals)))
  return <AnimatedValue $animate={isAnimating}>{displayValue}</AnimatedValue>
}

export function FarmCardEarned({
  rewards,
  canHarvest,
  harvesting,
  onHarvest,
  harvestLabel,
}: {
  rewards: PositionReward[]
  canHarvest: boolean
  harvesting?: boolean
  onHarvest: () => void
  harvestLabel?: string
}) {
  const { t } = useTranslation()

  return (
    <Flex mb="10px" flexDirection="column" style={{ gap: 10 }}>
      <RewardsPanel flexDirection="column" alignItems="flex-start">
        <RewardsHeader>
          <Text bold textTransform="uppercase" color="secondary" fontSize="12px" pr="4px">
            {rewards.length === 1 ? rewards[0].symbol : t('REWARDS')}
          </Text>
          <Text bold textTransform="uppercase" color="textSubtle" fontSize="12px">
            {t('Earned')}
          </Text>
        </RewardsHeader>
        <RewardsGrid>
          {rewards.map((reward) => (
            <RewardRow key={reward.address} title={reward.estimated ? t('Estimated side payout') : t('Pending reward')}>
              <TokenLabel>
                <RewardTokenIcon token={reward.symbol} tokenMeta={reward} />
                <Text
                  bold
                  color="textSubtle"
                  textTransform="uppercase"
                  fontSize="11px"
                  style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {reward.symbol}
                </Text>
              </TokenLabel>
              <RewardValue>
                {reward.decimals === null ? (
                  t('Unavailable')
                ) : (
                  <PendingRewardValue amount={reward.amount} decimals={reward.decimals} />
                )}
              </RewardValue>
            </RewardRow>
          ))}
        </RewardsGrid>
        <HarvestButton disabled={!canHarvest} onClick={onHarvest}>
          {harvesting ? t('Harvesting') : harvestLabel ?? t('Harvest')}
        </HarvestButton>
      </RewardsPanel>
    </Flex>
  )
}

export function FarmCardStakedPosition({
  count,
  power,
  canUnstake,
  canStakeMore,
  onUnstake,
  onStakeMore,
}: {
  count: string
  power: string
  canUnstake: boolean
  canStakeMore: boolean
  onUnstake: () => void
  onStakeMore: () => void
}) {
  const { t } = useTranslation()

  return (
    <>
      <Text bold textTransform="uppercase" color="secondary" fontSize="12px">
        {t('Staked NFT Count')}
      </Text>
      <Flex justifyContent="space-between" alignItems="center">
        <Heading title={`${power} power`}>{count}</Heading>
        <IconButtonWrapper>
          <ActionChipButton variant="tertiary" disabled={!canUnstake} onClick={onUnstake}>
            <MinusIcon width="13px" mr="4px" color="currentColor" />
            {t('Unstake')}
          </ActionChipButton>
          <ActionChipButton $stake variant="tertiary" disabled={!canStakeMore} onClick={onStakeMore}>
            <AddIcon width="13px" mr="4px" color="currentColor" />
            {t('Stake More')}
          </ActionChipButton>
        </IconButtonWrapper>
      </Flex>
    </>
  )
}
