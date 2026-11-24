import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import styled from 'styled-components'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  CogIcon,
  HistoryIcon,
  ListViewIcon,
  SearchIcon,
  SwapIcon,
  WalletIcon,
} from '@pancakeswap/uikit'
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
import RewardTokenIcon from 'views/NftFarms/components/FarmCard/RewardTokenIcon'
import { treasuryAssetsV36Abi } from './abiV36'
import { preferStudioTokens, studioTokens } from './assetCatalog'
import type { useV3Action } from './hooks'
import { shortAmount } from './presentation'
import { erc20Abi } from './reader'
import type { V3Client, V3Deployment } from './runtime'
import { parseV3Amount, type V3StudioSnapshot } from './studio'
import { inspectTreasuryToken, quoteTreasurySwap, revalidateTreasuryQuote, treasuryPermission } from './treasuryV36'
import { describeV3Error, type V3Call } from './transactions'
import { tokenScale } from './units'
import { V3Actions, V3Error, V3Field, V3Link, V3Muted } from './styles'
import {
  PanelBody,
  PanelHeading,
  TabPanel,
  TreasuryAction,
  TreasuryPanel,
  TreasuryTable,
  TreasuryTabs,
  treasuryBalance,
  TreasuryAssetIcon,
  type TreasuryOperation,
} from './treasuryLayout'

const ZERO = BigInt(0)
const one = BigInt(1)
const permissions = [
  ['Treasury deposits and new budgets', treasuryPermission.deposit],
  ['New pool rewards', treasuryPermission.reward],
  ['Swaps and conversion routes', treasuryPermission.swap],
] as const

const Workspace = styled.div`
  display: grid;
  gap: 18px;
  min-width: 0;
`

const WorkspaceHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 20px;
  min-width: 0;

  @media (max-width: 560px) {
    > [role='tablist'] {
      order: 2;
    }
  }
`

const TreasuryStatus = styled.span<{ $paused: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: fit-content;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  font-size: 0.8125rem;
  font-weight: 650;

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $paused, theme }) => ($paused ? theme.colors.warning : theme.colors.success)};
  }
`

const OverviewGrid = styled.div`
  display: grid;
  align-items: start;
  gap: 18px;

  @media (min-width: 970px) {
    grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
  }
`

const ActionPanel = styled(TreasuryPanel)`
  scroll-margin-top: 86px;
  background: linear-gradient(
    155deg,
    ${({ theme }) => (theme.isDark ? '#2b2233' : '#f8f3fd')},
    ${({ theme }) => theme.colors.backgroundAlt} 240px
  );

  @media (min-width: 970px) {
    position: sticky;
    top: 76px;
  }
`

const SwapPanel = styled(TabPanel)`
  display: grid;
  gap: 12px;
`

const AssetSearch = styled.label`
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding-inline: 10px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.textSubtle};

  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }

  input {
    background: transparent;
    border: 0;
    padding: 6px 0;
    color: ${({ theme }) => theme.colors.text};
    width: 100%;
    min-width: 0;
    font: inherit;
    outline: 0;
  }

  svg {
    flex: none;
  }
`

const AssetHeader = styled(PanelBody)`
  grid-template-columns: minmax(0, 1fr) minmax(170px, 0.75fr);
  align-items: center;
  gap: 12px;

  @media (max-width: 540px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const JumpToFunds = styled.a`
  display: none;

  @media (max-width: 969px) {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 3px;
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
  border-top: 1px solid ${({ theme }) => theme.colors.cardBorder};
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

const AssetTable = styled(TreasuryTable)`
  table {
    table-layout: fixed;
  }
  th,
  td {
    vertical-align: middle;
  }
  tbody th {
    padding-block: 3px;
  }

  tbody td:nth-child(2) {
    font-weight: 750;
  }
  tbody td:nth-child(3),
  tbody td:nth-child(4) {
    color: ${({ theme }) => theme.colors.textSubtle};
  }
  tbody tr[data-selected='true'] {
    background: ${({ theme }) => theme.colors.input};
  }

  @media (min-width: 541px) {
    th:first-child {
      width: 33%;
    }
  }

  @media (max-width: 540px) {
    th:first-child {
      width: 35%;
    }
  }

  @media (max-width: 480px) {
    th:first-child {
      width: 42%;
    }

    th:last-child,
    td:last-child {
      display: none;
    }
  }
`

const AssetButton = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 44px;
  min-width: 0;
  padding: 4px 0;
  gap: 9px;
  color: inherit;
  background: transparent;
  border: 0;
  text-align: start;
  font: inherit;
  cursor: pointer;

  &:disabled {
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
    border-radius: 5px;
  }

  strong {
    font-size: 0.9375rem;
  }

  small {
    display: block;
    margin-top: 2px;
    font-size: 0.75rem;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.textSubtle};
  }

  @media (max-width: 540px) {
    gap: 6px;
    strong {
      font-size: 0.8125rem;
    }
    small {
      font-size: 0.6875rem;
    }
  }
