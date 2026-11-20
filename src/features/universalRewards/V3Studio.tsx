import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from 'react'
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi'
import { encodeFunctionData, formatUnits, isAddressEqual, zeroAddress, type Address } from 'viem'
import { universalRewardsAbi } from './abi'
import { useV3Action, useV3Query, useV3Wallet } from './hooks'
import { isV3ClaimExpired, shortAmount } from './presentation'
import { createV3Client, getV3Deployment, type V3Client, type V3Deployment } from './runtime'
import {
  buildV3Preview,
  createV3FundedPool,
  fundV3Budget,
  parseV3Amount,
  readV3Funding,
  readV3Studio,
  type V3Preview,
  type V3StudioDraft,
  type V3StudioSnapshot,
} from './studio'
import { approveV3Funding, createdV3PoolId, describeV3Error } from './transactions'
import { UNIT } from './units'
import { loadV3PresentationDocument, type V3PresentationDocument } from './poolPresentation'
import V3StudioDashboard from './V3StudioDashboard'
import V3StudioPool, { type V3StudioPreviewProps } from './V3StudioPool'
import V3Treasury from './V3Treasury'
import {
  FundingDisclosure,
  FundingMethod,
  FundingSplit,
  RewardBudgetSection,
  StudioBar,
  WorkspaceBack,
  WorkspaceHeading,
} from './studioDashboardStyles'
import {
  V3Actions,
  V3Badge,
  V3Button,
  V3Card,
  V3Error,
  V3Field,
  V3Grid,
  V3Link,
  V3Metrics,
  V3Muted,
  V3Page,
  V3Section,
} from './styles'

const ZERO = BigInt(0)
const defaultDraft: V3StudioDraft = {
  name: '',
  description: '',
  artwork: '/images/collectHeroes/14.jpg',
  startLocal: '',
  durationDays: '7',
  threshold: '1',
  maxWallets: '20',
  maxNfts: '3',
  fundAsset: '',
  budget: '',
  intervalHours: '24',
  usdPerFundingUnit: '',
  collections: [],
  rewards: [],
}

function TransactionFeedback({
  transaction,
  deployment,
  onReceipt,
  purpose,
}: {
  transaction: ReturnType<typeof useV3Action>
  deployment?: V3Deployment
  purpose?: string
  onReceipt: (receipt: NonNullable<Awaited<ReturnType<typeof transaction.recheck>>>) => void
}) {
  return (
    <V3Actions>
      <V3Muted role="status">
        {transaction.message && (purpose ? `${purpose} · ${transaction.message}` : transaction.message)}
      </V3Muted>
      {transaction.error && <V3Error role="alert">{transaction.error}</V3Error>}
      {transaction.unconfirmed && (
        <V3Button
          type="button"
          $secondary
          disabled={transaction.busy}
          onClick={async () => {
            const receipt = await transaction.recheck()
            if (receipt) onReceipt(receipt)
          }}
        >
          Check confirmation
        </V3Button>
      )}
      {transaction.hash &&
        (deployment?.chainId === 137 ? (
          <V3Link href={`https://polygonscan.com/tx/${transaction.hash}`} rel="noreferrer" target="_blank">
            View Polygon transaction
          </V3Link>
        ) : (
          <V3Muted>Local transaction · {transaction.hash}</V3Muted>
        ))}
    </V3Actions>
  )
}

function fundingBalanceIssue(view: Awaited<ReturnType<typeof readV3Funding>>, amount: bigint, native: boolean) {
  if (native && view.nativeBalance <= amount) return 'Leave some POL in your wallet to cover the network fee.'
  if (!native && view.tokenBalance < amount) {
    const choosePol = isAddressEqual(view.token.address, view.wrappedNative) && view.nativeBalance > amount
    return choosePol
      ? `Your ${view.token.symbol} balance is too low. Choose POL above to fund this pool.`
      : `You have ${shortAmount(view.tokenBalance, view.token.decimals)} ${
          view.token.symbol
        }. Lower the deposit amount or add funds to your wallet.`
  }
}

