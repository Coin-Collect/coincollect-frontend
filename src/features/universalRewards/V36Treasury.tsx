import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import styled from 'styled-components'
import {
  encodeFunctionData,
  formatUnits,
  getAddress,
  isAddress,
  isAddressEqual,
  isHex,
  zeroAddress,
  zeroHash,
  type Address,
  type Hex,
} from 'viem'
import { treasuryAssetsV36Abi } from './abiV36'
import type { useV3Action } from './hooks'
import { shortAmount } from './presentation'
import { erc20Abi } from './reader'
import type { V3Client, V3Deployment } from './runtime'
import { parseV3Amount, type V3StudioSnapshot } from './studio'
import { inspectTreasuryToken, quoteTreasurySwap, revalidateTreasuryQuote, treasuryPermission } from './treasuryV36'
import { describeV3Error, type V3Call } from './transactions'
import { tokenScale } from './units'
import { V3Actions, V3Badge, V3Button, V3Card, V3Error, V3Field, V3Link, V3Muted } from './styles'

const ZERO = BigInt(0)
const one = BigInt(1)
const permissions = [
  ['Treasury deposits and new budgets', treasuryPermission.deposit],
  ['New pool rewards', treasuryPermission.reward],
  ['Swaps and conversion routes', treasuryPermission.swap],
] as const

const Workspace = styled.div`
  display: grid;
  gap: 16px;
  align-items: start;
  @media (min-width: 1020px) {
    grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
  }
`

const Form = styled.form`
  display: grid;
  gap: 14px;
  align-items: start;
  min-width: 0;
  input:not([type='checkbox']),
  select {
    min-height: 48px;
    font-size: max(1rem, 1em);
  }
  a:focus-visible,
  summary:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
  fieldset {
    display: grid;
    gap: 8px;
    min-width: 0;
  }
  fieldset label {
    display: flex;
    gap: 10px;
    align-items: center;
    min-height: 48px;
  }
`

const Review = styled.details`
  border-top: 1px solid ({theme}) => theme.colors.cardBorder;
  padding-top: 10px;
  summary {
    cursor: pointer;
    min-height: 48px;
    display: list-item;
    padding-block: 10px;
    font-weight: 750;
  }
  code {
    overflow-wrap: anywhere;
    font-size: 0.82rem;
  }
`

const AssetTable = styled.div`
  overflow: auto;
  max-inline-size: 100%;
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
  }
  th,
  td {
    padding: 12px 10px;
    text-align: start;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  tbody th,
  tbody td {
    border-top: 1px solid ({theme}) => theme.colors.cardBorder;
  }
  tbody th {
    position: sticky;
    z-index: 1;
    inset-inline-start: 0;
    background: ({theme}) => theme.colors.backgroundAlt;
  }
  small {
    display: block;
    font-weight: 500;
    color: ({theme}) => theme.colors.textSubtle;
  }
`

const QuotePanel = styled.dl`
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 14px;
  background: ({theme}) => theme.colors.background;
  border-radius: 14px;
  font-variant-numeric: tabular-nums;
  > div {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  dt {
    color: ({theme}) => theme.colors.textSubtle;
  }
  dd {
    margin: 0;
    text-align: end;
    overflow-wrap: anywhere;
    font-weight: 700;
  }
`

const QuoteStatus = styled(V3Muted)<{ $failure: boolean }>`
  color: ${({ $failure, theme }) => ($failure ? theme.colors.failure : theme.colors.textSubtle)};

  &:empty {
    margin: 0;
  }
`

const SwapActions = styled(V3Actions)`
  > button {
    flex: 1 1 140px;
  }
`

type Token = V3StudioSnapshot['supported'][number]
type Treasury = NonNullable<V3StudioSnapshot['treasury']> & {
  v36: NonNullable<NonNullable<V3StudioSnapshot['treasury']>['v36']>
}
type Action = ReturnType<typeof useV3Action>
type Props = {
  client: V3Client
  deployment: V3Deployment
  treasury: Treasury
  studio: V3StudioSnapshot
  account?: Address
  locked: boolean
  action: Action
  refresh: () => void
}