`

const AssetFooter = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px 14px;
  padding: 8px 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.cardBorder};

  p {
    margin: 0;
  }
`

const TextButton = styled.button`
  min-height: 44px;
  padding: 4px 0;
  color: ${({ theme }) => theme.colors.text};
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const SettingsGrid = styled.div`
  display: grid;
  gap: 18px;
  align-items: start;

  @media (min-width: 900px) {
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  }
`

const TokenLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const QuotePanel = styled.dl`
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 14px;
  background: ${({ theme }) => theme.colors.background};
  border-radius: 14px;
  font-variant-numeric: tabular-nums;
  > div {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  dt {
    color: ${({ theme }) => theme.colors.textSubtle};
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
  const suggestedTokens = studioTokens.filter(
    (token) => !studio.supported.some((asset) => isAddressEqual(token.address as Address, asset.address)),
  )

  const chooseAddress = (value: string) => {
    setAddress(value)
    setInspected(undefined)
    setEvidence('')
    setFlags(0)
    setFailure('')
  }

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
        {suggestedTokens.length > 0 && (
          <V3Actions role="group" aria-label="CoinCollect and partner tokens">
            {suggestedTokens.map((token) => (
              <TreasuryAction
                type="button"
                key={token.address}
                $secondary
                aria-pressed={address === token.address}
                disabled={blocked}
                onClick={() => chooseAddress(token.address)}
              >
                <TokenLabel>
                  <RewardTokenIcon token={token.symbol ?? 'Token'} tokenMeta={token} size={20} />
                  {token.symbol}
                </TokenLabel>
              </TreasuryAction>
            ))}
          </V3Actions>
        )}
        <V3Field>
          Polygon token contract
          <input
            required
            name="token-contract"
            disabled={blocked}
            autoComplete="off"
            spellCheck={false}
            value={address}
            onChange={(event) => chooseAddress(event.target.value)}
          />
        </V3Field>
        {inspected && (
          <>
            <V3Muted>
              <TokenLabel>
                <RewardTokenIcon token={inspected.symbol} tokenMeta={{ address: inspected.token }} size={20} />
                <strong>{inspected.symbol}</strong>
              </TokenLabel>{' '}
              · {inspected.review.decimals} decimals ·{' '}
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
          <TreasuryAction type="submit" disabled={blocked || Boolean(existing?.permissions)}>
            {checking ? 'Checking token…' : inspected ? 'Register reviewed token' : 'Check token contract'}
          </TreasuryAction>
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
              <TreasuryAction type="submit" disabled={locked || nextFlags === currentFlags}>
                Save permissions
              </TreasuryAction>
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
    <>
      <PanelHeading>
        <div>
          <h3 id={heading}>Protected swap</h3>
          <p>Trade available funds through approved routes.</p>
        </div>
      </PanelHeading>
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
            <TreasuryAction type="submit" $secondary={Boolean(quoteDetails)} disabled={busy}>
              {quoting ? 'Checking route…' : 'Get protected quote'}
            </TreasuryAction>
            {quoteDetails && (
              <TreasuryAction type="button" disabled={busy} onClick={confirm}>
                Confirm Treasury swap
              </TreasuryAction>
            )}
          </SwapActions>
        </Form>
      )}
    </>
  )
}

const sections = [
  { value: 'overview', label: 'Overview', icon: <WalletIcon width="18px" aria-hidden="true" /> },
  { value: 'activity', label: 'Activity', icon: <HistoryIcon width="18px" aria-hidden="true" /> },
  { value: 'reserves', label: 'Pool reserves', icon: <ListViewIcon width="18px" aria-hidden="true" /> },
  { value: 'settings', label: 'Asset settings', icon: <CogIcon width="18px" aria-hidden="true" /> },
] as const

const operations = [
  { value: 'deposit', label: 'Deposit', icon: <ArrowDownIcon width="17px" aria-hidden="true" /> },
  { value: 'withdraw', label: 'Withdraw', icon: <ArrowUpIcon width="17px" aria-hidden="true" /> },
  { value: 'swap', label: 'Swap', icon: <SwapIcon width="17px" aria-hidden="true" /> },
] as const

