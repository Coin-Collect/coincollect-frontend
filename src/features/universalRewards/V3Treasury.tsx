import { useCallback, useState, type FormEvent } from 'react'
import styled from 'styled-components'
import { HistoryIcon } from '@pancakeswap/uikit'
import { encodeFunctionData, formatUnits, getAddress, isAddressEqual, type Address } from 'viem'
import { treasuryVaultAbi } from './abi'
import { treasuryVaultV36Abi } from './abiV36'
import V36Treasury from './V36Treasury'
import V3WalletError from './V3WalletError'
import { useV3Action, useV3Query } from './hooks'
import { shortAmount } from './presentation'
import { erc20Abi, MAX_V3_PAGE, readV3Catalogue } from './reader'
import type { V3Client, V3Deployment } from './runtime'
import { parseV3Amount, type V3StudioSnapshot } from './studio'
import {
  PanelBody,
  PanelHeading,
  SolidAction,
  TreasuryPanel,
  TreasuryTable,
  treasuryBalance,
  TreasuryAssetIcon,
  type TreasuryOperation,
} from './treasuryLayout'
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

const TransferForm = styled.form`
  display: grid;
  gap: 14px;
  min-width: 0;

  select,
  input:not([type='checkbox']) {
    min-height: 48px;
    font-size: 1rem;
  }

  :is(input, select, button):focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const SelectedBalance = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 5px 10px;
  min-width: 0;
  padding: 12px;
  border-radius: 11px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  background: ${({ theme }) => theme.colors.background};
  font-variant-numeric: tabular-nums;

  strong,
  small {
    overflow-wrap: anywhere;
  }
  > div small {
    display: block;
  }
  small {
    color: ${({ theme }) => theme.colors.textSubtle};
    font-size: 0.75rem;
  }
  > div:nth-child(3) {
    text-align: end;
    max-width: 130px;
  }
`

const CompactBalanceTotal = styled.small`
  display: none;
  grid-column: 2 / -1;
  padding-top: 6px;
  border-top: 1px solid ${({ theme }) => theme.colors.cardBorder};

  @media (max-width: 480px) {
    display: block;
  }
`

const NativeOption = styled.label`
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  font-size: 0.875rem;
  cursor: pointer;

  input {
    width: 17px;
    height: 17px;
    accent-color: ${({ theme }) => theme.colors.primary};
  }
`

const AmountGroup = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 8px;

  button {
    min-height: 48px;
  }
`

const Events = styled.ul`
  display: grid;
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    min-width: 0;
    border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};
  }

  li:last-child {
    border: 0;
  }
  strong {
    display: block;
    overflow-wrap: anywhere;
    font-weight: 650;
  }
  small {
    color: ${({ theme }) => theme.colors.textSubtle};
    font-size: 0.8125rem;
  }
  code {
    color: inherit;
  }