function AssetPermissions({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <fieldset>
      <legend>Permissions</legend>
      {permissions.map(([label, flag]) => (
        <label key={flag}>
          <input
            name={`permission-${flag}`}
            type="checkbox"
            checked={Boolean(value & flag)}
            onChange={(event) => onChange(event.target.checked ? value | flag : value & ~flag)}
          />
          {label}
        </label>
      ))}
    </fieldset>
  )
}

function AddToken({ client, deployment, treasury, account, action, locked, refresh, studio }: Props) {
  const title = useId()
  const [address, setAddress] = useState('')
  const [evidence, setEvidence] = useState('')
  const [probe, setProbe] = useState('')
  const [flags, setFlags] = useState(0)
  const [inspected, setInspected] = useState<Awaited<ReturnType<typeof inspectTreasuryToken>>>()
  const [checking, setChecking] = useState(false)
  const [failure, setFailure] = useState('')
  const existing = inspected && studio.supported.find((token) => token.address === inspected.token)?.review
  const blocked = !account || locked || checking

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (blocked || !account) return
    setChecking(true)
    setFailure('')
    try {
      if (!inspected) {
        if (!isAddress(address.trim())) throw new Error('Enter a valid Polygon token contract address.')
        const result = await inspectTreasuryToken(client, deployment, getAddress(address.trim()))
        setInspected(result)
        setProbe(formatUnits(one, result.review.decimals))
        return
      }
      if (!isHex(evidence, { strict: true }) || evidence.length !== 66 || evidence === zeroHash) {
        throw new Error('Enter the 32-byte hash of the completed token compatibility review.')
      }
      const evidenceHash = evidence as Hex
      const amount = parseV3Amount(probe, inspected.review.decimals, 'probe amount')
      const result = await action.runMany(async () => {
        const fresh = await inspectTreasuryToken(client, deployment, inspected.token)
        if (JSON.stringify(fresh.review) !== JSON.stringify(inspected.review)) {
          throw new Error('The token identity changed. Check the contract again before registering it.')
        }
        const registry = treasury.v36.registry
        const calls: (V3Call & { confirmationLabel: string })[] = []
        const allowance = await client.readContract({
          address: inspected.token,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [account, registry],
        })
        const approval = (value: bigint): V3Call => ({
          to: inspected.token,
          data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [registry, value] }),
        })
        if (allowance !== amount) {
          if (allowance > ZERO) calls.push({ ...approval(ZERO), confirmationLabel: 'Reset token probe allowance' })
          calls.push({ ...approval(amount), confirmationLabel: `Approve ${inspected.symbol} probe` })
        }
        calls.push({
          to: registry,
          confirmationLabel: `Register ${inspected.symbol}`,
          data: encodeFunctionData({
            abi: treasuryAssetsV36Abi,
            functionName: 'reviewAsset',
            args: [inspected.token, { ...inspected.review, evidenceHash }, amount, flags],
          }),
        })
        return calls
      })
      if (result) {
        setAddress('')
        setEvidence('')
        setInspected(undefined)
        setFlags(0)
      }
      refresh()
    } catch (error) {
      setFailure(describeV3Error(error))
    } finally {
      setChecking(false)
    }
  }

  return (
    <Review>
      <summary id={title}>Add or re-review a token</summary>
      <Form onSubmit={submit} aria-labelledby={title}>
        <V3Field>
          Polygon token contract
          <input
            required
            name="token-contract"
            disabled={blocked}
            autoComplete="off"
            spellCheck={false}
            value={address}
            onChange={(event) => {
              setAddress(event.target.value)
              setInspected(undefined)
              setFailure('')
            }}
          />
        </V3Field>
        {inspected && (
          <>
            <V3Muted>
              <strong>{inspected.symbol}</strong> · {inspected.review.decimals} decimals ·{' '}
              {inspected.review.implementation === zeroAddress
                ? 'No proxy detected in supported checks'
                : 'Observable proxy'}
            </V3Muted>
            {deployment.chainId === 137 && (
              <V3Link href={`https://polygonscan.com/address/${inspected.token}#code`} target="_blank" rel="noreferrer">
                Review verified source on PolygonScan
              </V3Link>
            )}
            <V3Muted>
              Runtime <code>{inspected.review.runtimeHash}</code>
            </V3Muted>
            {inspected.review.implementation !== zeroAddress && (
              <V3Muted>
                Implementation <code>{inspected.review.implementation}</code>
                <br />
                Implementation runtime <code>{inspected.review.implementationHash}</code>
                <br />
                Upgrade authority{' '}
                {inspected.authority && inspected.authority !== zeroAddress ? (
                  <code>{inspected.authority}</code>
                ) : (
                  'requires source review'
                )}
              </V3Muted>
            )}
            <V3Muted>
              Check exact transfers, supply changes and upgrade authority. Registration sends a small probe from your
              wallet and returns it in the same transaction.
            </V3Muted>
            {existing && existing.permissions !== 0 && (
              <V3Muted>Set all permissions to off before re-reviewing an asset.</V3Muted>
            )}
            <V3Field>
              Compatibility review hash
              <input
                required
                name="token-review-hash"
                autoComplete="off"
                spellCheck={false}
                value={evidence}
                onChange={(event) => setEvidence(event.target.value)}
              />
            </V3Field>
            <V3Field>
              Probe amount
              <input
                required
                name="token-probe"
                inputMode="decimal"
                value={probe}
                onChange={(event) => setProbe(event.target.value)}
              />
            </V3Field>
            <AssetPermissions value={flags} onChange={setFlags} />
          </>
        )}
        {failure && <V3Error role="alert">{failure}</V3Error>}
        <V3Actions>
          <V3Button type="submit" disabled={blocked || Boolean(existing?.permissions)}>
            {checking ? 'Checking token…' : inspected ? 'Register reviewed token' : 'Check token contract'}
          </V3Button>
        </V3Actions>
      </Form>
    </Review>
  )
}