function FundingPanel({
  client,
  deployment,
  account,
  poolId,
  writeAllowed,
  setPending,
}: {
  client: V3Client
  deployment: V3Deployment
  account?: Address
  poolId: bigint
  writeAllowed: boolean
  setPending: (pending: boolean) => void
}) {
  const getWallet = useV3Wallet(deployment?.chainId)
  const [deposit, setDeposit] = useState<string>()
  const [purpose, setPurpose] = useState<string>()
  const [funding, setFunding] = useState(false)
  const fundingLock = useRef(false)
  const [paymentMethod, setPaymentMethod] = useState<'native' | 'token'>()
  const [error, setError] = useState('')
  const load = useCallback(
    () => readV3Funding(client, deployment, poolId, account),
    [client, deployment, poolId, account],
  )
  const result = useV3Query(`${deployment.address}:${poolId}:${account ?? ''}`, load, 20_000)
  const view = result.data
  const transaction = useV3Action(client, deployment, getWallet, account)
  const pending = funding || transaction.busy || transaction.unconfirmed
  useEffect(() => {
    setPending(pending)
    return () => setPending(false)
  }, [pending, setPending])
  const locked = !writeAllowed || !getWallet || pending
  const remaining = view ? view.pool.funding.budget - view.pool.funding.deposited : ZERO
  const ended = view ? view.pool.timestamp >= view.pool.config.end : false
  const claimsExpired = view ? isV3ClaimExpired(view.pool) : false
  const loadAutomation = useCallback(async () => {
    const response = await fetch('/api/v3/replenish?status=1', { cache: 'no-store' })
    if (!response.ok) throw new Error('Automatic funding status is unavailable.')
    return response.json() as Promise<{ mode: 'disabled' | 'starting' | 'running'; firstPool?: string }>
  }, [])
  const automation = useV3Query(`${deployment.address}:v3-funding-automation`, loadAutomation, 15_000)
  const automationMode =
    automation.data?.firstPool && BigInt(automation.data.firstPool) <= poolId ? automation.data.mode : 'disabled'
  const amountText = deposit ?? (view?.token.decimals != null ? formatUnits(remaining, view.token.decimals) : '')
  const value = () => {
    if (!view || view.token.decimals === null) throw new Error('The funding asset decimals could not be verified.')
    const amount = parseV3Amount(amountText, view.token.decimals, 'deposit amount')
    if (amount > remaining) throw new Error('The deposit exceeds the remaining funding budget.')
    return amount
  }
  let selectedAmount: bigint | undefined
  try {
    if (view && remaining > ZERO) selectedAmount = value()
  } catch {
    // Custom amount errors are reported when the form is submitted.
  }
  const hasNativeOption = Boolean(
    view && !view.treasuryBacked && isAddressEqual(view.token.address, view.wrappedNative),
  )
  const comparableAmount = selectedAmount ?? remaining
  const payNative = Boolean(
    view &&
      hasNativeOption &&
      (paymentMethod === 'native' ||
        (!paymentMethod && (view.nativeBalance > comparableAmount || view.tokenBalance < comparableAmount))),
  )
  const fundingSymbol = payNative ? 'POL' : view?.token.symbol
  const buttonAmount =
    selectedAmount !== undefined && view?.token.decimals != null ? formatUnits(selectedAmount, view.token.decimals) : ''
  const requiresApproval = Boolean(
    view && !view.treasuryBacked && selectedAmount !== undefined && !payNative && view.allowance < selectedAmount,
  )
  const balanceIssue =
    view && !view.treasuryBacked && selectedAmount !== undefined
      ? fundingBalanceIssue(view, selectedAmount, payNative)
      : undefined
  const depositBudget = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!view || view.token.decimals === null || locked || fundingLock.current || ended) return
    const form = event.currentTarget
    fundingLock.current = true
    setFunding(true)
    setError('')
    try {
      const amount = value()
      const fresh = await load()
      if (
        fresh.pool.funding.budget - fresh.pool.funding.deposited < amount ||
        fresh.pool.timestamp >= fresh.pool.config.end
      ) {
        throw new Error('The available budget changed. Review the updated amount before funding.')
      }
      if (fresh.treasuryBacked) {
        setPurpose('Reserve additional funding from treasury')
        const data = encodeFunctionData({
          abi: universalRewardsAbi,
          functionName: 'allocateTreasuryBudget',
          args: [poolId, amount],
        })
        if (await transaction.run({ to: deployment.address, data })) setDeposit(undefined)
        return
      }
      const issue = fundingBalanceIssue(fresh, amount, payNative)
      if (issue) throw new Error(issue)
      if (!payNative && fresh.allowance < amount) {
        setPurpose(`Approve ${view.token.symbol} spending`)
        if (!(await transaction.run(approveV3Funding(deployment, view.token.address, amount)))) return
      }
      setPurpose(`Deposit ${formatUnits(amount, view.token.decimals)} ${fundingSymbol}`)
      if (await transaction.run(fundV3Budget(deployment, poolId, amount, payNative))) setDeposit(undefined)
    } catch (failure) {
      setError(describeV3Error(failure))
      const input = form.querySelector<HTMLInputElement>('[name="deposit-amount"]')
      if (input && input.getClientRects().length) input.focus()
    } finally {
      result.refresh()
      setFunding(false)
      fundingLock.current = false
    }
  }

  return (
    <RewardBudgetSection id="v3-reward-budget" aria-label="Funding and treasury">
      <header>
        <h2>Reward budget · Pool #{poolId.toString()}</h2>
      </header>
      {result.loading && !view && <V3Muted role="status">Reading the funding plan…</V3Muted>}
      {result.error && (
        <V3Actions>
          <V3Error role="status">{result.error}</V3Error>
          <V3Button type="button" $secondary onClick={result.refresh}>
            Retry
          </V3Button>
        </V3Actions>
      )}
      {view && (
        <>
          <V3Card>
            <div>
              <V3Badge>
                {ended
                  ? 'Finished'
                  : view.treasuryBacked
                  ? remaining === ZERO
                    ? 'Treasury budget fully reserved'
                    : 'Treasury budget partly reserved'
                  : view.pool.funding.deposited === ZERO
                  ? 'Awaiting deposit'
                  : remaining === ZERO
                  ? 'Budget fully deposited'
                  : 'Budget partially deposited'}
              </V3Badge>
              <V3Metrics>
                <div>
                  <dt>Total lifetime budget</dt>
                  <dd>
                    {shortAmount(view.pool.funding.budget, view.token.decimals)} {view.token.symbol}
                  </dd>
                </div>
                <div>
                  <dt>{view.treasuryBacked ? 'Reserved from treasury' : 'Deposited'}</dt>
                  <dd>
                    {shortAmount(view.pool.funding.deposited, view.token.decimals)} {view.token.symbol}
                  </dd>
                </div>
                <div>
                  <dt>Spent on rewards</dt>
                  <dd>
                    {shortAmount(view.pool.funding.spent, view.token.decimals)} {view.token.symbol}
                  </dd>
                </div>
                <div>
                  <dt>{ended ? 'Returned to treasury' : 'Available for future purchases'}</dt>
                  <dd>
                    {shortAmount(
                      ended
                        ? view.pool.funding.recovered
                        : view.pool.funding.deposited - view.pool.funding.spent - view.pool.funding.recovered,
                      view.token.decimals,
                    )}{' '}
                    {view.token.symbol}
                  </dd>
                </div>
              </V3Metrics>
              {!ended && remaining > ZERO && (
                <form method="post" aria-label="Deposit reward budget" onSubmit={depositBudget}>
                  {hasNativeOption && (
                    <FundingMethod disabled={locked} aria-describedby="v3-deposit-help">
                      <legend>Pay with</legend>
                      <label data-selected={payNative}>
                        <input
                          type="radio"
                          name="funding-method"
                          value="native"
                          checked={payNative}
                          onChange={() => {
                            setPaymentMethod('native')
                            setError('')
                          }}
                        />
                        <span>
                          <strong>POL</strong>
                          <small>{shortAmount(view.nativeBalance, 18)} POL available</small>
                        </span>
                      </label>
                      <label data-selected={!payNative}>
                        <input
                          type="radio"
                          name="funding-method"
                          value="token"
                          checked={!payNative}
                          onChange={() => {
                            setPaymentMethod('token')
                            setError('')
                          }}
                        />
                        <span>
                          <strong>{view.token.symbol}</strong>
                          <small>
                            {shortAmount(view.tokenBalance, view.token.decimals)} {view.token.symbol} available
                          </small>
                        </span>
                      </label>
                    </FundingMethod>
                  )}
                  {balanceIssue ? (
                    <V3Error role="status" id="v3-deposit-help">
                      {balanceIssue}
                    </V3Error>
                  ) : (
                    <V3Muted id="v3-deposit-help">
                      {view.treasuryBacked
                        ? 'Confirm an internal allocation from the available treasury balance.'
                        : payNative
                        ? `The contract wraps your POL into ${view.token.symbol} during the deposit. One wallet confirmation.`
                        : requiresApproval
                        ? `Confirm ${view.token.symbol} spending permission first, then confirm the deposit.`
                        : `Confirm the ${view.token.symbol} deposit in your wallet.`}
                    </V3Muted>
                  )}
                  <FundingDisclosure>
                    <summary>Change deposit amount</summary>
                    <V3Field>
                      Amount to deposit · {fundingSymbol}
                      <input
                        name="deposit-amount"
                        inputMode="decimal"
                        value={amountText}
                        disabled={locked}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? 'v3-deposit-error' : 'v3-deposit-help'}
                        onChange={(event) => {
                          setDeposit(event.target.value)
                          setError('')
                        }}
                      />
                    </V3Field>
                  </FundingDisclosure>
                  <V3Button
                    type="submit"
                    disabled={locked || view.token.decimals === null || Boolean(balanceIssue)}
                    aria-describedby="v3-deposit-help"
                  >
                    {funding
                      ? 'Funding in progress…'
                      : buttonAmount
                      ? `${view.treasuryBacked ? 'Reserve' : 'Fund'} ${buttonAmount} ${fundingSymbol}`
                      : 'Fund budget'}
                  </V3Button>
                  {error && (
                    <V3Error role="alert" id="v3-deposit-error">
                      {error}
                    </V3Error>
                  )}
                </form>
              )}
              <div>
                <h3>Reward allocation</h3>
                {!ended && (
                  <V3Muted role="status">
                    {view.pool.funding.paused
                      ? 'Automatic reward purchases are paused.'
                      : automation.error
                      ? 'Automatic funding status is unavailable.'
                      : automationMode === 'running'
                      ? `The worker fills these reserves on schedule using your deposited ${view.token.symbol}.`
                      : automationMode === 'starting'
                      ? 'Waiting for the reward worker to check in.'
                      : 'Automatic reward purchases are offline here. Manual controls are available below.'}
                  </V3Muted>
                )}
                <FundingSplit>
                  {view.lanes.map((lane) => (
                    <li key={lane.reward.token}>
                      <strong>
                        {lane.reward.symbol} · {lane.split.allocationBps / 100}%
                      </strong>
                      <span>
                        {shortAmount(lane.reward.inventory, lane.reward.decimals)} {lane.reward.symbol} in reserve
                      </span>
                      {lane.blocker && <small>{lane.blocker}</small>}
                    </li>
                  ))}
                </FundingSplit>
              </div>
            </div>
          </V3Card>
          <FundingDisclosure>
            <summary>Advanced funding controls</summary>
            <V3Actions>
              {ended ? (
                <V3Button
                  type="button"
                  $secondary
                  disabled={
                    locked || view.pool.funding.deposited === view.pool.funding.spent + view.pool.funding.recovered
                  }
                  onClick={async () => {
                    setPurpose('Return unused funding')
                    const data = encodeFunctionData({
                      abi: universalRewardsAbi,
                      functionName: 'recoverBudget',
                      args: [poolId],
                    })
                    if (await transaction.run({ to: deployment.address, data })) result.refresh()
                  }}
                >
                  Return unused funding to treasury
                </V3Button>
              ) : (
                <V3Button
                  type="button"
                  $secondary
                  disabled={locked}
                  onClick={async () => {
                    setPurpose(view.pool.funding.paused ? 'Resume reward purchases' : 'Pause reward purchases')
                    const data = encodeFunctionData({
                      abi: universalRewardsAbi,
                      functionName: 'setFundingPaused',
                      args: [poolId, !view.pool.funding.paused],
                    })
                    if (await transaction.run({ to: deployment.address, data })) result.refresh()
                  }}
                >
                  {view.pool.funding.paused ? 'Resume replenishment' : 'Pause replenishment'}
                </V3Button>
              )}
            </V3Actions>
            <V3Grid>
              {view.lanes.map((lane) => (
                <V3Card key={lane.reward.token}>
                  <div>
                    <h3>
                      {lane.reward.symbol} rewards · {lane.split.allocationBps / 100}%
                    </h3>
                    <V3Muted>
                      Committed to NFTs ·{' '}
                      {shortAmount(claimsExpired ? ZERO : lane.reward.committed / UNIT, lane.reward.decimals)}{' '}
                      {lane.reward.symbol}
                    </V3Muted>
                    <V3Muted>
                      Purchased reserve · {shortAmount(lane.reward.inventory, lane.reward.decimals)}{' '}
                      {lane.reward.symbol}
                    </V3Muted>
                    {lane.blocker && <V3Error role="status">Swap blocked · {lane.blocker}</V3Error>}
                    {!ended && lane.quote && (
                      <V3Muted>
                        Next tranche · {shortAmount(lane.amount, view.token.decimals)} {view.token.symbol} · minimum{' '}
                        {shortAmount(lane.quote[1], lane.reward.decimals)} {lane.reward.symbol}
                      </V3Muted>
                    )}
                    {ended && !claimsExpired && (
                      <V3Button
                        type="button"
                        $secondary
                        disabled={locked}
                        onClick={async () => {
                          setPurpose(`Return uncommitted ${lane.reward.symbol}`)
                          const data = encodeFunctionData({
                            abi: universalRewardsAbi,
                            functionName: 'recoverSurplus',
                            args: [poolId, lane.reward.token],
                          })
                          if (await transaction.run({ to: deployment.address, data })) result.refresh()
                        }}
                      >
                        Return uncommitted {lane.reward.symbol}
                      </V3Button>
                    )}
                    {!ended && (
                      <V3Button
                        type="button"
                        $secondary
                        disabled={locked || !lane.quote || view.pool.funding.paused}
                        onClick={async () => {
                          if (!lane.quote) return
                          setPurpose(`Replenish ${lane.reward.symbol}`)
                          const data = encodeFunctionData({
                            abi: universalRewardsAbi,
                            functionName: 'replenish',
                            args: [
                              poolId,
                              lane.reward.token,
                              lane.epoch,
                              lane.quote[1],
                              view.pool.timestamp + BigInt(120),
                            ],
                          })
                          if (await transaction.run({ to: deployment.address, data })) result.refresh()
                        }}
                      >
                        Replenish {lane.reward.symbol}
                      </V3Button>
                    )}
                  </div>
                </V3Card>
              ))}
            </V3Grid>
          </FundingDisclosure>
        </>
      )}
      <TransactionFeedback
        transaction={transaction}
        deployment={deployment}
        purpose={purpose}
        onReceipt={result.refresh}
      />
    </RewardBudgetSection>
  )
}

