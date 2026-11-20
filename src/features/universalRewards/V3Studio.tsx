import { useCallback, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useAccount, useSwitchChain } from 'wagmi'
import { encodeFunctionData, isAddressEqual, type Address } from 'viem'
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
} from './studio'
import { approveV3Funding, createdV3PoolId, describeV3Error } from './transactions'
import { UINT256_MAX, UNIT } from './units'
import {
  V3Actions,
  V3Badge,
  V3Button,
  V3Card,
  V3Error,
  V3Field,
  V3Fields,
  V3Grid,
  V3Link,
  V3Metrics,
  V3Muted,
  V3Page,
  V3Section,
} from './styles'

const ZERO = BigInt(0)
const defaultCollection = { sourceChain: '137', address: '', power: '1' }
const defaultDraft: V3StudioDraft = {
  name: '',
  description: '',
  artwork: '',
  startLocal: '',
  durationDays: '30',
  threshold: '1',
  maxWallets: '20',
  maxNfts: '3',
  fundAsset: '',
  budget: '',
  intervalHours: '24',
  usdPerFundingUnit: '',
  collections: [defaultCollection],
  rewards: [{ address: '', sharePercent: '100' }],
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
}: {
  client: V3Client
  deployment: V3Deployment
  account?: Address
  poolId: bigint
  writeAllowed: boolean
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
  const locked = !writeAllowed || !getWallet || transaction.busy || transaction.unconfirmed
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

export default function V3Studio({ connect }: { connect: ReactNode }) {
  const deployment = useMemo(getV3Deployment, [])
  const client = useMemo(createV3Client, [])
  const { address: account, chainId } = useAccount()
  const getWallet = useV3Wallet(deployment?.chainId)
  const { switchChain } = useSwitchChain()
  const [draft, setDraft] = useState<V3StudioDraft>(defaultDraft)
  const [preview, setPreview] = useState<V3Preview>()
  const [poolId, setPoolId] = useState<bigint>()
  const [existingId, setExistingId] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewing, setReviewing] = useState(false)
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

  const update = <K extends keyof V3StudioDraft>(field: K, value: V3StudioDraft[K]) => {
    setDraft((previous) => ({ ...previous, [field]: value }))
    if (preview) setPreview(undefined)
    if (reviewError) setReviewError('')
  }

  const review = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!deployment || locked) return
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
      setPoolId(createdV3PoolId(receipt, deployment.address))
      setPreview(undefined)
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

  const openExisting = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!/^[1-9]\d{0,77}$/.test(existingId) || BigInt(existingId) > UINT256_MAX) return
    setPoolId(BigInt(existingId))
  }

  const tokens = studio.data?.supported ?? []
  return (
    <V3Page>
      <V3Section aria-label="Pool Studio V3">
        <header>
          <Link href="/admin/nft-pools" passHref legacyBehavior>
            <V3Link>NFT pool administration</V3Link>
          </Link>
          <h1>Pool Studio V3</h1>
          <V3Muted>Choose eligible NFTs, a budget and reward assets. Review the plan before signing.</V3Muted>
        </header>
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
          <V3Error role="status">Connect the V3 operator wallet to manage pools.</V3Error>
        )}
        {allowed && deployment && !writeAllowed && (
          <V3Actions>
            <V3Muted role="status">Switch your wallet to the V3 settlement network.</V3Muted>
            <V3Button type="button" $secondary onClick={() => switchChain({ chainId: deployment.chainId })}>
              Switch network
            </V3Button>
          </V3Actions>
        )}
        {allowed && deployment && (
          <>
            <V3Card>
              <div>
                <form method="post" onSubmit={review} aria-label="V3 pool configuration">
                  <V3Grid>
                    <V3Fields disabled={locked}>
                      <legend>Pool details</legend>
                      <V3Field>
                        Pool name
                        <input
                          name="pool-name"
                          required
                          maxLength={60}
                          value={draft.name}
                          onChange={(event) => update('name', event.target.value)}
                        />
                      </V3Field>
                      <V3Field>
                        Description
                        <textarea
                          name="description"
                          maxLength={200}
                          rows={3}
                          value={draft.description}
                          onChange={(event) => update('description', event.target.value)}
                        />
                      </V3Field>
                      <V3Field>
                        Artwork URL{' '}
                        <input
                          name="artwork"
                          inputMode="url"
                          maxLength={200}
                          value={draft.artwork}
                          onChange={(event) => update('artwork', event.target.value)}
                        />
                      </V3Field>
                      <V3Field>
                        Start date and time
                        <input
                          name="start-date"
                          type="datetime-local"
                          required
                          value={draft.startLocal}
                          onChange={(event) => update('startLocal', event.target.value)}
                        />
                      </V3Field>
                      <V3Field>
                        Duration in days
                        <input
                          name="duration"
                          required
                          inputMode="numeric"
                          pattern="[0-9]+"
                          value={draft.durationDays}
                          onChange={(event) => update('durationDays', event.target.value)}
                        />
                      </V3Field>
                    </V3Fields>
                    <V3Fields disabled={locked}>
                      <legend>NFT eligibility</legend>
                      {draft.collections.map((collection, index) => (
                        <V3Fields key={index}>
                          <legend>Collection {index + 1}</legend>
                          <V3Field>
                            Source chain
                            <select
                              name={`source-${index}`}
                              value={collection.sourceChain}
                              onChange={(event) =>
                                update(
                                  'collections',
                                  draft.collections.map((row, i) =>
                                    i === index ? { ...row, sourceChain: event.target.value } : row,
                                  ),
                                )
                              }
                            >
                              <option value="137">Polygon</option>
                              <option value="8453">Base</option>
                              <option value="42161">Arbitrum One</option>
                            </select>
                          </V3Field>
                          <V3Field>
                            Collection address
                            <input
                              name={`collection-${index}`}
                              required
                              spellCheck={false}
                              autoCapitalize="none"
                              maxLength={42}
                              value={collection.address}
                              onChange={(event) =>
                                update(
                                  'collections',
                                  draft.collections.map((row, i) =>
                                    i === index ? { ...row, address: event.target.value } : row,
                                  ),
                                )
                              }
                            />
                          </V3Field>
                          <V3Field>
                            Relative power
                            <input
                              name={`power-${index}`}
                              required
                              inputMode="numeric"
                              pattern="[0-9]+"
                              value={collection.power}
                              onChange={(event) =>
                                update(
                                  'collections',
                                  draft.collections.map((row, i) =>
                                    i === index ? { ...row, power: event.target.value } : row,
                                  ),
                                )
                              }
                            />
                          </V3Field>
                          {draft.collections.length > 1 && (
                            <V3Button
                              type="button"
                              $secondary
                              onClick={() =>
                                update(
                                  'collections',
                                  draft.collections.filter((_, i) => i !== index),
                                )
                              }
                            >
                              Remove collection {index + 1}
                            </V3Button>
                          )}
                        </V3Fields>
                      ))}
                      {draft.collections.length < 16 && (
                        <V3Button
                          type="button"
                          $secondary
                          onClick={() => update('collections', [...draft.collections, defaultCollection])}
                        >
                          Add collection
                        </V3Button>
                      )}
                      <V3Field>
                        Wallets needed for full rate
                        <input
                          name="wallet-threshold"
                          required
                          inputMode="numeric"
                          pattern="[0-9]+"
                          value={draft.threshold}
                          onChange={(event) => update('threshold', event.target.value)}
                        />
                      </V3Field>
                      <V3Field>
                        Maximum participant wallets
                        <input
                          name="max-participant-wallets"
                          required
                          inputMode="numeric"
                          pattern="[0-9]+"
                          value={draft.maxWallets}
                          onChange={(event) => update('maxWallets', event.target.value)}
                        />
                      </V3Field>
                      <V3Field>
                        Maximum NFTs per wallet
                        <input
                          name="max-wallet-nfts"
                          required
                          inputMode="numeric"
                          pattern="[0-9]+"
                          value={draft.maxNfts}
                          onChange={(event) => update('maxNfts', event.target.value)}
                        />
                      </V3Field>
                    </V3Fields>
                    <V3Fields disabled={locked}>
                      <legend>Funding and rewards</legend>
                      <V3Field>
                        Funding asset
                        <select
                          name="funding-asset"
                          required
                          value={draft.fundAsset}
                          onChange={(event) => update('fundAsset', event.target.value)}
                        >
                          <option value="">Choose an asset</option>
                          {tokens.map(({ address, symbol }) => (
                            <option key={address} value={address}>
                              {symbol}
                            </option>
                          ))}
                        </select>
                      </V3Field>
                      <V3Field>
                        Total budget
                        <input
                          name="funding-budget"
                          required
                          inputMode="decimal"
                          value={draft.budget}
                          onChange={(event) => update('budget', event.target.value)}
                        />
                      </V3Field>
                      <V3Field>
                        Replenish every (hours)
                        <input
                          name="replenishment-hours"
                          required
                          inputMode="numeric"
                          pattern="[0-9]+"
                          value={draft.intervalHours}
                          onChange={(event) => update('intervalHours', event.target.value)}
                        />
                      </V3Field>
                      <V3Field>
                        Reference USD per funding token{' '}
                        <input
                          name="usd-per-token"
                          inputMode="decimal"
                          value={draft.usdPerFundingUnit}
                          onChange={(event) => update('usdPerFundingUnit', event.target.value)}
                        />
                      </V3Field>
                      <V3Muted>
                        Optional. USD estimates use this reference price. Rewards accrue in the selected tokens.
                      </V3Muted>
                      {draft.rewards.map((reward, index) => (
                        <V3Fields key={index}>
                          <legend>Reward {index + 1}</legend>
                          <V3Field>
                            Reward asset
                            <select
                              name={`reward-${index}`}
                              required
                              value={reward.address}
                              onChange={(event) =>
                                update(
                                  'rewards',
                                  draft.rewards.map((row, i) =>
                                    i === index ? { ...row, address: event.target.value } : row,
                                  ),
                                )
                              }
                            >
                              <option value="">Choose an asset</option>
                              {tokens.map(({ address, symbol }) => (
                                <option key={address} value={address}>
                                  {symbol}
                                </option>
                              ))}
                            </select>
                          </V3Field>
                          <V3Field>
                            Budget share (%)
                            <input
                              name={`share-${index}`}
                              required
                              inputMode="decimal"
                              value={reward.sharePercent}
                              onChange={(event) =>
                                update(
                                  'rewards',
                                  draft.rewards.map((row, i) =>
                                    i === index ? { ...row, sharePercent: event.target.value } : row,
                                  ),
                                )
                              }
                            />
                          </V3Field>
                          {draft.rewards.length > 1 && (
                            <V3Button
                              type="button"
                              $secondary
                              onClick={() =>
                                update(
                                  'rewards',
                                  draft.rewards.filter((_, i) => i !== index),
                                )
                              }
                            >
                              Remove reward {index + 1}
                            </V3Button>
                          )}
                        </V3Fields>
                      ))}
                      {draft.rewards.length < 4 && (
                        <V3Button
                          type="button"
                          $secondary
                          onClick={() => update('rewards', [...draft.rewards, { address: '', sharePercent: '' }])}
                        >
                          Add reward asset
                        </V3Button>
                      )}
                    </V3Fields>
                  </V3Grid>
                  <V3Actions>
                    <V3Button type="submit" disabled={locked}>
                      {reviewing ? 'Checking on-chain routes…' : 'Review pool plan'}
                    </V3Button>
                    <V3Error tabIndex={-1} ref={summary} role="status">
                      {reviewError}
                    </V3Error>
                  </V3Actions>
                </form>
              </div>
            </V3Card>
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
                          {shortAmount(reward.allocation, preview.fundingAsset.decimals)} {preview.fundingAsset.symbol}
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
            <TransactionFeedback transaction={transaction} onReceipt={confirmCreated} deployment={deployment} />
            <form method="get" onSubmit={openExisting} aria-label="Open an existing funding plan">
              <V3Actions>
                <V3Field>
                  Existing V3 pool number
                  <input
                    name="pool-number"
                    required
                    inputMode="numeric"
                    pattern="[0-9]+"
                    value={existingId}
                    maxLength={78}
                    onChange={(event) => setExistingId(event.target.value)}
                  />
                </V3Field>
                <V3Button type="submit" $secondary>
                  Open pool funding
                </V3Button>
              </V3Actions>
            </form>
            {poolId !== undefined && (
              <FundingPanel
                key={poolId.toString()}
                client={client}
                deployment={deployment}
                account={account}
                poolId={poolId}
                writeAllowed={writeAllowed}
              />
            )}
          </>
        )}
      </V3Section>
    </V3Page>
  )
}