function ManagePermissions({ studio, treasury, action, locked, refresh }: Props) {
  const heading = useId()
  const [selected, select] = useState('')
  const [flags, setFlags] = useState<number>()
  const asset = studio.supported.find(({ address }) => selected === address)
  const currentFlags = asset?.review?.permissions ?? 0
  const nextFlags = flags ?? currentFlags
  return (
    <Review>
      <summary id={heading}>Manage token permissions</summary>
      <Form
        aria-labelledby={heading}
        onSubmit={async (event) => {
          event.preventDefault()
          if (!asset || locked || nextFlags === currentFlags) return
          const receipt = await action.run({
            to: treasury.v36.registry,
            data: encodeFunctionData({
              abi: treasuryAssetsV36Abi,
              functionName: 'setPermissions',
              args: [asset.address, nextFlags],
            }),
          })
          if (receipt) refresh()
        }}
      >
        <V3Field>
          Registered asset
          <select
            name="registered-asset"
            required
            value={selected}
            onChange={(event) => {
              select(event.target.value)
              setFlags(undefined)
            }}
          >
            <option value="">Choose an asset</option>
            {studio.supported.map((token) => (
              <option key={token.address} value={token.address}>
                {token.symbol} · {token.address.slice(0, 8)}
              </option>
            ))}
          </select>
        </V3Field>
        {asset && (
          <>
            {!asset.review?.valid && (
              <V3Muted role="status">
                Identity changed. Quarantine the asset and submit a fresh compatibility review.
              </V3Muted>
            )}
            <AssetPermissions value={nextFlags} onChange={setFlags} />
            <V3Actions>
              <V3Button type="submit" disabled={locked || nextFlags === currentFlags}>
                Save permissions
              </V3Button>
            </V3Actions>
          </>
        )}
      </Form>
    </Review>
  )
}

