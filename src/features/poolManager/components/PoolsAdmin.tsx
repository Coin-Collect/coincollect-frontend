import { useMemo, useState } from 'react'
import Link from 'next/link'
import AdminShell from './AdminShell'
import { usePoolManagerRegistry } from '../hooks'
import { formatTokenAmount } from '../calculations'
import { saveRenewalPlan, loadRenewalPlan } from '../storage'
import { nextRenewalItem } from '../queue'
import { RenewalPlan, RenewalPlanItem } from '../types'
import {
  ActionButton,
  ButtonRow,
  Field,
  FormGrid,
  Input,
  LinkText,
  Muted,
  Notice,
  Panel,
  PanelTitle,
  Select,
  StatusPill,
  Table,
  TableWrap,
} from './styles'

export default function PoolsAdmin() {
  const { data, loading, error, refresh } = usePoolManagerRegistry()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('ALL')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [durationDays, setDurationDays] = useState('30')
  const [budget, setBudget] = useState<Record<string, string>>({})
  const [plan, setPlan] = useState<RenewalPlan | null>(() => (typeof window === 'undefined' ? null : loadRenewalPlan()))
  const pools = useMemo(
    () =>
      (data?.pools || []).filter((pool) => {
        const haystack = `${pool.address} ${pool.stakingToken.symbol} ${pool.rewardToken.symbol} ${
          pool.legacySousId || ''
        }`.toLowerCase()
        return (!query || haystack.includes(query.toLowerCase())) && (status === 'ALL' || pool.status === status)
      }),
    [data?.pools, query, status],
  )
  const finished = (data?.pools || []).filter((pool) => pool.status === 'FINISHED')

  const createPlan = () => {
    if (!data) return
    const items: RenewalPlanItem[] = finished
      .filter((pool) => selected[pool.canonicalId])
      .map((pool) => ({
        id: `renew-${pool.address.toLowerCase()}`,
        sourcePoolAddress: pool.address,
        stakingToken: pool.stakingToken.address,
        rewardToken: pool.rewardToken.address,
        durationDays,
        rewardBudget: budget[pool.canonicalId] || '',
        participantThreshold: formatTokenAmount(pool.participantThreshold, pool.stakingToken.decimals),
        poolLimitPerUser: formatTokenAmount(pool.poolLimitPerUser, pool.stakingToken.decimals),
        numberBlocksForUserLimit: String(pool.numberBlocksForUserLimit),
        poolAdmin: pool.owner || '',
        stakingSymbol: pool.stakingToken.symbol,
        rewardSymbol: pool.rewardToken.symbol,
        stakingDecimals: pool.stakingToken.decimals,
        rewardDecimals: pool.rewardToken.decimals,
        preserveEmission: true,
        status: 'DRAFT',
        updatedAt: Date.now(),
      }))
    const nextPlan: RenewalPlan = {
      id: `renewal-${Date.now()}`,
      name: 'Renewal dry-run plan',
      chainId: data.currentBlock ? 137 : 137,
      factoryAddress: data.factoryAddress,
      items,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    saveRenewalPlan(nextPlan)
    setPlan(nextPlan)
  }

  const exportPlan = () => {
    if (!plan) return
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${plan.id}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminShell
      title="Pools"
      subtitle="The registry merges legacy sous IDs with every SmartChef emitted by the configured factory."
    >
      {error ? <Notice $error>{error}</Notice> : null}
      {data?.discoveryWarning ? <Notice>{data.discoveryWarning}</Notice> : null}
      <Panel>
        <FormGrid>
          <Field>
            Search address or token
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="0x… / COLLECT / LOT" />
          </Field>
          <Field>
            Status
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="FINISHED">Finished</option>
            </Select>
          </Field>
        </FormGrid>
        <ButtonRow>
          <ActionButton onClick={() => refresh()} disabled={loading}>
            Refresh
          </ActionButton>
          <Muted>{loading ? 'Reading Polygon…' : `${pools.length} shown`}</Muted>
        </ButtonRow>
      </Panel>

      <Panel style={{ marginTop: 16 }}>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Pool</th>
                <th>Source</th>
                <th>Status</th>
                <th>Reward</th>
                <th>Schedule</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pools.map((pool) => (
                <tr key={pool.canonicalId}>
                  <td>
                    <LinkText href={`/admin/pools/${pool.address}`}>
                      {pool.stakingToken.symbol} → {pool.rewardToken.symbol}
                    </LinkText>
                    <br />
                    <Muted>
                      {pool.legacySousId ? `sousId ${pool.legacySousId} • ` : ''}
                      {pool.address.slice(0, 8)}…{pool.address.slice(-6)}
                    </Muted>
                  </td>
                  <td>{pool.source}</td>
                  <td>
                    <StatusPill $status={pool.status}>{pool.status}</StatusPill>
                  </td>
                  <td>
                    {formatTokenAmount(pool.rewardPerBlock, pool.rewardToken.decimals)} {pool.rewardToken.symbol}/block
                  </td>
                  <td>
                    {pool.startBlock.toLocaleString()} → {pool.bonusEndBlock.toLocaleString()}
                  </td>
                  <td>
                    <Link href={`/admin/pools/${pool.address}`}>Details</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
        {!loading && pools.length === 0 ? <Muted>No pools matched the current filters.</Muted> : null}
      </Panel>

      <Panel style={{ marginTop: 16 }}>
        <PanelTitle>Renewal plan (dry-run by default)</PanelTitle>
        <Muted>
          Select finished pools, define a budget per reward token and save a resumable plan. Each item still deploys and
          funds through separate wallet confirmations.
        </Muted>
        <Field style={{ maxWidth: 240, marginTop: 16 }}>
          New duration (days)
          <Input type="number" min="1" value={durationDays} onChange={(event) => setDurationDays(event.target.value)} />
        </Field>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Use</th>
                <th>Finished pool</th>
                <th>Budget ({finished[0]?.rewardToken.symbol || 'token'})</th>
                <th>Emission</th>
              </tr>
            </thead>
            <tbody>
              {finished.map((pool) => (
                <tr key={pool.canonicalId}>
                  <td>
                    <input
                      type="checkbox"
                      checked={Boolean(selected[pool.canonicalId])}
                      onChange={(event) => setSelected({ ...selected, [pool.canonicalId]: event.target.checked })}
                    />
                  </td>
                  <td>
                    {pool.stakingToken.symbol} → {pool.rewardToken.symbol}
                  </td>
                  <td>
                    <Input
                      value={budget[pool.canonicalId] || ''}
                      onChange={(event) => setBudget({ ...budget, [pool.canonicalId]: event.target.value })}
                      placeholder="0.0"
                    />
                  </td>
                  <td>{formatTokenAmount(pool.rewardPerBlock, pool.rewardToken.decimals)} / block previously</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
        <ButtonRow>
          <ActionButton onClick={createPlan} disabled={!finished.some((pool) => selected[pool.canonicalId])}>
            Save dry-run plan
          </ActionButton>
          {plan ? (
            <ActionButton $secondary onClick={exportPlan}>
              Export JSON
            </ActionButton>
          ) : null}
        </ButtonRow>
        {plan ? (
          <Notice>
            Saved plan {plan.id}: {plan.items.length} item(s). Next resumable item:{' '}
            {nextRenewalItem(plan)?.stakingSymbol || 'all items complete'}. The plan remains in local storage for
            resume.
          </Notice>
        ) : null}
        {plan?.items.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: '1px solid rgba(128,128,128,.15)',
            }}
          >
            <span>
              {item.stakingSymbol} → {item.rewardSymbol} <Muted>• {item.status}</Muted>
            </span>
            <Link href={`/admin/pools/new?source=${item.sourcePoolAddress}`}>Open in wizard</Link>
          </div>
        ))}
      </Panel>
    </AdminShell>
  )
}
