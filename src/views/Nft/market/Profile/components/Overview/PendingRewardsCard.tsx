import styled from 'styled-components'
import { Card, CardBody, CardHeader, Flex, Heading, Skeleton, Tag, Text } from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'
import { formatNumber, getBalanceNumber } from 'utils/formatBalance'
import { RewardBreakdownEntry } from '../../hooks/useProfileDefiOverview'

const StyledCard = styled(Card)`
  margin-bottom: 24px;
`;

const Badge = styled(Tag)`
  margin-right: 8px;
  margin-bottom: 8px;
`;

interface PendingRewardsCardProps {
  breakdown: RewardBreakdownEntry[]
  positionsCount: number
  isAccountMatch: boolean
  isLoading: boolean
}

const PendingRewardsCard: React.FC<PendingRewardsCardProps> = ({ breakdown, positionsCount, isAccountMatch, isLoading }) => {
  const { t } = useTranslation()

  if (!isAccountMatch) {
    return null
  }

  if (isLoading) {
    return (
      <StyledCard>
        <CardHeader>
          <Heading scale="md">{t('Pending rewards')}</Heading>
        </CardHeader>
        <CardBody>
          <Skeleton height="120px" width="100%" />
        </CardBody>
      </StyledCard>
    )
  }

  const totals = breakdown.map((entry) => ({
    token: entry.token,
    amount: getBalanceNumber(entry.amount, entry.decimals),
  }))

  const totalValue = totals.reduce((accum, entry) => accum + entry.amount, 0)

  return (
    <StyledCard>
      <CardHeader>
        <Heading scale="md">{t('Pending rewards')}</Heading>
      </CardHeader>
      <CardBody>
        <Flex justifyContent="space-between" alignItems="center" mb="16px" flexWrap="wrap">
          <Text color="textSubtle">{t('Active positions')}</Text>
          <Heading scale="lg">{positionsCount}</Heading>
        </Flex>
        <Flex flexDirection="column">
          <Text color="textSubtle" fontSize="12px" mb="8px">
            {t('Reward breakdown')}
          </Text>
          <Flex flexWrap="wrap">
            {totals.length === 0 ? (
              <Text color="textSubtle">{t('No pending rewards')}</Text>
            ) : (
              totals.map((entry) => {
                const percentage = totalValue > 0 ? (entry.amount / totalValue) * 100 : 0
                return (
                  <Badge key={entry.token} variant="secondary">
                    {`${entry.token}: ${formatNumber(entry.amount, 0, 4)} (${percentage.toFixed(1)}%)`}
                  </Badge>
                )
              })
            )}
          </Flex>
        </Flex>
      </CardBody>
    </StyledCard>
  )
}

export default PendingRewardsCard
