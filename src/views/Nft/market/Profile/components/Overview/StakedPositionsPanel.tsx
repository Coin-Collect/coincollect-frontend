import { useCallback, useMemo } from 'react'
import styled from 'styled-components'
import BigNumber from 'bignumber.js'
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  Link,
  Skeleton,
  Tag,
  Text,
  Button,
  useModal,
} from '@pancakeswap/uikit'
import { NextLinkFromReactRouter } from 'components/NextLink'
import { formatNumber, getBalanceNumber, getFullDisplayBalance } from 'utils/formatBalance'
import { useTranslation } from 'contexts/Localization'
import HarvestAction from 'views/NftFarms/components/FarmCard/HarvestAction'
import FarmHarvestAction from 'views/Farms/components/FarmCard/HarvestAction'
import CollectModal from 'views/Pools/components/PoolCard/Modals/CollectModal'
import { OverviewCategory, OverviewPosition, OverviewRefreshers } from '../../hooks/useProfileDefiOverview'

const StyledCard = styled(Card)`
  margin-bottom: 24px;
`;

const PositionRow = styled(Flex)`
  flex-direction: column;
  border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};
  padding: 16px 0;

  &:last-child {
    border-bottom: none;
  }
`;

const PositionHeader = styled(Flex)`
  justify-content: space-between;
  align-items: flex-start;
  flex-direction: column;

  ${({ theme }) => theme.mediaQueries.md} {
    flex-direction: row;
    align-items: center;
  }
`;

const MetricsContainer = styled(Flex)`
  flex-wrap: wrap;
  margin-top: 12px;
  gap: 12px;
`;

const Metric = styled(Flex)`
  flex-direction: column;
  min-width: 120px;
`;

interface StakedPositionsPanelProps {
  categories: OverviewCategory[]
  isAccountMatch: boolean
  isLoading: boolean
  refreshers: OverviewRefreshers
}

const formatStakeAmount = (amount: BigNumber, decimals: number) => {
  const value = getBalanceNumber(amount, decimals)
  if (value === 0) {
    return '0'
  }
  if (value < 0.01) {
    return value.toFixed(4)
  }
  return formatNumber(value, 0, 2)
}

const PositionActions: React.FC<{ position: OverviewPosition; refreshers: OverviewRefreshers }> = ({ position, refreshers }) => {
  const { t } = useTranslation()

  const handleSuccess = useCallback(async () => {
    switch (position.type) {
      case 'nftFarm':
        await refreshers.nftFarms()
        break
      case 'liquidityFarm':
        await refreshers.liquidityFarms()
        break
      case 'pool':
        await refreshers.pools()
        break
      case 'vault':
        await refreshers.vaults()
        break
      default:
        break
    }
  }, [position.type, refreshers])

  if (position.type === 'nftFarm') {
    return (
      <HarvestAction
        earnings={position.pendingRewards[0]?.amount}
        pid={position.pid}
        earnLabel={position.earningTokenSymbol}
        sideRewards={position.sideRewards ?? []}
        earningToken={position.earningToken}
        onHarvestSuccess={handleSuccess}
      />
    )
  }

  if (position.type === 'liquidityFarm') {
    return <FarmHarvestAction earnings={position.pendingRewards[0]?.amount} pid={position.pid} onHarvestSuccess={handleSuccess} />
  }

  const pendingReward = position.pendingRewards[0]
  const formattedBalance = pendingReward
    ? formatNumber(getBalanceNumber(pendingReward.amount, pendingReward.decimals), 0, 5)
    : '0'
  const fullBalance = pendingReward ? getFullDisplayBalance(pendingReward.amount, pendingReward.decimals) : '0'
  const hasPending = Boolean(pendingReward && !pendingReward.amount.isZero())

  const [onPresentCollect] = useModal(
    <CollectModal
      formattedBalance={formattedBalance}
      fullBalance={fullBalance}
      earningToken={position.earningToken}
      earningsDollarValue={0}
      sousId={position.sousId ?? 0}
      isBnbPool={false}
      isCompoundPool={position.type === 'vault'}
      onTxSuccess={handleSuccess}
    />,
  )

  return (
    <Flex justifyContent="flex-end">
      <Button onClick={onPresentCollect} disabled={!hasPending || !position.earningToken} variant="secondary">
        {position.type === 'vault' ? t('Compound / Harvest') : t('Harvest')}
      </Button>
    </Flex>
  )
}

