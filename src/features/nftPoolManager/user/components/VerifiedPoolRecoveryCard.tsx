import { Button, Card, Flex, Heading, Text } from '@pancakeswap/uikit'
import { NextLinkFromReactRouter } from 'components/NextLink'
import { useTranslation } from 'contexts/Localization'
import type { VerifiedNftPool } from '../../publication'
import type { V2UserPositionSummary } from '../types'

export default function VerifiedPoolRecoveryCard({
  pool,
  summary,
  error,
}: {
  pool: VerifiedNftPool
  summary: V2UserPositionSummary
  error?: string
}) {
  const { t } = useTranslation()
  return (
    <Card p="16px" style={{ width: '100%', border: '1px solid rgba(255, 178, 55, 0.55)' }}>
      <Flex flexDirection="column" style={{ gap: 8 }}>
        <Heading scale="md">{pool.metadata.name}</Heading>
        <Text color="warning" bold small>
          {t('New staking unavailable')}
        </Text>
        <Text small>
          {summary.state === 'positive'
            ? t('Verified position: {{count}} NFT · {{power}} power', {
                count: summary.count || '—',
                power: summary.power || '—',
              })
            : t('A previously verified position is retained while the fresh chain read is unavailable.')}
        </Text>
        {summary.stale || error ? (
          <Text small color="warning" role="status">
            {error ||
              summary.error ||
              t('Showing your last verified position. Recovery actions require fresh validation.')}
          </Text>
        ) : null}
        <NextLinkFromReactRouter to={`/nftpools/pool/${pool.address}`}>
          <Button variant="secondary" width="100%">
            {t('Open recovery details')}
          </Button>
        </NextLinkFromReactRouter>
      </Flex>
    </Card>
  )
}
