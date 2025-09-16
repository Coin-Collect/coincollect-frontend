import styled from 'styled-components'
import { Skeleton } from '@pancakeswap/uikit'
import BigNumber from 'bignumber.js'
import AnimatedValue from 'components/AnimatedValue'
import useAnimatedRewardValue from 'hooks/useAnimatedRewardValue'

export interface EarnedProps {
  earnings: number
  pid: number
}

interface EarnedPropsWithLoading extends EarnedProps {
  userDataReady: boolean
}

const Amount = styled.span<{ earned: number }>`
  color: ${({ earned, theme }) => (earned ? theme.colors.text : theme.colors.textDisabled)};
  display: flex;
  align-items: center;
`

const Earned: React.FunctionComponent<EarnedPropsWithLoading> = ({ earnings, userDataReady }) => {
  if (!userDataReady) {
    return (
      <Amount earned={0}>
        <Skeleton width={60} />
      </Amount>
    )
  }

  const earningsBigNumber = new BigNumber(earnings || 0)
  const { displayValue, baseValue, isAnimating } = useAnimatedRewardValue(earningsBigNumber)

  return (
    <Amount earned={baseValue.gt(0) ? 1 : 0}>
      <AnimatedValue $animate={isAnimating}>{displayValue}</AnimatedValue>
    </Amount>
  )
}

export default Earned
