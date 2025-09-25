import { Flex, Text, Button, Heading, useModal, Skeleton } from '@pancakeswap/uikit'
import BigNumber from 'bignumber.js'
import { Token } from '@coincollect/sdk'
import { useTranslation } from 'contexts/Localization'
import { getFullDisplayBalance, getBalanceAmount } from 'utils/formatBalance'
import Balance from 'components/Balance'
import AnimatedValue from 'components/AnimatedValue'
import useAnimatedRewardValue from 'hooks/useAnimatedRewardValue'
import formatRewardAmount from 'utils/formatRewardAmount'
import CollectModal from '../Modals/CollectModal'

interface HarvestActionsProps {
  earnings: BigNumber
  earningToken: Token
  sousId: number
  earningTokenPrice: number
  isBnbPool: boolean
  isLoading?: boolean
}

const HarvestActions: React.FC<HarvestActionsProps> = ({
  earnings,
  earningToken,
  sousId,
  isBnbPool,
  earningTokenPrice,
  isLoading = false,
}) => {
  const { t } = useTranslation()
  const tokenAmount = getBalanceAmount(earnings, earningToken.decimals)
  const { displayValue, baseValue, isAnimating, collapsedValue } = useAnimatedRewardValue(tokenAmount)

  const earningTokenDollarBalance = baseValue.multipliedBy(earningTokenPrice).toNumber()

  const fullBalance = getFullDisplayBalance(earnings, earningToken.decimals)
  const hasEarnings = baseValue.gt(0)
  const formattedBalance = formatRewardAmount(baseValue)
  const isCompoundPool = sousId === 0

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

  return (
    <Flex justifyContent="space-between" alignItems="center" mb="16px">
      <Flex flexDirection="column">
        {isLoading ? (
          <Skeleton width="80px" height="48px" />
        ) : (
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
        )}
      </Flex>
      <Button disabled={!hasEarnings} onClick={onPresentCollect}>
        {isCompoundPool ? t('Collect') : t('Harvest')}
      </Button>
    </Flex>
  )
}

export default HarvestActions