export interface V3StudioComposerProps {
  draft: V3StudioDraft
  studio: V3StudioSnapshot
  deployment: V3Deployment
  client: V3Client
  locked: boolean
  onChange: (next: Partial<V3StudioDraft>) => void
  launch: ReactNode
}

export default function V3Studio({
  connect,
  Composer,
  Preview,
}: {
  connect: ReactNode
  Composer: ComponentType<V3StudioComposerProps>
  Preview: ComponentType<V3StudioPreviewProps>
}) {
  const deployment = useMemo(getV3Deployment, [])
  const client = useMemo(createV3Client, [])
  const wallet = useAccount()
  const account = wallet.isConnected ? wallet.address : undefined
  const { chainId } = wallet
  const { disconnect, isPending: disconnecting, error: disconnectError } = useDisconnect()
  const getWallet = useV3Wallet(deployment?.chainId)
  const { switchChain } = useSwitchChain()
  const [draft, setDraft] = useState<V3StudioDraft>(defaultDraft)
  const [preview, setPreview] = useState<V3Preview>()
  const [mode, setMode] = useState<'dashboard' | 'create' | 'treasury' | bigint>('dashboard')
  const [savedPresentations, setSavedPresentations] = useState<{
    document: V3PresentationDocument
    checkedAt: number
  }>()
  const workspace = useRef<HTMLHeadingElement>(null)
  const [reviewError, setReviewError] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [fundingPending, setFundingPending] = useState(false)
  const summary = useRef<HTMLParagraphElement>(null)
  const reviewHeading = useRef<HTMLHeadingElement>(null)
  const loadStudio = useCallback(async () => {
    if (!deployment) throw new Error('This environment has no V3 deployment.')
    return readV3Studio(client, deployment)
  }, [client, deployment])
  const studio = useV3Query(deployment?.address ?? '', loadStudio, 30_000)
  const allowed = Boolean(account && studio.data && isAddressEqual(account, studio.data.admin))
  const treasuryOwner = Boolean(account && studio.data?.treasury && isAddressEqual(account, studio.data.treasury.owner))
  const writeAllowed = Boolean(allowed && deployment && chainId === deployment.chainId)
  const transaction = useV3Action(client, deployment, getWallet, account)
  const locked = transaction.busy || transaction.unconfirmed || reviewing

  const loadPresentation = useCallback(() => {
    if (!deployment) return Promise.resolve(undefined)
    return loadV3PresentationDocument(deployment, true).then((document) => ({ document, checkedAt: Date.now() }))
  }, [deployment])
  const presentations = useV3Query(allowed && deployment ? deployment.address : '', loadPresentation, 30_000)
  const refreshPresentation = () => {
    setSavedPresentations(undefined)
    presentations.refresh()
  }
  const setPresentation = (document: V3PresentationDocument) => {
    setSavedPresentations({ document, checkedAt: Date.now() })
    presentations.refresh()
  }
  // A just-saved local document takes effect immediately, ahead of the next read.
  const latest = presentations.data
  const activePresentation =
    latest?.document && (!savedPresentations || latest.checkedAt > savedPresentations.checkedAt)
      ? latest.document
      : savedPresentations?.document ?? latest?.document

  const navigate = (next: typeof mode) => {
    setMode(next)
    window.requestAnimationFrame(() => workspace.current?.focus())
  }

  const update = (next: Partial<V3StudioDraft>) => {
    setDraft((previous) => ({ ...previous, ...next }))
    if (preview) setPreview(undefined)
    if (reviewError) setReviewError('')
  }

  const review = async () => {
    if (!deployment || !allowed || locked) return
    setReviewError('')
    setReviewing(true)
    try {
      const planned = await buildV3Preview(client, deployment, draft)
      setPreview(planned)
      window.requestAnimationFrame(() => reviewHeading.current?.focus())
    } catch (error) {
      setReviewError(describeV3Error(error))
      window.requestAnimationFrame(() => summary.current?.focus())
    } finally {
      setReviewing(false)
    }
  }

  const confirmCreated = (receipt: NonNullable<Awaited<ReturnType<typeof transaction.run>>>) => {
    if (!deployment) return
    try {
      const created = createdV3PoolId(receipt, deployment.address)
      setDraft(defaultDraft)
      setPreview(undefined)
      navigate(created)
    } catch (error) {
      setReviewError(describeV3Error(error))
    }
  }

  const create = async () => {
    if (!deployment || !preview || !account || !writeAllowed || locked) return
    if (!isAddressEqual(account, preview.admin)) return
    const receipt = await transaction.run(createV3FundedPool(deployment, preview))
    if (receipt) confirmCreated(receipt)
  }

  return (
    <V3Page>
      <V3Section aria-label="Pool Studio V3">
        <StudioBar>
          <div>
            <h1 ref={mode === 'dashboard' ? workspace : undefined} tabIndex={-1}>
              Pool Studio V3
            </h1>
            <V3Muted>Create and manage your NFT reward pools.</V3Muted>
          </div>
          <V3Actions>
            {mode === 'dashboard' && studio.data?.treasury && (allowed || treasuryOwner) && (
              <V3Button type="button" $secondary onClick={() => navigate('treasury')}>
                Treasury
              </V3Button>
            )}
            {allowed && mode === 'dashboard' && (
              <V3Button type="button" disabled={locked} onClick={() => navigate('create')}>
                New pool
              </V3Button>
            )}
          </V3Actions>
        </StudioBar>
        {!deployment && <V3Muted role="status">V3 Studio has no active deployment in this environment.</V3Muted>}
        {deployment && !account && connect}
        {studio.loading && !studio.data && <V3Muted role="status">Checking the V3 deployment…</V3Muted>}
        {studio.error && (
          <V3Actions>
            <V3Error role="status">{studio.error}</V3Error>
            <V3Button type="button" $secondary onClick={studio.refresh}>
              Retry
            </V3Button>
          </V3Actions>
        )}
        {account && studio.data && !allowed && mode !== 'treasury' && (
          <V3Card aria-label="V3 operator account required">
            <div>
              <h2>Switch to the V3 operator account</h2>
              <V3Muted role="status">
                Connected account · <code>{account}</code>
                <br />
                V3 operator · <code>{studio.data.admin}</code>
              </V3Muted>
              <V3Muted>
                Select the operator account in {wallet.connector?.name || 'your wallet'}. To use a different wallet
                extension, disconnect here, then connect with that wallet.
              </V3Muted>
              <V3Actions>
                <V3Button type="button" $secondary disabled={disconnecting} onClick={() => disconnect()}>
                  {disconnecting ? 'Disconnecting…' : 'Disconnect wallet'}
                </V3Button>
              </V3Actions>
              {disconnectError && <V3Error role="alert">{describeV3Error(disconnectError)}</V3Error>}
            </div>
          </V3Card>
        )}
        {allowed && deployment && !writeAllowed && (
          <V3Actions>
            <V3Muted role="status">Switch your wallet to the V3 settlement network.</V3Muted>
            <V3Button type="button" $secondary onClick={() => switchChain({ chainId: deployment.chainId })}>
              Switch network
            </V3Button>
          </V3Actions>
        )}
        {mode === 'treasury' && studio.data?.treasury && deployment && (allowed || treasuryOwner) && (
          <>
            <WorkspaceBack type="button" $secondary onClick={() => navigate('dashboard')}>
              Back to pools
            </WorkspaceBack>
            <V3Treasury
              client={client}
              deployment={deployment}
              studio={studio.data}
              account={account}
              onChange={studio.refresh}
              getWallet={getWallet}
              rightNetwork={chainId === deployment.chainId}
            />
          </>
        )}
        {allowed && deployment && studio.data && mode !== 'treasury' && (
          <>
            <div hidden={mode !== 'dashboard'}>
              <V3StudioDashboard
                active={mode === 'dashboard'}
                client={client}
                deployment={deployment}
                presentation={activePresentation}
                open={navigate}
                create={() => navigate('create')}
              />
            </div>
            {mode !== 'dashboard' && (
              <WorkspaceBack
                type="button"
                $secondary
                disabled={locked || fundingPending}
                onClick={() => navigate('dashboard')}
              >
                Back to pools
              </WorkspaceBack>
            )}
            {mode === 'create' && (
              <>
                <WorkspaceHeading ref={workspace} tabIndex={-1}>
                  Create a pool
                </WorkspaceHeading>
                <Composer
                  draft={draft}
                  studio={studio.data}
                  deployment={deployment}
                  client={client}
                  locked={locked}
                  onChange={update}
                  launch={
                    <>
                      {studio.data.treasury && (
                        <>
                          <V3Field>
                            Funding source
                            <select
                              name="funding-source"
                              value={draft.fundingSource ?? 'wallet'}
                              onChange={(event) =>
                                update({ fundingSource: event.target.value as V3StudioDraft['fundingSource'] })
                              }
                            >
                              <option value="wallet">Wallet deposit</option>
                              <option value="treasury">Available central Treasury balance</option>
                            </select>
                          </V3Field>
                          {draft.fundingSource === 'treasury' && (
                            <>
                              <V3Field>
                                Purchase strategy
                                <select
                                  name="purchase-strategy"
                                  value={draft.purchaseMode ?? 'automatic'}
                                  onChange={(event) =>
                                    update({ purchaseMode: event.target.value as V3StudioDraft['purchaseMode'] })
                                  }
                                >
                                  <option value="automatic">
                                    Automatic · consolidate when safe, otherwise use bounded windows
                                  </option>
                                  <option value="consolidated">
                                    Consolidated · buy the lifetime allocation when safe
                                  </option>
                                  <option value="adaptive">Adaptive · replenish when inventory is low</option>
                                </select>
                              </V3Field>
                              <V3Muted>
                                Pool creation reserves the total lifetime budget in the same transaction.
                              </V3Muted>
                            </>
                          )}
                        </>
                      )}
                      <V3Button type="button" disabled={locked} onClick={() => void review()}>
                        {reviewing ? 'Checking on-chain routes…' : 'Review pool plan'}
                      </V3Button>
                      {reviewError && (
                        <V3Error tabIndex={-1} ref={summary} role="alert">
                          {reviewError}
                        </V3Error>
                      )}
                    </>
                  }
                />
                {preview && (
                  <V3Card>
                    <div>
                      <h2 ref={reviewHeading} tabIndex={-1}>
                        Review funding and rewards
                      </h2>
                      {preview.usdPerDay !== undefined && (
                        <V3Muted>Reference daily budget · {shortAmount(preview.usdPerDay, 6)} USD</V3Muted>
                      )}
                      <V3Metrics>
                        {preview.rewards.map((reward) => (
                          <div key={reward.token}>
                            <dt>{reward.symbol} reward cap</dt>
                            <dd>
                              {shortAmount(reward.cap, reward.decimals)} {reward.symbol}
                            </dd>
                            <dt>Allocated funding</dt>
                            <dd>
                              {shortAmount(reward.allocation, preview.fundingAsset.decimals)}{' '}
                              {preview.fundingAsset.symbol}
                            </dd>
                            <dt>{preview.consolidated ? 'Lifetime purchase minimum' : 'Next tranche minimum'}</dt>
                            <dd>
                              {shortAmount(reward.minimum, reward.decimals)} {reward.symbol}
                            </dd>
                            <dt>Approved route</dt>
                            <dd>
                              {reward.hops
                                ? `${reward.hops} hop${reward.hops === 1 ? '' : 's'}`
                                : 'Same asset · no swap'}
                            </dd>
                            {reward.legs?.map((leg) => (
                              <dd key={leg.adapter + leg.input}>
                                <code>
                                  {leg.input.slice(0, 8)} → {leg.output.slice(0, 8)}
                                </code>{' '}
                                via <code>{leg.adapter.slice(0, 8)}…</code>
                              </dd>
                            ))}
                            {preview.gasPrice !== undefined && (
                              <>
                                <dt>Indicative purchase fee</dt>
                                <dd>
                                  {shortAmount(
                                    BigInt(reward.hops === 2 ? 850_000 : reward.hops === 1 ? 550_000 : 180_000) *
                                      preview.gasPrice,
                                    18,
                                  )}{' '}
                                  POL
                                </dd>
                              </>
                            )}
                          </div>
                        ))}
                      </V3Metrics>
                      <V3Muted>
                        Spending is bounded by the funded balance, each allocation and each replenishment window.
                      </V3Muted>
                      {preview.strategyNote && <V3Muted>Adaptive purchases selected · {preview.strategyNote}</V3Muted>}
                      <V3Button type="button" disabled={locked || !writeAllowed} onClick={() => void create()}>
                        {preview.treasuryFunded ? 'Create pool and reserve treasury budget' : 'Create V3 pool'}
                      </V3Button>
                    </div>
                  </V3Card>
                )}
              </>
            )}
            {mode !== 'dashboard' && (
              <TransactionFeedback transaction={transaction} onReceipt={confirmCreated} deployment={deployment} />
            )}
            {typeof mode === 'bigint' && account && (
              <>
                <WorkspaceHeading ref={workspace} tabIndex={-1}>
                  Manage pool #{mode.toString()}
                </WorkspaceHeading>
                <V3StudioPool
                  key={mode.toString()}
                  client={client}
                  deployment={deployment}
                  poolId={mode}
                  account={account}
                  writeAllowed={writeAllowed}
                  document={activePresentation}
                  setDocument={setPresentation}
                  refreshPresentation={refreshPresentation}
                  Preview={Preview}
                  renderFunding={(pool) =>
                    pool.funding.asset === zeroAddress ? (
                      <V3Muted>This pool uses direct reward deposits.</V3Muted>
                    ) : (
                      <FundingPanel
                        client={client}
                        deployment={deployment}
                        account={account}
                        poolId={mode}
                        writeAllowed={writeAllowed}
                        setPending={setFundingPending}
                      />
                    )
                  }
                />
              </>
            )}
          </>
        )}
      </V3Section>
    </V3Page>
  )
}
