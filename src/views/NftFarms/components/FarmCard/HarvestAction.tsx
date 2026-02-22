import { Button, Flex, Text } from '@pancakeswap/uikit'
import useWeb3React from 'hooks/useWeb3React'
import BigNumber from 'bignumber.js'
import Balance from 'components/Balance'
import { useTranslation } from 'contexts/Localization'
import { ToastDescriptionWithTx } from 'components/Toast'
import useToast from 'hooks/useToast'
import useCatchTxError from 'hooks/useCatchTxError'
import AnimatedValue from 'components/AnimatedValue'
import { useMemo, useState } from 'react'

import { useAppDispatch } from 'state'
import { fetchFarmUserDataAsync } from 'state/nftFarms'
import { usePriceCakeBusd } from 'state/nftFarms/hooks'
import { BIG_ZERO } from 'utils/bigNumber'
import { getBalanceAmount } from 'utils/formatBalance'
import useHarvestFarm from '../../hooks/useHarvestFarm'
import { Token } from '@coincollect/sdk'
import formatRewardAmount from 'utils/formatRewardAmount'
import useAnimatedRewardValue from 'hooks/useAnimatedRewardValue'
import styled from 'styled-components'
import tokens from 'config/constants/tokens'

interface FarmCardActionsProps {
  earnings?: BigNumber
  pid?: number
  earnLabel?: string
  sideRewards?: any
  earningToken?: Token
  header?: JSX.Element
}

const RewardsPanel = styled(Flex)`
  gap: 8px;
  width: 100%;
  padding: 10px;
  border-radius: 12px;
  background: linear-gradient(145deg, rgba(16, 20, 28, 0.92) 0%, rgba(12, 15, 22, 0.9) 100%);
  border: 1px solid rgba(255, 215, 84, 0.18);
`

const RewardsGrid = styled.div`
  display: grid;
  width: 100%;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
`

const RewardRow = styled(Flex)`
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
`

const RewardValue = styled(Text)`
  font-weight: 800;
  color: #ffd966;
  letter-spacing: 0.2px;
`

const TokenLabel = styled(Flex)`
  align-items: center;
  gap: 6px;
`

const RewardTokenImage = styled.img`
  width: 14px;
  height: 14px;
  min-width: 14px;
  min-height: 14px;
  border-radius: 50%;
  object-fit: cover;
`

const RewardTokenFallbackIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.14);
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
`

const RewardsHeader = styled(Flex)`
  width: 100%;
  justify-content: center;
  align-items: center;
`

const HarvestButton = styled(Button)`
  width: 100%;
  height: 38px;
  border-radius: 10px;
  font-weight: 700;
