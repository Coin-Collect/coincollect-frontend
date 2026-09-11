import { useEffect, useMemo, useState } from 'react'
import { Contract } from '@ethersproject/contracts'
import { BigNumber } from '@ethersproject/bignumber'
import erc20Abi from 'config/abi/erc20.json'
import useWeb3React from 'hooks/useWeb3React'
import AdminShell from './AdminShell'
import { usePoolManagerRegistry } from '../hooks'
import { loadPoolManagerDrafts } from '../storage'
import { formatTokenAmount, parseTokenAmount } from '../calculations'
import { simplePolygonRpcProvider } from 'utils/providers'
import {
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
  Table,
  TableWrap,
} from './styles'

export default function Treasury() {
  const { data, loading, error, refresh } = usePoolManagerRegistry()
  const { account } = useWeb3React()
  const [walletBalances, setWalletBalances] = useState<Record<string, BigNumber>>({})
  const drafts = typeof window === 'undefined' ? [] : loadPoolManagerDrafts()
  const aggregates = useMemo(() => {
    const map = new Map<
      string,
      { symbol: string; decimals: number; balance: BigNumber; scheduled: BigNumber; planned: BigNumber; pools: number }
    >()
    ;(data?.pools || []).forEach((pool) => {
      const key = pool.rewardToken.address.toLowerCase()
      const current = map.get(key) || {
        symbol: pool.rewardToken.symbol,
        decimals: pool.rewardToken.decimals,
        balance: BigNumber.from(0),
        scheduled: BigNumber.from(0),
        planned: BigNumber.from(0),
        pools: 0,
      }
      current.balance = current.balance.add(pool.rewardBalance)
      current.scheduled = current.scheduled.add(
        pool.rewardPerBlock.mul(
          Math.max(0, pool.bonusEndBlock - Math.max(pool.startBlock, data?.currentBlock || pool.startBlock)),
        ),
      )
      current.pools += 1
      map.set(key, current)
    })
    drafts.forEach((draft) => {
      const rewardPool = data?.pools.find(
        (pool) => pool.rewardToken.address.toLowerCase() === draft.rewardToken.toLowerCase(),
      )
      if (!rewardPool) return
      const key = rewardPool.rewardToken.address.toLowerCase()
      const current = map.get(key) || {
        symbol: rewardPool.rewardToken.symbol,
        decimals: rewardPool.rewardToken.decimals,
        balance: BigNumber.from(0),
        scheduled: BigNumber.from(0),
        planned: BigNumber.from(0),
        pools: 0,
      }
      try {
        current.planned = current.planned.add(parseTokenAmount(draft.rewardBudget || '0', current.decimals))
      } catch {
        /* Invalid drafts remain visible in the wizard. */
      }
      map.set(key, current)
    })
    return Array.from(map.entries())
  }, [data?.pools, data?.currentBlock, drafts])

  useEffect(() => {
    let active = true
    if (!account || !data) return undefined
    Promise.all(
      aggregates.map(
        async ([address]) =>
          [
            address,
            BigNumber.from(await new Contract(address, erc20Abi, simplePolygonRpcProvider).balanceOf(account)),
          ] as const,
      ),
    )
      .then((entries) => active && setWalletBalances(Object.fromEntries(entries)))
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [account, aggregates, data])

  const planned = aggregates.reduce((total, [, aggregate]) => total.add(aggregate.planned), BigNumber.from(0))

  return (
    <AdminShell
      title="Treasury"
      subtitle="Aggregated reward balances and schedule caps help operators prepare funding without implying that a pool is fully funded."
    >
      {error ? <Notice $error>{error}</Notice> : null}
      <MetricGrid>
        <Metric>
          <MetricLabel>Reward tokens tracked</MetricLabel>
          <MetricValue>{aggregates.length}</MetricValue>
        </Metric>
        <Metric>
          <MetricLabel>Known active pools</MetricLabel>
          <MetricValue>{data?.pools.filter((pool) => pool.status === 'ACTIVE').length || 0}</MetricValue>
        </Metric>
        <Metric>
          <MetricLabel>Draft budget total</MetricLabel>
          <MetricValue>{formatTokenAmount(planned, 18)} base units</MetricValue>
        </Metric>
      </MetricGrid>
      <Panel>
        <PanelTitle>Reward token coverage</PanelTitle>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Pool balance</th>
                <th>Max future schedule</th>
                <th>Planned drafts</th>
                <th>Wallet balance</th>
                <th>Signal</th>
              </tr>
            </thead>
            <tbody>
              {aggregates.map(([address, aggregate]) => {
                const wallet = walletBalances[address] || BigNumber.from(0)
                const enough = aggregate.balance.gte(aggregate.scheduled.add(aggregate.planned))
                return (
                  <tr key={address}>
                    <td>
                      <LinkText href={`https://polygonscan.com/token/${address}`} target="_blank" rel="noreferrer">
                        {aggregate.symbol}
                      </LinkText>
                      <br />
                      <Muted>{address.slice(0, 8)}…</Muted>
                    </td>
                    <td>{formatTokenAmount(aggregate.balance, aggregate.decimals)}</td>
                    <td>{formatTokenAmount(aggregate.scheduled, aggregate.decimals)}</td>
                    <td>{formatTokenAmount(aggregate.planned, aggregate.decimals)}</td>
                    <td>{account ? formatTokenAmount(wallet, aggregate.decimals) : 'Connect wallet'}</td>
                    <td>{enough ? 'Pool balances cover schedule + drafts' : 'Funding review needed'}</td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </TableWrap>
        {!loading && aggregates.length === 0 ? <Muted>No reward-token balances were discovered.</Muted> : null}
        <ButtonRow>
          <ActionButton onClick={() => refresh()} disabled={loading}>
            Refresh balances
          </ActionButton>
          <Muted>Coverage is an operator signal, not a claim of guaranteed future payouts.</Muted>
        </ButtonRow>
      </Panel>
    </AdminShell>
  )
}
