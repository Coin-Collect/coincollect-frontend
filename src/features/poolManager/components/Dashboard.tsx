import Link from 'next/link'
import AdminShell from './AdminShell'
import { usePoolManagerAuthority, usePoolManagerRegistry } from '../hooks'
import { loadPoolManagerDrafts } from '../storage'
import {
  AdminHeader,
  ActionButton,
  ButtonRow,
  LinkText,
  Metric,
  MetricGrid,
  MetricLabel,
  MetricValue,
  Muted,
  Notice,
  Panel,
  PanelTitle,
} from './styles'

export default function Dashboard() {
  const { data, loading, error, refresh } = usePoolManagerRegistry()
  const authority = usePoolManagerAuthority()
  const drafts = typeof window === 'undefined' ? [] : loadPoolManagerDrafts()
  const pools = data?.pools || []

  return (
    <AdminShell
      title="Pool Manager"
      subtitle="Read-only registry and wallet-controlled lifecycle tools for Polygon CoinStake pools."
    >
      {authority.state === 'CONTRACT_OWNER' ? (
        <Notice>
          Factory is contract-owned. Deployment requires a governance or multisig flow; this browser wallet cannot act
          as owner.
        </Notice>
      ) : null}
      {authority.state === 'WRONG_ACCOUNT' ? (
        <Notice>Connected wallet is not the factory owner. The UI keeps deployment controls disabled.</Notice>
      ) : null}
      {authority.error && authority.state === 'UNAVAILABLE' ? <Notice $error>{authority.error}</Notice> : null}
      {data?.discoveryWarning ? <Notice>{data.discoveryWarning}</Notice> : null}
      {error ? <Notice $error>{error}</Notice> : null}

      <MetricGrid>
        <Metric>
          <MetricLabel>Known pools</MetricLabel>
          <MetricValue>{loading ? '…' : pools.length}</MetricValue>
        </Metric>
        <Metric>
          <MetricLabel>Active</MetricLabel>
          <MetricValue>{pools.filter((pool) => pool.status === 'ACTIVE').length}</MetricValue>
        </Metric>
        <Metric>
          <MetricLabel>Upcoming</MetricLabel>
          <MetricValue>{pools.filter((pool) => pool.status === 'UPCOMING').length}</MetricValue>
        </Metric>
        <Metric>
          <MetricLabel>Finished</MetricLabel>
          <MetricValue>{pools.filter((pool) => pool.status === 'FINISHED').length}</MetricValue>
        </Metric>
        <Metric>
          <MetricLabel>Drafts / queue items</MetricLabel>
          <MetricValue>{drafts.length}</MetricValue>
        </Metric>
      </MetricGrid>

      <Panel>
        <AdminHeader>
          <div>
            <PanelTitle>Network authority</PanelTitle>
            <Muted>
              Polygon {data?.currentBlock ? `• block ${data.currentBlock}` : ''} • block time{' '}
              {data ? `${data.secondsPerBlock.toFixed(2)}s (${data.blockTimeSource})` : 'reading…'}
            </Muted>
          </div>
          <Muted>{authority.authorized ? 'Owner wallet verified' : authority.state.replace('_', ' ')}</Muted>
        </AdminHeader>
        <div>
          <Muted>Factory: </Muted>
          <code>{data?.factoryAddress || authority.factoryAddress || 'Unavailable'}</code>
        </div>
        <div>
          <Muted>Owner: </Muted>
          <code>{data?.factoryOwner || authority.ownerAddress || 'Reading…'}</code>
        </div>
        <ButtonRow>
          <ActionButton onClick={() => refresh()} disabled={loading}>
            Refresh registry
          </ActionButton>
          <Link href="/admin/pools/new" passHref legacyBehavior>
            <ActionButton as="a">Create pool</ActionButton>
          </Link>
          <Link href="/admin/pools" passHref legacyBehavior>
            <ActionButton as="a" $secondary>
              Open pool list
            </ActionButton>
          </Link>
        </ButtonRow>
      </Panel>
      <p style={{ marginTop: 20, fontSize: 13 }}>
        <LinkText href="/docs/pool-manager">Read the operator runbook</LinkText>{' '}
        <Muted>for deployment, funding and renewal safety checks.</Muted>
      </p>
    </AdminShell>
  )
}