const PositionDetails: React.FC<{ position: OverviewPosition; refreshers: OverviewRefreshers }> = ({ position, refreshers }) => {
  const { t } = useTranslation()
  const aprText = position.aprLabel ?? (position.apr ? `${position.apr}` : t('N/A'))
  const stakedText = formatStakeAmount(position.staked, position.stakedDecimals)
  const pendingToken = position.pendingRewards[0]
  const pendingDisplay = pendingToken
    ? `${formatStakeAmount(pendingToken.amount, pendingToken.decimals)} ${pendingToken.token}`
    : t('N/A')

  return (
    <PositionRow>
      <PositionHeader>
        <Box>
          {position.href ? (
            <Link as={NextLinkFromReactRouter} to={position.href} color="primary" bold>
              {position.label}
            </Link>
          ) : (
            <Heading scale="md">{position.label}</Heading>
          )}
          <Tag variant="secondary" mt="8px">
            {position.type === 'nftFarm'
              ? t('NFT Farm')
              : position.type === 'liquidityFarm'
              ? t('Liquidity Farm')
              : position.type === 'vault'
              ? t('Vault')
              : t('Pool')}
          </Tag>
        </Box>
        <Box mt="12px" width="100%">
          <PositionActions position={position} refreshers={refreshers} />
        </Box>
      </PositionHeader>
      <MetricsContainer>
        <Metric>
          <Text color="textSubtle" fontSize="12px">
            {t('Staked')}
          </Text>
          <Heading scale="sm">{stakedText}</Heading>
        </Metric>
        <Metric>
          <Text color="textSubtle" fontSize="12px">
            {t('Pending rewards')}
          </Text>
          <Heading scale="sm">{pendingDisplay}</Heading>
        </Metric>
        <Metric>
          <Text color="textSubtle" fontSize="12px">
            {t('APR')}
          </Text>
          <Heading scale="sm">{aprText}</Heading>
        </Metric>
      </MetricsContainer>
    </PositionRow>
  )
}

const StakedPositionsPanel: React.FC<StakedPositionsPanelProps> = ({ categories, isAccountMatch, isLoading, refreshers }) => {
  const { t } = useTranslation()
  const visibleCategories = useMemo(() => categories.filter((category) => category.positions.length > 0), [categories])

  if (!isAccountMatch) {
    return (
      <StyledCard>
        <CardBody>
          <Text>{t('Connect your wallet to view your staking overview.')}</Text>
        </CardBody>
      </StyledCard>
    )
  }

  if (isLoading) {
    return (
      <StyledCard>
        <CardBody>
          <Skeleton height="200px" width="100%" />
        </CardBody>
      </StyledCard>
    )
  }

  if (visibleCategories.length === 0) {
    return (
      <StyledCard>
        <CardBody>
          <Text>{t('You have no active staking positions yet.')}</Text>
        </CardBody>
      </StyledCard>
    )
  }

  return (
    <Box>
      {visibleCategories.map((category) => (
        <StyledCard key={category.key}>
          <CardHeader>
            <Heading scale="md">{category.label}</Heading>
          </CardHeader>
          <CardBody>
            {category.positions.map((position) => (
              <PositionDetails key={position.id} position={position} refreshers={refreshers} />
            ))}
          </CardBody>
        </StyledCard>
      ))}
    </Box>
  )
}

export default StakedPositionsPanel