function Swap({ client, deployment, treasury, studio, account, locked, action, refresh }: Props) {
  const heading = useId()
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [amount, setAmount] = useState('')
  const [failure, setFailure] = useState('')
  const [quoting, setQuoting] = useState(false)
  const [quote, setQuote] = useState<{
    details: Awaited<ReturnType<typeof quoteTreasurySwap>>
    requestedAt: number
  }>()
  const quoteDetails = quote?.details
  const statusId = useId()
  useEffect(() => {
    if (!quote) return undefined
    const remaining = Math.max(0, quote.requestedAt + 120_000 - Date.now())
    const timer = window.setTimeout(() => {
      setQuote(undefined)
      setFailure('This quote expired. Request a fresh quote.')
    }, remaining)
    return () => window.clearTimeout(timer)
  }, [quote])
  const tokens = studio.supported.filter((token) => token.canSwap && token.decimals !== null)
  const sell = tokens.find(({ address }) => address === input)
  const buy = tokens.find(({ address }) => address === output)
  const busy = locked || treasury.paused || quoting
  const invalidate = () => {
    setQuote(undefined)
    setFailure('')
  }
  const format = (value: bigint, token?: Token) =>
    `${shortAmount(value, token?.decimals ?? null)} ${token?.symbol ?? ''}`

  const requestQuote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy || !account || !sell || !buy || sell.decimals === null) return
    setQuoting(true)
    invalidate()
    try {
      const value = parseV3Amount(amount, sell.decimals, 'swap amount')
      if (value > (sell.balance?.available ?? ZERO))
        throw new Error('This amount exceeds the available Treasury balance.')
      const requestedAt = Date.now()
      setQuote({
        requestedAt,
        details: await quoteTreasurySwap(
          client,
          deployment,
          treasury.address,
          treasury.v36.planner,
          account,
          sell.address,
          buy.address,
          value,
        ),
      })
    } catch (error) {
      setFailure(describeV3Error(error))
    } finally {
      setQuoting(false)
    }
  }

  const confirm = async () => {
    if (!quoteDetails || busy || !sell || !buy) return
    const receipt = await action.runMany(async () => {
      try {
        await revalidateTreasuryQuote(client, treasury.v36.planner, quoteDetails)
      } catch (error) {
        setQuote(undefined)
        setFailure(describeV3Error(error))
        throw error
      }
      return [
        {
          to: treasury.address,
          data: quoteDetails.data,
          confirmationLabel: `Swap ${format(quoteDetails.amount, sell)} for ${buy.symbol}`,
          onConfirmed: () => {
            invalidate()
            setAmount('')
          },
        },
      ]
    })
    if (receipt) refresh()
  }

  const middle =
    quoteDetails && studio.supported.find((token) => isAddressEqual(token.address, quoteDetails.route.intermediate))
  return (
    <V3Card>
      <div>
        <h2 id={heading}>Swap</h2>
        <V3Muted>Trade from available Treasury funds through approved routes.</V3Muted>
        {tokens.length < 2 ? (
          <V3Muted>Enable swaps for two reviewed assets to request a quote.</V3Muted>
        ) : (
          <Form onSubmit={requestQuote} aria-labelledby={heading}>
            <V3Field>
              Sell
              <select
                required
                name="treasury-sell"
                disabled={busy}
                value={input}
                onChange={(event) => {
                  setInput(event.target.value)
                  if (event.target.value === output) setOutput('')
                  invalidate()
                }}
              >
                <option value="">Choose sell token</option>
                {tokens.map((token) => (
                  <option key={token.address} value={token.address}>
                    {token.symbol} · {format(token.balance?.available ?? ZERO, token)}
                  </option>
                ))}
              </select>
            </V3Field>
            <V3Field>
              Amount
              <input
                required
                name="treasury-swap-amount"
                aria-describedby={statusId}
                inputMode="decimal"
                disabled={busy}
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value)
                  invalidate()
                }}
              />
            </V3Field>
            <V3Field>
              Buy
              <select
                required
                name="treasury-buy"
                disabled={busy}
                value={output}
                onChange={(event) => {
                  setOutput(event.target.value)
                  invalidate()
                }}
              >
                <option value="">Choose buy token</option>
                {tokens
                  .filter((token) => token.address !== input)
                  .map((token) => (
                    <option key={token.address} value={token.address}>
                      {token.symbol}
                    </option>
                  ))}
              </select>
            </V3Field>
            <QuoteStatus id={statusId} role="status" $failure={Boolean(failure)}>
              {failure || (quoting ? 'Checking the protected route…' : '')}
            </QuoteStatus>
            {quoteDetails && sell && buy && (
              <QuotePanel aria-label="Protected Treasury quote">
                <div>
                  <dt>Route</dt>
                  <dd>
                    {sell.symbol} →{' '}
                    {quoteDetails.route.intermediate === zeroAddress
                      ? ''
                      : `${middle?.symbol ?? quoteDetails.route.intermediate.slice(0, 8)} → `}
                    {buy.symbol}
                  </dd>
                </div>
                <div>
                  <dt>Estimated output</dt>
                  <dd>{format(quoteDetails.quoted, buy)}</dd>
                </div>
                <div>
                  <dt>Minimum received</dt>
                  <dd>
                    {formatUnits(quoteDetails.minimum, buy.decimals ?? 0)} {buy.symbol}
                  </dd>
                </div>
                <div>
                  <dt>Rate</dt>
                  <dd>
                    1 {sell.symbol} ≈{' '}
                    {format((quoteDetails.quoted * tokenScale(sell.decimals ?? 0)) / quoteDetails.amount, buy)}
                  </dd>
                </div>
                <div>
                  <dt>Impact incl. DEX fees</dt>
                  <dd>{formatUnits(quoteDetails.impactBps, 2)}%</dd>
                </div>
                <div>
                  <dt>Estimated network fee</dt>
                  <dd>{shortAmount(quoteDetails.fee, 18)} POL</dd>
                </div>
                <div>
                  <dt>Deadline</dt>
                  <dd>{new Date(Number(quoteDetails.deadline) * 1000).toLocaleTimeString()}</dd>
                </div>
              </QuotePanel>
            )}
            <SwapActions>
              <V3Button type="submit" $secondary={Boolean(quoteDetails)} disabled={busy}>
                {quoting ? 'Checking route…' : 'Get protected quote'}
              </V3Button>
              {quoteDetails && (
                <V3Button type="button" disabled={busy} onClick={confirm}>
                  Confirm Treasury swap
                </V3Button>
              )}
            </SwapActions>
          </Form>
        )}
      </div>
    </V3Card>
  )
}

