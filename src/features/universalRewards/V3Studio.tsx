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
import Link from 'next/link'
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi'
import { encodeFunctionData, isAddressEqual, zeroAddress, type Address } from 'viem'
import { universalRewardsAbi } from './abi'
import { useV3Action, useV3Query, useV3Wallet } from './hooks'
import { shortAmount } from './presentation'
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
import { StudioBar, WorkspaceBack, WorkspaceHeading } from './studioDashboardStyles'
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
}: {
  transaction: ReturnType<typeof useV3Action>
  deployment?: V3Deployment
  onReceipt: (receipt: NonNullable<Awaited<ReturnType<typeof transaction.recheck>>>) => void
}) {
  return (
    <V3Actions>
      <V3Muted role="status">{transaction.message}</V3Muted>
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
  const [deposit, setDeposit] = useState('')
  const [native, setNative] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(
    () => readV3Funding(client, deployment, poolId, account),
    [client, deployment, poolId, account],
  )
  const result = useV3Query(`${deployment.address}:${poolId}:${account ?? ''}`, load, 20_000)
  const view = result.data
  const transaction = useV3Action(client, deployment, getWallet, account)
  const pending = transaction.busy || transaction.unconfirmed
  useEffect(() => {
    setPending(pending)
    return () => setPending(false)
  }, [pending, setPending])
  const locked = !writeAllowed || !getWallet || pending
  const remaining = view ? view.pool.funding.budget - view.pool.funding.deposited : ZERO
  const ended = view ? view.pool.timestamp >= view.pool.config.end : false
  const value = () => {
    if (!view || view.token.decimals === null) throw new Error('The funding asset decimals could not be verified.')
    const amount = parseV3Amount(deposit, view.token.decimals, 'deposit amount')
    if (amount > remaining) throw new Error('The deposit exceeds the remaining funding budget.')
    return amount
  }
  const depositOrApprove = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!view || locked || ended) return
    try {
      setError('')
      const amount = value()
      const payNative = native && isAddressEqual(view.token.address, view.wrappedNative)
      const approval = !payNative && view.allowance < amount
      const request = approval
        ? approveV3Funding(deployment, view.token.address, amount)
        : fundV3Budget(deployment, poolId, amount, payNative)
      if (await transaction.run(request)) {
        if (!approval) setDeposit('')
        result.refresh()
      }
    } catch (failure) {
      setError(describeV3Error(failure))
      event.currentTarget?.querySelector('input')?.focus()
    }
  }
  let needsApproval = false
  if (view && !native && deposit) {
    try {
      needsApproval = view.allowance < value()
    } catch {
      // The form reports invalid amounts when submitted.
    }
  }

  return (
    <V3Section aria-label="Funding and treasury">
      <header>
        <h2>Fund and manage pool #{poolId.toString()}</h2>
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
                {ended ? 'Finished' : view.pool.funding.paused ? 'Replenishment paused' : 'Funding plan ready'}
              </V3Badge>
              <V3Metrics>
                <div>
                  <dt>Funding budget</dt>
                  <dd>
                    {shortAmount(view.pool.funding.budget, view.token.decimals)} {view.token.symbol}
                  </dd>
                </div>
                <div>
                  <dt>Deposited</dt>
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
                  <dt>Returned to treasury</dt>
                  <dd>
                    {shortAmount(view.pool.funding.recovered, view.token.decimals)} {view.token.symbol}
                  </dd>
                </div>
              </V3Metrics>
              {!ended && remaining > ZERO && (
                <form method="post" aria-label="Deposit pool funding" onSubmit={depositOrApprove}>
                  <V3Actions>
                    <V3Field>
                      Amount to deposit · {view.token.symbol}
                      <input
                        name="deposit-amount"
                        required
                        inputMode="decimal"
                        value={deposit}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? 'v3-deposit-error' : undefined}
                        onChange={(event) => {
                          setDeposit(event.target.value)
                          setError('')
                        }}
                      />
                    </V3Field>
                    {isAddressEqual(view.token.address, view.wrappedNative) && (
                      <V3Field>
                        <V3Actions>
                          <input
                            type="checkbox"
                            name="native-pol"
                            checked={native}
                            onChange={(event) => setNative(event.target.checked)}
                          />
                          Deposit native POL
                        </V3Actions>
                      </V3Field>
                    )}
                    <V3Button type="submit" disabled={locked}>
                      {needsApproval ? 'Approve exact amount' : 'Deposit budget'}
                    </V3Button>
                  </V3Actions>
                  {error && (
                    <V3Error role="status" id="v3-deposit-error">
                      {error}
                    </V3Error>
                  )}
                </form>
              )}
              {ended ? (
                <V3Button
                  type="button"
                  $secondary
                  disabled={
                    locked || view.pool.funding.deposited === view.pool.funding.spent + view.pool.funding.recovered
                  }
                  onClick={async () => {
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
              <Link href={`/nftpools/v3/${poolId}`} passHref legacyBehavior>
                <V3Link>View public pool</V3Link>
              </Link>
            </div>
          </V3Card>
          <V3Grid>
            {view.lanes.map((lane) => (
              <V3Card key={lane.reward.token}>
                <div>
                  <h3>
                    {lane.reward.symbol} rewards · {lane.split.allocationBps / 100}%
                  </h3>
                  <V3Muted>
                    Committed to NFTs · {shortAmount(lane.reward.committed / UNIT, lane.reward.decimals)}{' '}
                    {lane.reward.symbol}
                  </V3Muted>
                  <V3Muted>
                    Purchased reserve · {shortAmount(lane.reward.inventory, lane.reward.decimals)} {lane.reward.symbol}
                  </V3Muted>
                  {lane.blocked && <V3Error role="status">Swap blocked by route safety checks.</V3Error>}
                  {!ended && lane.quote && (
                    <V3Muted>
                      Next tranche · {shortAmount(lane.amount, view.token.decimals)} {view.token.symbol} · minimum{' '}
                      {shortAmount(lane.quote[1], lane.reward.decimals)} {lane.reward.symbol}
                    </V3Muted>
                  )}
                  {ended ? (
                    <V3Button
                      type="button"
                      $secondary
                      disabled={locked}
                      onClick={async () => {
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
                  ) : (
                    <V3Button
                      type="button"
                      $secondary
                      disabled={locked || !lane.quote || view.pool.funding.paused}
                      onClick={async () => {
                        if (!lane.quote) return
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
        </>
      )}
      <TransactionFeedback transaction={transaction} deployment={deployment} onReceipt={result.refresh} />
    </V3Section>
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
  const [mode, setMode] = useState<'dashboard' | 'create' | bigint>('dashboard')
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
  const studio = useV3Query(deployment?.address ?? '', loadStudio)
  const allowed = Boolean(account && studio.data && isAddressEqual(account, studio.data.admin))
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
          {allowed && mode === 'dashboard' && (
            <V3Button type="button" disabled={locked} onClick={() => navigate('create')}>
              New pool
            </V3Button>
          )}
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
        {account && studio.data && !allowed && (
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
        {allowed && deployment && studio.data && (
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
                            <dt>Next tranche minimum</dt>
                            <dd>
                              {shortAmount(reward.minimum, reward.decimals)} {reward.symbol}
                            </dd>
                          </div>
                        ))}
                      </V3Metrics>
                      <V3Muted>
                        Spending is bounded by the funded balance, each allocation and each replenishment window.
                      </V3Muted>
                      <V3Button type="button" disabled={locked || !writeAllowed} onClick={() => void create()}>
                        Create V3 pool
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
