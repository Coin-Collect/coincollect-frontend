import { Button, Text, useModal, Flex, Skeleton, Heading } from '@pancakeswap/uikit'
import BigNumber from 'bignumber.js'
import useWeb3React from 'hooks/useWeb3React'
import { PoolCategory } from 'config/constants/types'
import { getBalanceAmount, getFullDisplayBalance } from 'utils/formatBalance'
import { useTranslation } from 'contexts/Localization'
import Balance from 'components/Balance'
import { BIG_ZERO } from 'utils/bigNumber'
import { DeserializedPool } from 'state/types'
import AnimatedValue from 'components/AnimatedValue'
import useAnimatedRewardValue from 'hooks/useAnimatedRewardValue'
import formatRewardAmount from 'utils/formatRewardAmount'

import { ActionContainer, ActionTitles, ActionContent } from './styles'
import CollectModal from '../../PoolCard/Modals/CollectModal'

interface HarvestActionProps extends DeserializedPool {
  userDataLoaded: boolean
}

const HarvestAction: React.FunctionComponent<HarvestActionProps> = ({
  sousId,
  poolCategory,
  earningToken,
  userData,
  userDataLoaded,
  earningTokenPrice,
}) => {
  const { t } = useTranslation()
  const { account } = useWeb3React()

  const earnings = userData?.pendingReward ? new BigNumber(userData.pendingReward) : BIG_ZERO
  const tokenAmount = getBalanceAmount(earnings, earningToken.decimals)
  const { displayValue, baseValue, isAnimating, collapsedValue } = useAnimatedRewardValue(tokenAmount, {
    disabled: !account || !userDataLoaded,
  })
  const earningTokenDollarBalance = baseValue.multipliedBy(earningTokenPrice).toNumber()
  const hasEarnings = baseValue.gt(0)
  const fullBalance = getFullDisplayBalance(earnings, earningToken.decimals)
  const formattedBalance = formatRewardAmount(baseValue)
  const isCompoundPool = sousId === 0
  const isBnbPool = poolCategory === PoolCategory.BINANCE

  const [onPresentCollect] = useModal(
    <CollectModal
      formattedBalance={formattedBalance}
      fullBalance={fullBalance}
      earningToken={earningToken}
      earningsDollarValue={earningTokenDollarBalance}
      sousId={sousId}
      isBnbPool={isBnbPool}
      isCompoundPool={isCompoundPool}
    />,
  )

  const actionTitle = (
    <>
      <Text fontSize="12px" bold color="secondary" as="span" textTransform="uppercase">
        {earningToken.symbol}{' '}
      </Text>
      <Text fontSize="12px" bold color="textSubtle" as="span" textTransform="uppercase">
        {t('Earned')}
      </Text>
    </>
  )

  if (!account) {
    return (
      <ActionContainer>
        <ActionTitles>{actionTitle}</ActionTitles>
        <ActionContent>
          <Heading color="textDisabled">
            <AnimatedValue>{collapsedValue}</AnimatedValue>
          </Heading>
          <Button disabled>{isCompoundPool ? t('Collect') : t('Harvest')}</Button>
        </ActionContent>
      </ActionContainer>
    )
  }

  if (!userDataLoaded) {
    return (
      <ActionContainer>
        <ActionTitles>{actionTitle}</ActionTitles>
        <ActionContent>
          <Skeleton width={180} height="32px" marginTop={14} />
        </ActionContent>
      </ActionContainer>
    )
  }

  return (
    <ActionContainer>
      <ActionTitles>{actionTitle}</ActionTitles>
      <ActionContent>
        <Flex flex="1" pt="16px" flexDirection="column" alignSelf="flex-start">
          <>
            {hasEarnings ? (
              <>
                <Heading as="div" scale="lg" color="text">
                  <AnimatedValue $animate={isAnimating}>{displayValue}</AnimatedValue>
                </Heading>
                {earningTokenPrice > 0 && (
                  <Balance
                    display="inline"
                    fontSize="12px"
                    color="textSubtle"
                    decimals={2}
                    prefix="~"
                    value={earningTokenDollarBalance}
                    unit=" USD"
                  />
                )}
              </>
            ) : (
              <>
                <Heading color="textDisabled">
                  <AnimatedValue>{collapsedValue}</AnimatedValue>
                </Heading>
                <Text fontSize="12px" color="textDisabled">
                  0 USD
                </Text>
              </>
            )}
          </>
        </Flex>
        <Button disabled={!hasEarnings} onClick={onPresentCollect}>
          {isCompoundPool ? t('Collect') : t('Harvest')}
        </Button>
      </ActionContent>
    </ActionContainer>
  )
}

export default HarvestAction