export default function V36Treasury({ controls, ...props }: Props & { controls: ReactNode }) {
  const { studio, treasury, account } = props
  const owner = Boolean(account && isAddressEqual(account, treasury.owner))
  return (
    <Workspace>
      <V3Card>
        <div>
          <h2>Central Treasury</h2>
          <V3Badge>{treasury.paused ? 'Treasury paused' : 'Treasury open'}</V3Badge>
          <AssetTable role="region" aria-label="Treasury balances by asset" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  {['Asset', 'Available', 'Allocated', 'Total'].map((name) => (
                    <th scope="col" key={name}>
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {studio.supported.map((token) => (
                  <tr key={token.address}>
                    <th scope="row">
                      {token.symbol}
                      <small>{token.review?.valid ? token.address.slice(0, 8) : 'Review required'}</small>
                    </th>
                    {[
                      token.balance?.available ?? ZERO,
                      token.balance?.allocated ?? ZERO,
                      (token.balance?.available ?? ZERO) + (token.balance?.allocated ?? ZERO),
                    ].map((value, index) => (
                      <td key={index}>{shortAmount(value, token.decimals)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </AssetTable>
          {!studio.supported.length && <V3Muted>Review a token to start using Treasury.</V3Muted>}
          <V3Muted>
            Total combines available funds and pool allocations. Reward inventory appears by pool below.
          </V3Muted>
          {studio.supported.some(({ review }) => review && (review.swappedIn > ZERO || review.swappedOut > ZERO)) && (
            <Review>
              <summary>Swap totals by asset</summary>
              <AssetTable role="region" aria-label="Treasury swap totals" tabIndex={0}>
                <table>
                  <thead>
                    <tr>
                      {['Asset', 'Swapped in', 'Swapped out'].map((label) => (
                        <th key={label} scope="col">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {studio.supported.map(({ address, symbol, decimals, review }) => (
                      <tr key={address}>
                        <th scope="row">{symbol}</th>
                        <td>{shortAmount(review?.swappedIn ?? ZERO, decimals)}</td>
                        <td>{shortAmount(review?.swappedOut ?? ZERO, decimals)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AssetTable>
            </Review>
          )}
          {controls}
          {owner && <AddToken {...props} />}
          {owner && studio.supported.length > 0 && <ManagePermissions {...props} />}
        </div>
      </V3Card>
      <Swap {...props} />
    </Workspace>
  )
}