const INITIAL_ASSETS = 6

export default function V36Treasury({
  operation,
  onOperationChange,
  selectedAsset,
  onSelectAsset,
  transfer,
  status,
  pause,
  reserves,
  activity,
  ...props
}: Props & {
  operation: TreasuryOperation
  onOperationChange: (value: TreasuryOperation) => void
  selectedAsset?: Address
  onSelectAsset: (address: Address) => void
  transfer: ReactNode
  status: ReactNode
  pause: ReactNode
  reserves: ReactNode
  activity: ReactNode
}) {
  const { studio, treasury, account } = props
  const owner = Boolean(account && isAddressEqual(account, treasury.owner))
  const [section, setSection] = useState<(typeof sections)[number]['value']>('overview')
  const [sectionPointer, setSectionPointer] = useState(false)
  const [operationPointer, setOperationPointer] = useState(false)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(false)
  const tabId = useId()
  const operationId = useId()
  const fundsId = useId()
  const assets = preferStudioTokens(studio.supported)
  const query = search.trim().toLowerCase()
  const matching = assets.filter((token) =>
    [token.symbol, token.address].some((value) => value.toLowerCase().includes(query)),
  )
  const visible = expanded || query ? matching : matching.slice(0, INITIAL_ASSETS)
  const available = (token: Token) => token.balance?.available ?? ZERO
  const allocated = (token: Token) => token.balance?.allocated ?? ZERO
  const sectionPanel = (value: (typeof sections)[number]['value']) => ({
    id: `${tabId}-${value}-panel`,
    'aria-labelledby': `${tabId}-${value}-tab`,
    'data-enter': sectionPointer,
    hidden: section !== value,
  })
  const operationPanel = (value: TreasuryOperation) => ({
    id: `${operationId}-${value}-panel`,
    'aria-labelledby': `${operationId}-${value}-tab`,
    'data-enter': operationPointer,
    hidden: operation !== value,
  })

  return (
    <Workspace>
      <WorkspaceHeader>
        <TreasuryTabs
          id={tabId}
          tabs={sections}
          label="Treasury sections"
          active={section}
          pointer={sectionPointer}
          onChange={(value, pointer) => {
            setSectionPointer(pointer)
            setSection(value)
          }}
        />
        <TreasuryStatus $paused={treasury.paused}>
          {treasury.paused ? 'Treasury paused' : 'Treasury open'}
        </TreasuryStatus>
      </WorkspaceHeader>

      <TabPanel role="tabpanel" aria-label="Treasury overview" {...sectionPanel('overview')}>
        <OverviewGrid>
          <TreasuryPanel aria-label="Asset balances">
            <AssetHeader>
              <PanelHeading>
                <div>
                  <h2>Asset balances</h2>
                  <p>
                    {assets.length} {assets.length === 1 ? 'asset' : 'assets'} in Treasury
                  </p>
                </div>
                <JumpToFunds href={`#${fundsId}`} aria-label="Jump to move funds">
                  <ChevronRightIcon width="18px" aria-hidden="true" />
                  Move funds
                </JumpToFunds>
              </PanelHeading>
              {assets.length > INITIAL_ASSETS && (
                <AssetSearch>
                  <SearchIcon width="18px" aria-hidden="true" />
                  <input
                    type="search"
                    aria-label="Search Treasury assets"
                    placeholder="Search assets"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </AssetSearch>
              )}
            </AssetHeader>
            <AssetTable role="region" aria-label="Treasury balances by asset" tabIndex={0}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Asset</th>
                    <th scope="col">Available</th>
                    <th scope="col">Allocated</th>
                    <th scope="col">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((token) => (
                    <tr key={token.address} data-selected={token.address === selectedAsset}>
                      <th scope="row">
                        <AssetButton
                          type="button"
                          aria-label={`Select ${token.symbol}`}
                          aria-pressed={token.address === selectedAsset}
                          disabled={!owner || props.locked}
                          onClick={() => {
                            onSelectAsset(token.address)
                            if (operation === 'swap') onOperationChange('deposit')
                            const funds = document.getElementById(fundsId)
                            if (window.matchMedia('(max-width: 969px)').matches) {
                              funds?.focus({ preventScroll: true })
                              funds?.scrollIntoView({ block: 'start' })
                            }
                          }}
                        >
                          <TreasuryAssetIcon asset={token} wrappedNative={studio.wrappedNative} size={28} />
                          <span>
                            <strong>{token.symbol}</strong>
                            <small>{token.review?.valid ? token.address.slice(0, 8) : 'Review required'}</small>
                          </span>
                        </AssetButton>
                      </th>
                      <td>{treasuryBalance(available(token), token.decimals)}</td>
                      <td>{treasuryBalance(allocated(token), token.decimals)}</td>
                      <td>{treasuryBalance(available(token) + allocated(token), token.decimals)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AssetTable>
            {!visible.length && (
              <PanelBody>
                <V3Muted role="status">
                  {query ? 'No assets match this search.' : 'Review a token in Asset settings to start using Treasury.'}
                </V3Muted>
              </PanelBody>
            )}
            {visible.length > 0 && (
              <AssetFooter>
                <V3Muted>Allocated funds are reserved for pools.</V3Muted>
                {!query && assets.length > INITIAL_ASSETS && (
                  <TextButton type="button" onClick={() => setExpanded((value) => !value)}>
                    {expanded ? 'Show fewer' : `Show all ${assets.length} assets`}
                  </TextButton>
                )}
              </AssetFooter>
            )}
          </TreasuryPanel>

          <ActionPanel id={fundsId} tabIndex={-1} aria-label="Move funds">
            <PanelBody>
              <PanelHeading>
                <div>
                  <h2>Move funds</h2>
                  <p>Between your wallet, Treasury and approved assets.</p>
                </div>
              </PanelHeading>
              {owner ? (
                <>
                  <TreasuryTabs
                    id={operationId}
                    tabs={operations}
                    label="Treasury transactions"
                    active={operation}
                    compact
                    pointer={operationPointer}
                    onChange={(value, pointer) => {
                      setOperationPointer(pointer)
                      onOperationChange(value)
                    }}
                  />
                  {(['deposit', 'withdraw'] as const).map((value) => (
                    <TabPanel key={value} role="tabpanel" {...operationPanel(value)}>
                      {operation === value && transfer}
                    </TabPanel>
                  ))}
                  <SwapPanel role="tabpanel" {...operationPanel('swap')}>
                    <Swap {...props} />
                  </SwapPanel>
                  {section === 'overview' && status}
                </>
              ) : (
                <V3Muted>Connect the Treasury owner wallet to move funds.</V3Muted>
              )}
            </PanelBody>
          </ActionPanel>
        </OverviewGrid>
      </TabPanel>

      <TabPanel role="tabpanel" tabIndex={0} {...sectionPanel('activity')}>
        {activity}
      </TabPanel>
      <TabPanel role="tabpanel" tabIndex={0} {...sectionPanel('reserves')}>
        {reserves}
      </TabPanel>
      <TabPanel role="tabpanel" tabIndex={0} {...sectionPanel('settings')}>
        {owner ? (
          <SettingsGrid>
            <TreasuryPanel aria-label="Asset registration and permissions">
              <PanelBody>
                <PanelHeading>
                  <div>
                    <h2>Asset settings</h2>
                    <p>Review a contract or change what an approved token can do.</p>
                  </div>
                </PanelHeading>
                <AddToken {...props} />
                {assets.length > 0 && <ManagePermissions {...props} />}
                {section === 'settings' && status}
              </PanelBody>
            </TreasuryPanel>
            <TreasuryPanel aria-label="Treasury controls">
              <PanelBody>
                <PanelHeading>
                  <div>
                    <h2>Treasury controls</h2>
                    <p>Pause deposits, withdrawals and swaps when needed.</p>
                  </div>
                </PanelHeading>
                {pause}
                {assets.some(({ review }) => review && (review.swappedIn > ZERO || review.swappedOut > ZERO)) && (
                  <Review>
                    <summary>Swap totals by asset</summary>
                    <TreasuryTable role="region" aria-label="Treasury swap totals" tabIndex={0}>
                      <table>
                        <thead>
                          <tr>
                            <th scope="col">Asset</th>
                            <th scope="col">Swapped in</th>
                            <th scope="col">Swapped out</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assets.map(({ address, symbol, decimals, review }) => (
                            <tr key={address}>
                              <th scope="row">{symbol}</th>
                              <td>{shortAmount(review?.swappedIn ?? ZERO, decimals)}</td>
                              <td>{shortAmount(review?.swappedOut ?? ZERO, decimals)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </TreasuryTable>
                  </Review>
                )}
              </PanelBody>
            </TreasuryPanel>
          </SettingsGrid>
        ) : (
          <V3Muted>Only the Treasury owner can manage assets and permissions.</V3Muted>
        )}
      </TabPanel>
      {(section === 'activity' || section === 'reserves') && (props.action.busy || props.action.unconfirmed) && (
        <div>{status}</div>
      )}
    </Workspace>
  )
}
