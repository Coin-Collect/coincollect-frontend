import Link from 'next/link'
import { useRouter } from 'next/router'
import AdminShell from './AdminShell'
import { usePoolManagerRegistry } from '../hooks'
import { formatTokenAmount, estimateBlockTimestamp, formatDate } from '../calculations'
import {
  LinkText,
  Metric,
  MetricGrid,
  MetricLabel,
  MetricValue,
  Muted,
  Notice,
  Panel,
  PanelTitle,
  StatusPill,
  Table,
  TableWrap,
} from './styles'

export default function PoolDetail() {
  const router = useRouter()
  const { data, loading, error } = usePoolManagerRegistry()
  const address = typeof router.query.address === 'string' ? router.query.address : ''
  const pool = data?.pools.find((item) => item.address.toLowerCase() === address.toLowerCase())

  return (
    <AdminShell
      title="Pool detail"
      subtitle="All values below are introspected from the SmartChef contract and its ERC20 balances."
    >
      {error ? <Notice $error>{error}</Notice> : null}
      {loading ? <Panel>Reading Polygon…</Panel> : null}
      {!loading && !pool ? (
        <Panel>
          Pool not found in the current factory registry. <Link href="/admin/pools">Return to pool list.</Link>
        </Panel>
      ) : null}
      {pool && data ? (
        <>
          <Panel>
            <PanelTitle>
              {pool.stakingToken.symbol} → {pool.rewardToken.symbol}{' '}
              <StatusPill $status={pool.status}>{pool.status}</StatusPill>
            </PanelTitle>
            <Muted>
              {pool.source}
              {pool.legacySousId ? ` • legacy sousId ${pool.legacySousId}` : ''} • {pool.address}
            </Muted>
            <MetricGrid style={{ marginTop: 18 }}>
              <Metric>
                <MetricLabel>Reward / block</MetricLabel>
                <MetricValue style={{ fontSize: 19 }}>
                  {formatTokenAmount(pool.rewardPerBlock, pool.rewardToken.decimals)} {pool.rewardToken.symbol}
                </MetricValue>
              </Metric>
              <Metric>
                <MetricLabel>Reward balance</MetricLabel>
                <MetricValue style={{ fontSize: 19 }}>
                  {formatTokenAmount(pool.rewardBalance, pool.rewardToken.decimals)}
                </MetricValue>
              </Metric>
              <Metric>
                <MetricLabel>Total staked</MetricLabel>
                <MetricValue style={{ fontSize: 19 }}>
                  {formatTokenAmount(pool.totalStaked, pool.stakingToken.decimals)}
                </MetricValue>
              </Metric>
              <Metric>
                <MetricLabel>Pool owner</MetricLabel>
                <MetricValue style={{ fontSize: 15 }}>{pool.owner?.slice(0, 8)}…</MetricValue>
              </Metric>
            </MetricGrid>
            <div style={{ lineHeight: 1.8, fontSize: 14 }}>
              <div>
                <Muted>Schedule:</Muted> {pool.startBlock.toLocaleString()} → {pool.bonusEndBlock.toLocaleString()}
              </div>
              <div>
                <Muted>Estimated dates:</Muted>{' '}
                {formatDate(
                  estimateBlockTimestamp(
                    data.currentBlock,
                    pool.startBlock,
                    data.currentTimestamp,
                    data.secondsPerBlock,
                  ),
                )}{' '}
                →{' '}
                {formatDate(
                  estimateBlockTimestamp(
                    data.currentBlock,
                    pool.bonusEndBlock,
                    data.currentTimestamp,
                    data.secondsPerBlock,
                  ),
                )}
              </div>
              <div>
                <Muted>Controls:</Muted> threshold{' '}
                {formatTokenAmount(pool.participantThreshold, pool.stakingToken.decimals)} {pool.stakingToken.symbol};
                user limit {pool.hasUserLimit ? 'enabled' : 'disabled'}
              </div>
              <div>
                <Muted>Max future scheduled emission:</Muted>{' '}
                {formatTokenAmount(
                  pool.rewardPerBlock.mul(pool.bonusEndBlock - pool.startBlock),
                  pool.rewardToken.decimals,
                )}{' '}
                {pool.rewardToken.symbol} <Muted>(schedule cap; not a funding guarantee)</Muted>
              </div>
            </div>
            <p>
              <LinkText href={`https://polygonscan.com/address/${pool.address}`} target="_blank" rel="noreferrer">
                Open on PolygonScan
              </LinkText>
              {pool.deploymentTransactionHash ? (
                <>
                  {' '}
                  ·{' '}
                  <LinkText
                    href={`https://polygonscan.com/tx/${pool.deploymentTransactionHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Deployment transaction
                  </LinkText>
                </>
              ) : null}
            </p>
            <Link href={`/admin/pools/new?source=${pool.address}`}>Renew as a new SmartChef</Link>
          </Panel>
          <Panel style={{ marginTop: 16 }}>
            <PanelTitle>On-chain configuration</PanelTitle>
            <TableWrap>
              <Table>
                <tbody>
                  <tr>
                    <th>Staking token</th>
                    <td>
                      {pool.stakingToken.address} ({pool.stakingToken.decimals} decimals)
                    </td>
                  </tr>
                  <tr>
                    <th>Reward token</th>
                    <td>
                      {pool.rewardToken.address} ({pool.rewardToken.decimals} decimals)
                    </td>
                  </tr>
                  <tr>
                    <th>Factory immutable</th>
                    <td>{pool.smartChefFactory}</td>
                  </tr>
                  <tr>
                    <th>Pool limit</th>
                    <td>{pool.poolLimitPerUser.toString()}</td>
                  </tr>
                  <tr>
                    <th>User-limit window</th>
                    <td>{pool.numberBlocksForUserLimit.toLocaleString()} blocks</td>
                  </tr>
                  <tr>
                    <th>Discovered</th>
                    <td>
                      {pool.discoveredAtBlock?.toLocaleString() || 'Unknown'} {pool.deploymentTransactionHash || ''}
                    </td>
                  </tr>
                </tbody>
              </Table>
            </TableWrap>
          </Panel>
        </>
      ) : null}
    </AdminShell>
  )
}