`

const EventIcon = styled.span`
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.input};
  color: ${({ theme }) => theme.colors.textSubtle};
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
  const [operation, setOperation] = useState<TreasuryOperation>('deposit')
  const [amount, setAmount] = useState('')
  const [native, setNative] = useState(false)
  const [failure, setFailure] = useState('')
  const [offset, setOffset] = useState(0)
  const [historyEnd, setHistoryEnd] = useState<bigint>()
  const [historyLimit, setHistoryLimit] = useState(8)
  const [submitting, setSubmitting] = useState(false)
  const action = useV3Action(client, deployment, getWallet, account)
  const treasury = studio.treasury
  const treasuryAddress = treasury?.address
  const selected = studio.supported.find((token) => token.address === asset) ?? studio.supported[0]
  const owner = Boolean(account && treasury && isAddressEqual(account, treasury.owner))
  const locked = !owner || !rightNetwork || action.busy || action.unconfirmed || submitting
  const validNative = selected && isAddressEqual(selected.address, studio.wrappedNative)
  const load = useCallback(() => readV3Catalogue(client, deployment, offset, true), [client, deployment, offset])
  const liabilities = useV3Query(treasury ? `${treasury.address}:liabilities:${offset}` : '', load, 45_000)
  const loadRecent = useCallback(async () => {
    if (!treasuryAddress) return undefined
    const toBlock = historyEnd ?? (await client.getBlockNumber({ cacheTime: 0 }))
    const fromBlock = toBlock > BigInt(2000) ? toBlock - BigInt(2000) : ZERO
    const logs = await client.getContractEvents({
      address: treasuryAddress,
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
  }, [client, treasuryAddress, historyEnd])
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

  const selectAsset = (address: string) => {
    if (treasury.v36 && selected?.address !== address) setAmount('')
    setAsset(address)
    setNative(false)
    setFailure('')
  }

  const changeOperation = (next: TreasuryOperation) => {
    if (next === operation) return
    setOperation(next)
    setAmount('')
    setNative(false)
    setFailure('')
  }

  const changePause = async () => {
    const data = encodeFunctionData({ abi: treasuryVaultAbi, functionName: 'setPaused', args: [!treasury.paused] })
    if (await action.run({ to: treasury.address, data })) refresh()
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

  const assetOptions = studio.supported.map(({ address, symbol }) => (
    <option key={address} value={address}>
      {symbol}
    </option>
  ))
  const pause = (
    <V3Button type="button" $secondary disabled={locked} onClick={changePause}>
      {treasury.paused ? 'Resume treasury' : 'Pause treasury'}
    </V3Button>
  )
  const status = (
    <>
      {action.message && <V3Muted role="status">{action.message}</V3Muted>}
      {action.hash && (
        <V3Muted>
          Transaction hash <code>{action.hash}</code>
        </V3Muted>
      )}
      {failure && <V3Error role="alert">{failure}</V3Error>}
      {!failure && action.error && (
        <V3WalletError key={action.error} message={action.error} client={client} getWallet={getWallet} />
      )}
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
  const legacyControls = (
    <>
      {owner && selected && (
        <form onSubmit={submit} aria-label="Manage available treasury assets">
          <V3Actions>
            <V3Field>
              Asset
              <select
                name="treasury-asset"
                value={selected.address}
                onChange={(event) => selectAsset(event.target.value)}
              >
                {assetOptions}
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
            {pause}
          </V3Actions>
        </form>
      )}
      {status}
    </>
  )

  const withdraw = operation === 'withdraw'
  const withdrawNative = withdraw && native && validNative
  const transfer =
    owner && selected ? (
      <TransferForm onSubmit={submit} aria-label="Manage available treasury assets">
        <V3Field>
          Asset
          <select
            name="treasury-asset"
            value={selected.address}
            disabled={locked}
            onChange={(event) => selectAsset(event.target.value)}
          >
            {assetOptions}
          </select>
        </V3Field>
        <SelectedBalance>
          <TreasuryAssetIcon asset={selected} wrappedNative={studio.wrappedNative} size={32} />
          <div>
            <small>Available</small>
            <strong>
              {treasuryBalance(selected.balance?.available ?? ZERO, selected.decimals)} {selected.symbol}
            </strong>
          </div>
          <div>
            <small>Allocated to pools</small>
            <strong>
              {treasuryBalance(selected.balance?.allocated ?? ZERO, selected.decimals)} {selected.symbol}
            </strong>
          </div>
          <CompactBalanceTotal>
            Total{' '}
            {treasuryBalance(
              (selected.balance?.available ?? ZERO) + (selected.balance?.allocated ?? ZERO),
              selected.decimals,
            )}{' '}
            {selected.symbol}
          </CompactBalanceTotal>
        </SelectedBalance>
        <AmountGroup>
          <V3Field>
            Amount
            <input
              required
              name="treasury-amount"
              inputMode="decimal"
              placeholder="0.00"
              readOnly={locked}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </V3Field>
          {withdraw && selected.decimals !== null && (
            <V3Button
              type="button"
              $secondary
              disabled={locked || !selected.balance?.available}
              onClick={() => {
                if (selected.decimals !== null)
                  setAmount(formatUnits(selected.balance?.available ?? ZERO, selected.decimals))
              }}
            >
              Max
            </V3Button>
          )}
        </AmountGroup>
        {validNative && (
          <NativeOption>
            <input
              type="checkbox"
              name={withdraw ? 'treasury-native-withdraw' : 'treasury-native'}
              checked={native}
              disabled={locked}
              onChange={(event) => setNative(event.target.checked)}
            />
            {withdraw ? 'Receive native POL' : 'Deposit native POL as WPOL'}
          </NativeOption>
        )}
        {treasury.paused && <V3Muted>Resume Treasury in Asset settings to move funds.</V3Muted>}
        {!rightNetwork && <V3Muted>Switch to the V3 settlement network to move funds.</V3Muted>}
        {!withdraw && !selected.canDeposit && <V3Muted>Deposits are disabled for this asset.</V3Muted>}
        {withdrawNative && !selected.review?.valid && (
          <V3Muted>Review this asset in Asset settings to withdraw native POL.</V3Muted>
        )}
        <SolidAction
          type="submit"
          value={withdrawNative ? 'withdraw-native' : withdraw ? 'withdraw' : 'deposit'}
          disabled={
            locked ||
            treasury.paused ||
            selected.decimals === null ||
            (!withdraw && !selected.canDeposit) ||
            (withdrawNative && !selected.review?.valid)
          }
        >
          {withdrawNative ? 'Withdraw as native POL' : withdraw ? 'Withdraw available' : 'Deposit'}
        </SolidAction>
      </TransferForm>
    ) : (
      <V3Muted>Review a token in Asset settings to start moving funds.</V3Muted>
    )

  const reserves = (
    <TreasuryPanel aria-label="Pool reserves">
      <PanelBody>
        <PanelHeading>
          <div>
            <h2>Pool reserves</h2>
            <p>Reward inventory and NFT liabilities by pool.</p>
          </div>
        </PanelHeading>
        {liabilities.loading && !liabilities.data && <V3Muted role="status">Reading pool reserves…</V3Muted>}
        {liabilities.error && <V3Error role="alert">{liabilities.error}</V3Error>}
        <TreasuryTable role="region" aria-label="Pool reward liabilities" tabIndex={0}>
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
                    <td>{settlement ? shortAmount(settlement.claimLiability, (decimals ?? 0) + 18) : 'Unavailable'}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </TreasuryTable>
        {liabilities.data && !liabilities.data.pools.some((pool) => pool.rewards.length > 0) && (
          <V3Muted>No pool reserves in this range.</V3Muted>
        )}
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
      </PanelBody>
    </TreasuryPanel>
  )

  const activity = (
    <TreasuryPanel aria-label="Treasury activity">
      <PanelBody>
        <PanelHeading>
          <div>
            <h2>Recent treasury transactions</h2>
            <p>
              {recent.data
                ? `Confirmed events in blocks ${recent.data.fromBlock}–${recent.data.toBlock}.`
                : 'Reading confirmed Treasury events…'}
            </p>
          </div>
        </PanelHeading>
        {recent.error && <V3Error role="alert">{recent.error}</V3Error>}
        {recent.data?.logs.length === 0 && <V3Muted>No treasury transactions in this range.</V3Muted>}
        {recent.data && recent.data.logs.length > 0 && (
          <Events>
            {recent.data.logs.slice(0, historyLimit).map((log) => {
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
                  ? `${log.args.reward ? 'Recovered rewards' : 'Recovered funding'} · Pool #${
                      log.args.poolId
                    } · ${format(log.args.token, log.args.amount)}`
                  : [
                      log.eventName,
                      'poolId' in log.args && `Pool #${log.args.poolId}`,
                      'token' in log.args && 'amount' in log.args && format(log.args.token, log.args.amount),
                    ]
                      .filter(Boolean)
                      .join(' · ')
              return (
                <li key={`${log.transactionHash}:${log.logIndex}`}>
                  <EventIcon>
                    <HistoryIcon width="18px" aria-hidden="true" />
                  </EventIcon>
                  <div>
                    <strong>{description}</strong>
                    <small>
                      Block {log.blockNumber?.toString()} ·{' '}
                      {deployment.chainId === 137 ? (
                        <a href={`https://polygonscan.com/tx/${log.transactionHash}`} target="_blank" rel="noreferrer">
                          <code>{log.transactionHash.slice(0, 12)}…</code>
                        </a>
                      ) : (
                        <code>{log.transactionHash.slice(0, 12)}…</code>
                      )}
                    </small>
                  </div>
                </li>
              )
            })}
          </Events>
        )}
        <V3Actions>
          {(recent.data?.logs.length ?? 0) > historyLimit && (
            <V3Button type="button" $secondary onClick={() => setHistoryLimit((limit) => limit + 8)}>
              Show more transactions
            </V3Button>
          )}
          {historyEnd !== undefined && (
            <V3Button
              type="button"
              $secondary
              onClick={() => {
                setHistoryLimit(8)
                setHistoryEnd(undefined)
              }}
            >
              Latest blocks
            </V3Button>
          )}
          {recent.data && recent.data.fromBlock > ZERO && (
            <V3Button
              type="button"
              $secondary
              onClick={() => {
                setHistoryLimit(8)
                if (recent.data) setHistoryEnd(recent.data.fromBlock - BigInt(1))
              }}
            >
              Older blocks
            </V3Button>
          )}
        </V3Actions>
      </PanelBody>
    </TreasuryPanel>
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
          operation={operation}
          onOperationChange={changeOperation}
          selectedAsset={selected?.address}
          onSelectAsset={selectAsset}
          transfer={transfer}
          status={status}
          pause={pause}
          reserves={reserves}
          activity={activity}
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
            {legacyControls}
          </div>
        </V3Card>
      )}
      {!treasury.v36 && (
        <>
          {reserves}
          {activity}
        </>
      )}
    </TreasurySection>
  )
}
