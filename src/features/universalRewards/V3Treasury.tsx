import { useCallback, useState, type FormEvent } from 'react'
import styled from 'styled-components'
import { encodeFunctionData, getAddress, isAddressEqual, type Address } from 'viem'
import { treasuryVaultAbi } from './abi'
import { useV3Action, useV3Query } from './hooks'
import { shortAmount } from './presentation'
import { erc20Abi, MAX_V3_PAGE, readV3Catalogue } from './reader'
import type { V3Client, V3Deployment } from './runtime'
import { parseV3Amount, type V3StudioSnapshot } from './studio'
import { describeV3Error } from './transactions'
import { V3Actions, V3Button, V3Card, V3Error, V3Field, V3Muted, V3Section } from './styles'

const ZERO = BigInt(0)
const TableRegion = styled.div`
  overflow: auto;
  max-inline-size: 100%;
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
  }
  th,
  td {
    text-align: start;
    padding: 8px 12px;
    white-space: nowrap;
  }
  tbody th {
    position: sticky;
    inset-inline-start: 0;
    background: ({theme}) => theme.card.background;
  }
`

export default function V3Treasury({
  client,
  deployment,
  studio,
  account,
  onChange,
  getWallet,
  rightNetwork,
}: {
  client: V3Client
  deployment: V3Deployment
  studio: V3StudioSnapshot
  account?: Address
  onChange: () => void
  getWallet: Parameters<typeof useV3Action>[2]
  rightNetwork: boolean
}) {
  const [asset, setAsset] = useState('')
  const [amount, setAmount] = useState('')
  const [native, setNative] = useState(false)
  const [failure, setFailure] = useState('')
  const [offset, setOffset] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const action = useV3Action(client, deployment, getWallet, account)
  const treasury = studio.treasury
  const selected = studio.supported.find((token) => token.address === asset) ?? studio.supported[0]
  const owner = Boolean(account && treasury && isAddressEqual(account, treasury.owner))
  const locked = !owner || !rightNetwork || action.busy || action.unconfirmed || submitting
  const validNative = selected && isAddressEqual(selected.address, studio.wrappedNative)
  const load = useCallback(() => readV3Catalogue(client, deployment, offset, true), [client, deployment, offset])
  const liabilities = useV3Query(treasury ? `${treasury.address}:liabilities:${offset}` : '', load, 45_000)
  const loadRecent = useCallback(async () => {
    if (!treasury) return []
    const toBlock = await client.getBlockNumber()
    const fromBlock = toBlock > BigInt(2000) ? toBlock - BigInt(2000) : ZERO
    const logs = await client.getContractEvents({
      address: treasury.address,
      abi: treasuryVaultAbi,
      fromBlock,
      toBlock,
      strict: true,
    })
    return logs.slice(-12).reverse()
  }, [client, treasury])
  const recent = useV3Query(treasury ? `${treasury.address}:activity` : '', loadRecent, 30_000)
  if (!treasury) return null

  const refresh = () => {
    onChange()
    liabilities.refresh()
    recent.refresh()
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!account || !selected || selected.decimals === null || locked || treasury.paused) return
    const operation = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value')
    setSubmitting(true)
    setFailure('')
    try {
      const value = parseV3Amount(amount, selected.decimals, 'treasury amount')
      const payNative = native && validNative && operation === 'deposit'
      if (operation === 'withdraw') {
        if (value > (selected.balance?.available ?? ZERO))
          throw new Error('This amount exceeds available treasury funds.')
      } else if (!payNative) {
        const [allowance, balance] = await Promise.all([
          client.readContract({
            address: selected.address,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [account, treasury.address],
          }),
          client.readContract({ address: selected.address, abi: erc20Abi, functionName: 'balanceOf', args: [account] }),
        ])
        if (value > balance) throw new Error('The treasury owner does not have enough of this token.')
        if (allowance < value) {
          const data = encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [treasury.address, value] })
          if (!(await action.run({ to: selected.address, data }))) return
        }
      }
      const data = encodeFunctionData({
        abi: treasuryVaultAbi,
        functionName: operation === 'withdraw' ? 'withdraw' : 'deposit',
        args: [selected.address, value],
      })
      if (await action.run({ to: treasury.address, data, value: payNative ? value : ZERO })) setAmount('')
    } catch (error) {
      setFailure(describeV3Error(error))
    } finally {
      setSubmitting(false)
      refresh()
    }
  }

  return (
    <V3Section aria-label="Central Treasury">
      <V3Card>
        <div>
          <h2>Central Treasury</h2>
          <V3Muted>Only available funds can be withdrawn. Allocated funds are held in the pool ledger.</V3Muted>
          <V3Muted role="status">{treasury.paused ? 'Treasury paused' : 'Treasury open'}</V3Muted>
          <TableRegion role="region" aria-label="Treasury balances by asset" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  {[
                    'Asset',
                    'Available',
                    'Deposited',
                    'Allocated',
                    'Spent',
                    'Funding returned',
                    'Rewards returned',
                    'Withdrawn',
                  ].map((label) => (
                    <th scope="col" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {studio.supported.map(({ address, decimals, symbol, balance }) => (
                  <tr key={address}>
                    <th scope="row">{symbol}</th>
                    {balance &&
                      [
                        balance.available,
                        balance.deposited,
                        balance.allocated,
                        balance.spent,
                        balance.fundingReturned,
                        balance.rewardsReturned,
                        balance.withdrawn,
                      ].map((value, index) => <td key={index}>{shortAmount(value, decimals)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableRegion>
          {owner && selected && (
            <form onSubmit={submit} aria-label="Manage available treasury assets">
              <V3Actions>
                <V3Field>
                  Asset
                  <select
                    name="treasury-asset"
                    value={selected.address}
                    onChange={(event) => {
                      setAsset(event.target.value)
                      setNative(false)
                    }}
                  >
                    {studio.supported.map(({ address, symbol }) => (
                      <option key={address} value={address}>
                        {symbol}
                      </option>
                    ))}
                  </select>
                </V3Field>
                <V3Field>
                  Amount
                  <input
                    required
                    name="treasury-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </V3Field>
                {validNative && (
                  <label>
                    <input
                      type="checkbox"
                      name="treasury-native"
                      checked={native}
                      onChange={(event) => setNative(event.target.checked)}
                    />{' '}
                    Deposit native POL as WPOL
                  </label>
                )}
                <V3Button type="submit" value="deposit" disabled={locked || treasury.paused}>
                  Deposit
                </V3Button>
                <V3Button type="submit" value="withdraw" $secondary disabled={locked || treasury.paused}>
                  Withdraw available
                </V3Button>
                <V3Button
                  type="button"
                  $secondary
                  disabled={locked}
                  onClick={async () => {
                    const data = encodeFunctionData({
                      abi: treasuryVaultAbi,
                      functionName: 'setPaused',
                      args: [!treasury.paused],
                    })
                    if (await action.run({ to: treasury.address, data })) refresh()
                  }}
                >
                  {treasury.paused ? 'Resume treasury' : 'Pause treasury'}
                </V3Button>
              </V3Actions>
            </form>
          )}
          {action.message && <V3Muted role="status">{action.message}</V3Muted>}
          {(failure || action.error) && <V3Error role="alert">{failure || action.error}</V3Error>}
          {action.unconfirmed && (
            <V3Button
              type="button"
              $secondary
              onClick={async () => {
                if (await action.recheck()) refresh()
              }}
            >
              Verify pending transaction
            </V3Button>
          )}
        </div>
      </V3Card>
      <V3Card>
        <div>
          <h2>Reward inventory and NFT liabilities by pool</h2>
          {liabilities.loading && !liabilities.data && <V3Muted role="status">Reading pool reserves…</V3Muted>}
          {liabilities.error && <V3Error role="alert">{liabilities.error}</V3Error>}
          <TableRegion role="region" aria-label="Pool reward liabilities" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Pool and asset</th>
                  <th scope="col">Reward inventory</th>
                  <th scope="col">Reserved NFT claims</th>
                </tr>
              </thead>
              <tbody>
                {liabilities.data?.pools.flatMap((pool) =>
                  pool.rewards.map(({ token, symbol, decimals, inventory, settlement }) => (
                    <tr key={`${pool.poolId}:${token}`}>
                      <th scope="row">
                        #{pool.poolId.toString()} · {symbol}
                      </th>
                      <td>{shortAmount(inventory, decimals)}</td>
                      <td>
                        {settlement ? shortAmount(settlement.claimLiability, (decimals ?? 0) + 18) : 'Unavailable'}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </TableRegion>
          <V3Actions>
            {offset > 0 && (
              <V3Button type="button" $secondary onClick={() => setOffset(offset - MAX_V3_PAGE)}>
                Previous pools
              </V3Button>
            )}
            {(liabilities.data?.total ?? ZERO) > BigInt(offset + MAX_V3_PAGE) && (
              <V3Button type="button" $secondary onClick={() => setOffset(offset + MAX_V3_PAGE)}>
                Next pools
              </V3Button>
            )}
          </V3Actions>
        </div>
      </V3Card>
      <V3Card>
        <div>
          <h2>Recent treasury transactions</h2>
          <V3Muted>Confirmed events from the last 2,000 blocks.</V3Muted>
          {recent.error && <V3Error role="alert">{recent.error}</V3Error>}
          {recent.data?.length === 0 && <V3Muted>No treasury transactions in this range.</V3Muted>}
          {recent.data?.map((log) => {
            const address = 'token' in log.args ? getAddress(log.args.token) : undefined
            const info = studio.supported.find((token) => token.address === address)
            return (
              <V3Muted key={`${log.transactionHash}:${log.logIndex}`}>
                {log.eventName}
                {info &&
                  'amount' in log.args &&
                  ` · ${shortAmount(log.args.amount, info.decimals)} ${info.symbol}`} ·{' '}
                <code>{log.transactionHash.slice(0, 12)}…</code>
              </V3Muted>
            )
          })}
        </div>
      </V3Card>
    </V3Section>
  )
}
