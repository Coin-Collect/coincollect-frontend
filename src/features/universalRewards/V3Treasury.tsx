import { useCallback, useState, type FormEvent } from 'react'
import styled from 'styled-components'
import { encodeFunctionData, getAddress, isAddressEqual, type Address } from 'viem'
import { treasuryVaultAbi } from './abi'
import { treasuryVaultV36Abi } from './abiV36'
import V36Treasury from './V36Treasury'
import { useV3Action, useV3Query } from './hooks'
import { shortAmount } from './presentation'
import { erc20Abi, MAX_V3_PAGE, readV3Catalogue } from './reader'
import type { V3Client, V3Deployment } from './runtime'
import { parseV3Amount, type V3StudioSnapshot } from './studio'
import { describeV3Error } from './transactions'
import { V3Actions, V3Button, V3Card, V3Error, V3Field, V3Muted, V3Section } from './styles'

const ZERO = BigInt(0)
const TreasurySection = styled(V3Section)<{ $dynamic: boolean }>`
  ${({ $dynamic }) => $dynamic && 'display: grid; gap: 16px;'}
`
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
    background: ${({ theme }) => theme.colors.backgroundAlt};
  }
`

const LiabilityTableRegion = styled(TableRegion)`
  thead th {
    white-space: normal;
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
  const [historyEnd, setHistoryEnd] = useState<bigint>()
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
    if (!treasury) return undefined
    const toBlock = historyEnd ?? (await client.getBlockNumber())
    const fromBlock = toBlock > BigInt(2000) ? toBlock - BigInt(2000) : ZERO
    const logs = await client.getContractEvents({
      address: treasury.address,
      abi: treasuryVaultV36Abi,
      fromBlock,
      toBlock,
      strict: true,
    })
    const unwrapped = new Set(
      logs.filter(({ eventName }) => eventName === 'NativeWithdrawn').map(({ transactionHash }) => transactionHash),
    )
    return {
      fromBlock,
      toBlock,
      logs: logs.filter((log) => log.eventName !== 'Withdrawn' || !unwrapped.has(log.transactionHash)).reverse(),
    }
  }, [client, treasury, historyEnd])
  const recent = useV3Query(
    treasury ? `${treasury.address}:activity:${historyEnd ?? 'latest'}` : '',
    loadRecent,
    30_000,
  )
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
      if (operation === 'withdraw' || operation === 'withdraw-native') {
        if (value > (selected.balance?.available ?? ZERO))
          throw new Error('This amount exceeds available treasury funds.')
      } else if (!selected.canDeposit) {
        throw new Error('Treasury deposits are disabled for this token.')
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
      if (operation === 'withdraw-native' && (!treasury.v36 || !validNative)) return
      const data =
        operation === 'withdraw-native'
          ? encodeFunctionData({ abi: treasuryVaultV36Abi, functionName: 'withdrawNative', args: [value] })
          : encodeFunctionData({
              abi: treasuryVaultAbi,
              functionName: operation === 'withdraw' ? 'withdraw' : 'deposit',
              args: [selected.address, value],
            })
      if (
        await action.run({
          to: treasury.address,
          data,
          value: payNative ? value : ZERO,
        })
      )
        setAmount('')
    } catch (error) {
      setFailure(describeV3Error(error))
    } finally {
      setSubmitting(false)
      refresh()
    }
  }

  const controls = (
    <>
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
            <V3Button type="submit" value="deposit" disabled={locked || treasury.paused || !selected.canDeposit}>
              Deposit
            </V3Button>
            <V3Button type="submit" value="withdraw" $secondary disabled={locked || treasury.paused}>
              Withdraw available
            </V3Button>
            {treasury.v36 && validNative && (
              <V3Button
                type="submit"
                value="withdraw-native"
                $secondary
                disabled={locked || treasury.paused || !selected.review?.valid}
              >
                Withdraw as native POL
              </V3Button>
            )}
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
    </>
  )

  return (
    <TreasurySection aria-label="Central Treasury" $dynamic={Boolean(treasury.v36)}>
      {treasury.v36 ? (
        <V36Treasury
          client={client}
          deployment={deployment}
          treasury={{ ...treasury, v36: treasury.v36 }}
          studio={studio}
          account={account}
          action={action}
          refresh={refresh}
          locked={locked}
          controls={controls}
        />
      ) : (
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
            {controls}
          </div>
        </V3Card>
      )}
      <V3Card>
        <div>
          <h2>Reward inventory and NFT liabilities by pool</h2>
          {liabilities.loading && !liabilities.data && <V3Muted role="status">Reading pool reserves…</V3Muted>}
          {liabilities.error && <V3Error role="alert">{liabilities.error}</V3Error>}
          <LiabilityTableRegion role="region" aria-label="Pool reward liabilities" tabIndex={0}>
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
          </LiabilityTableRegion>
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
          <V3Muted>
            {recent.data
              ? `Confirmed events in blocks ${recent.data.fromBlock}–${recent.data.toBlock}.`
              : 'Reading confirmed Treasury events…'}
          </V3Muted>
          {recent.error && <V3Error role="alert">{recent.error}</V3Error>}
          {recent.data?.logs.length === 0 && <V3Muted>No treasury transactions in this range.</V3Muted>}
          {recent.data?.logs.map((log) => {
            const tokenFor = (address: Address) =>
              studio.supported.find((token) => token.address === getAddress(address))
            const format = (address: Address, amount: bigint) => {
              const token = tokenFor(address)
              return `${shortAmount(amount, token?.decimals ?? null)} ${token?.symbol ?? address.slice(0, 8)}`
            }
            const description =
              log.eventName === 'NativeWithdrawn'
                ? `Withdrawn as native POL · ${shortAmount(log.args.amount, 18)} POL`
                : log.eventName === 'TreasurySwap'
                ? `Swap ${format(log.args.input, log.args.amountIn)} → ${format(log.args.output, log.args.amountOut)}`
                : log.eventName === 'Recovered'
                ? `${log.args.reward ? 'Recovered rewards' : 'Recovered funding'} · Pool #${log.args.poolId} · ${format(
                    log.args.token,
                    log.args.amount,
                  )}`
                : [
                    log.eventName,
                    'poolId' in log.args && `Pool #${log.args.poolId}`,
                    'token' in log.args && 'amount' in log.args && format(log.args.token, log.args.amount),
                  ]
                    .filter(Boolean)
                    .join(' · ')
            return (
              <V3Muted key={`${log.transactionHash}:${log.logIndex}`}>
                {description} ·{' '}
                {deployment.chainId === 137 ? (
                  <a href={`https://polygonscan.com/tx/${log.transactionHash}`} target="_blank" rel="noreferrer">
                    <code>{log.transactionHash.slice(0, 12)}…</code>
                  </a>
                ) : (
                  <code>{log.transactionHash.slice(0, 12)}…</code>
                )}
              </V3Muted>
            )
          })}
          <V3Actions>
            {historyEnd !== undefined && (
              <V3Button type="button" $secondary onClick={() => setHistoryEnd(undefined)}>
                Latest blocks
              </V3Button>
            )}
            {recent.data && recent.data.fromBlock > ZERO && (
              <V3Button
                type="button"
                $secondary
                onClick={() =>
                  setHistoryEnd(recent.data?.fromBlock === undefined ? undefined : recent.data.fromBlock - BigInt(1))
                }
              >
                Older blocks
              </V3Button>
            )}
          </V3Actions>
        </div>
      </V3Card>
    </TreasurySection>
  )
}