`

const REWARD_SYMBOL_ICON_MAP: Record<string, string> = {
  SHIB: '/images/games/tokens/shib-min.png',
  ELON: '/images/games/tokens/elon-min.png',
  BONK: '/images/games/tokens/bonk.png',
  RADAR: '/images/tokens/0xdCb72AE4d5dc6Ae274461d57E65dB8D50d0a33AD.png',
}

interface RewardTokenIconProps {
  token: string
  tokenMeta?: Token
}

const RewardTokenIcon: React.FC<RewardTokenIconProps> = ({ token, tokenMeta }) => {
  const tokenSymbol = String(token).toUpperCase()
  const tokenAddress = tokenMeta?.address
  const iconCandidates = [
    REWARD_SYMBOL_ICON_MAP[tokenSymbol],
    tokenAddress ? `/images/tokens/${tokenAddress}.svg` : '',
    tokenAddress ? `/images/tokens/${tokenAddress}.png` : '',
  ].filter(Boolean)
  const [iconIndex, setIconIndex] = useState(0)
  const iconSrc = iconCandidates[iconIndex]

  if (iconSrc) {
    return <RewardTokenImage src={iconSrc} alt={`${token} icon`} onError={() => setIconIndex((prev) => prev + 1)} />
  }

  return <RewardTokenFallbackIcon>{String(token).slice(0, 1)}</RewardTokenFallbackIcon>
}

const HarvestAction: React.FC<FarmCardActionsProps> = ({ earnings, pid, earnLabel, sideRewards, earningToken, header }) => {
  const { account } = useWeb3React()
  const { toastSuccess } = useToast()
  const { fetchWithCatchTxError, loading: pendingTx } = useCatchTxError()
  const { t } = useTranslation()
  const { onReward } = useHarvestFarm(pid)
  const cakePrice = usePriceCakeBusd()
  const dispatch = useAppDispatch()
  const rawEarningsBalance = account ? getBalanceAmount(earnings, earningToken?.decimals) : BIG_ZERO
  const { displayValue, baseValue, isAnimating } = useAnimatedRewardValue(rawEarningsBalance)
  const earningsBusd = baseValue.multipliedBy(cakePrice).toNumber()
  const rewards = sideRewards ?? []
  const tokenBySymbol = useMemo(
    () =>
      Object.values(tokens).reduce<Record<string, Token>>((acc, token) => {
        if (token?.symbol) {
          acc[String(token.symbol).toUpperCase()] = token as Token
        }
        return acc
      }, {}),
    [],
  )
  const primaryTokenLabel = earnLabel ?? 'TOKEN'

  return (
    <Flex mb="10px" flexDirection="column" style={{ gap: '10px' }}>
      <RewardsPanel flexDirection="column" alignItems="flex-start">
        {header && <RewardsHeader>{header}</RewardsHeader>}
        <RewardsGrid>
          <RewardRow>
            <TokenLabel>
              <RewardTokenIcon token={primaryTokenLabel} tokenMeta={earningToken} />
              <Text bold color="textSubtle" textTransform="uppercase" fontSize="11px">
                {primaryTokenLabel}
              </Text>
            </TokenLabel>
            <RewardValue>
              <AnimatedValue $animate={isAnimating}>{displayValue}</AnimatedValue>
            </RewardValue>
          </RewardRow>
          {rewards.map((reward, index) => (
            <RewardRow key={index}>
              <TokenLabel>
                <RewardTokenIcon token={reward.token} tokenMeta={tokenBySymbol[String(reward.token).toUpperCase()]} />
                <Text bold color="textSubtle" textTransform="uppercase" fontSize="11px">
                  {reward.token}
                </Text>
              </TokenLabel>
              <RewardValue>
                <AnimatedValue $animate={isAnimating}>
                  {isAnimating
                    ? baseValue.multipliedBy(reward.percentage).dividedBy(100).toFixed(8, BigNumber.ROUND_DOWN)
                    : formatRewardAmount(baseValue.multipliedBy(reward.percentage).dividedBy(100))}
                </AnimatedValue>
              </RewardValue>
            </RewardRow>
          ))}
        </RewardsGrid>
        {earningsBusd > 0 && (
          <Balance fontSize="12px" color="textSubtle" decimals={2} value={earningsBusd} unit=" USD" prefix="~" />
        )}
        <HarvestButton
          disabled={rawEarningsBalance.eq(0) || pendingTx}
          variant="primary"
          onClick={async () => {
            const receipt = await fetchWithCatchTxError(() => {
              return onReward()
            })
            if (receipt?.status) {
              toastSuccess(
                `${t('Harvested')}!`,
                <ToastDescriptionWithTx txHash={receipt.transactionHash}>
                  {t('Your %symbol% earnings have been sent to your wallet!', { symbol: 'COLLECT' })}
                </ToastDescriptionWithTx>,
              )
              dispatch(fetchFarmUserDataAsync({ account, pids: [pid] }))
            }
          }}
        >
          {pendingTx ? t('Harvesting') : t('Harvest')}
        </HarvestButton>
      </RewardsPanel>
    </Flex>
  )
}

export default HarvestAction
