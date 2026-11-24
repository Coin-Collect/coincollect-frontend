import { useCallback, useId, useState, type ComponentType, type ReactNode } from 'react'
import { encodeFunctionData, formatUnits, zeroAddress, type Address } from 'viem'
import { poolArtworkRegistry } from 'features/nftPoolManager/studio/artworkRegistry'
import { managedNftCollectionAbi } from './abi'
import { useV3Action, useV3Query, useV3Wallet } from './hooks'
import { safeArtwork, v3PoolTypeLabels, type V3PoolType, type V3Presentation } from './metadata'
import {
  emptyV3PresentationDocument,
  localPresentationMessage,
  presentationRevision,
  validateV3Presentation,
  validateV3PresentationDocument,
  withV3Presentation,
  type V3PresentationDocument,
} from './poolPresentation'
import { claimPeriodMessage, isV3ClaimExpired, poolTiming, shortAmount, sourceName } from './presentation'
import { readV3DirectTreasurySurplus, readV3Pool, simulateV3SurplusReturn, type V3PoolSnapshot } from './reader'
import { validateV3Deployment, type V3Client, type V3Deployment } from './runtime'
import { PresentationFields, PresentationWorkspace, WorkspaceActions } from './studioDashboardStyles'
import { V3Actions, V3Button, V3Card, V3Error, V3Field, V3Metrics, V3Muted } from './styles'
import { describeV3Error, recoverV3Rewards } from './transactions'

const ZERO = BigInt(0)

export interface V3StudioPreviewProps {
  pool: V3PoolSnapshot
  deployment: V3Deployment
  poolTypeEditor?: { action: string; help?: string; save: (type: V3PoolType) => void | Promise<void> }
}

const gallery = [
  { id: 'studio-default', label: 'Collect Hero', src: '/images/collectHeroes/14.jpg' },
  ...poolArtworkRegistry,
]
const customArtwork = '__custom'

export default function V3StudioPool({
  client,
  deployment,
  poolId,
  account,
  writeAllowed,
  document,
  setDocument,
  refreshPresentation,
  Preview,
  renderFunding,
}: {
  client: V3Client
  deployment: V3Deployment
  poolId: bigint
  account: Address
  writeAllowed: boolean
  document?: V3PresentationDocument
  setDocument: (document: V3PresentationDocument) => void
  refreshPresentation: () => void
  Preview: ComponentType<V3StudioPreviewProps>
  renderFunding: (pool: V3PoolSnapshot) => ReactNode
}) {
  const load = useCallback(async () => {
    const block = await client.getBlock()
    await validateV3Deployment(client, deployment, block.number)
    const pool = await readV3Pool(client, deployment, poolId, block, { includeSettlement: true })
    return { pool, surplus: await readV3DirectTreasurySurplus(client, deployment, pool, account) }
  }, [account, client, deployment, poolId])
  const result = useV3Query(`${deployment.address}:manage:${poolId}:${account}`, load, 30_000)
  const [previewOpen, setPreviewOpen] = useState(true)
  const [draft, setDraft] = useState<V3Presentation>()
  const [version, setVersion] = useState('initial')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [useCustomArtwork, setUseCustomArtwork] = useState(false)
  const previewId = useId()
  const getWallet = useV3Wallet(deployment.chainId)
  const settlementAction = useV3Action(client, deployment, getWallet, account)
  const local = deployment.chainId === 31337
  const pool = result.data ? withV3Presentation(result.data.pool, document) : undefined
  const directSurplus = result.data?.surplus

  const edit = () => {
    if (!pool) return
    const current = pool.presentation
    setDraft(current)
    setUseCustomArtwork(Boolean(current.artwork && !gallery.some(({ src }) => src === current.artwork)))
    setVersion(presentationRevision(document?.pools.find((row) => row.poolId === poolId.toString())))
    setPreviewOpen(true)
    setMessage('')
    setError('')
  }

  const persistPresentation = async (value: V3Presentation, revision: string) => {
    const presentation = validateV3Presentation(value)
    const record = { poolId: poolId.toString(), ...presentation }
    if (!local) {
      const exportDocument = { ...emptyV3PresentationDocument(deployment), pools: [record] }
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(exportDocument, null, 2)], { type: 'application/json' }),
      )
      const link = window.document.createElement('a')
      link.href = url
      link.download = `v3-pool-${poolId}-presentation.json`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage('Downloaded. Merge this pool’s entry into v3-pools.json to publish it.')
      return
    }
    if (!getWallet || !writeAllowed) throw new Error('Connect the V3 operator wallet to the settlement network.')
    const issuedAt = Date.now()
    const wallet = await getWallet()
    const signature = await wallet.signMessage({
      account,
      message: localPresentationMessage(deployment, record, revision, issuedAt),
    })
    const response = await fetch('/api/v3/presentation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...record, revision, issuedAt, signature, presentation }),
    })
    const body = await response.json()
    if (!response.ok) {
      if (response.status === 409) refreshPresentation()
      throw new Error(body.error || 'Presentation could not be saved.')
    }
    setDocument(validateV3PresentationDocument(body, deployment))
  }

  const save = async () => {
    if (!draft || busy || (local && (!getWallet || !writeAllowed))) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await persistPresentation(draft, version)
      if (local) {
        setDraft(undefined)
        setMessage('Presentation saved. The local catalogue uses the updated FarmCard.')
      }
    } catch (failure) {
      setError(describeV3Error(failure))
    } finally {
      setBusy(false)
    }
  }

  if (!pool) {
    return result.error ? (
      <WorkspaceActions>
        <V3Error role="alert">{result.error}</V3Error>
        <V3Button type="button" $secondary onClick={result.refresh}>
          Retry
        </V3Button>
      </WorkspaceActions>
    ) : (
      <V3Muted role="status">Reading pool #{poolId.toString()}…</V3Muted>
    )
  }
  const expired = isV3ClaimExpired(pool)
  const claimMessage = claimPeriodMessage(pool)
  const recoveryLocked = !writeAllowed || Boolean(result.error) || settlementAction.busy || settlementAction.unconfirmed
  const returnSurplus = async (token: Address, symbol: string) => {
    await settlementAction.runMany(async () => {
      const block = await client.getBlock()
      if (block.number === null) throw new Error('Could not verify the current settlement block.')
      if (
        isV3ClaimExpired(pool, block.timestamp) ||
        (await simulateV3SurplusReturn(client, deployment, poolId, token, account, block.number)) === ZERO
      ) {
        result.refresh()
        return []
      }
      return [
        {
          ...recoverV3Rewards(deployment, poolId, token, 'surplus'),
          confirmationLabel: `Return unallocated ${symbol} to Treasury`,
          onConfirmed: result.refresh,
        },
      ]
    })
  }
  const savePoolType = async (poolType: V3PoolType) => {
    if (draft) {
      setDraft({ ...draft, poolType })
      return
    }
    setMessage('')
    const revision = presentationRevision(document?.pools.find((row) => row.poolId === poolId.toString()))
    await persistPresentation({ ...pool.presentation, poolType }, revision)
    if (local) setMessage(`Pool type updated to ${v3PoolTypeLabels[poolType]}.`)
  }

  return (
    <>
      <V3Muted>
        {pool.presentation.name} · {poolTiming(pool)} ·{' '}
        {pool.collections
          .map(({ sourceChainId }) => sourceName(sourceChainId))
          .filter((chain, index, chains) => chains.indexOf(chain) === index)
          .join(', ')}
      </V3Muted>
      <WorkspaceActions>
        {pool.funding.asset !== zeroAddress && (
          <V3Button as="a" $secondary href="#v3-reward-budget">
            Reward budget
          </V3Button>
        )}
        <V3Button
          type="button"
          $secondary
          aria-expanded={previewOpen}
          aria-controls={previewId}
          onClick={() => setPreviewOpen((open) => !open)}
        >
          {previewOpen ? 'Hide preview' : 'Preview FarmCard'}
        </V3Button>
        {!draft && (
          <V3Button type="button" $secondary onClick={edit}>
            Edit presentation
          </V3Button>
        )}
        <V3Button as="a" $secondary href={`/nftpools/v3/${poolId}`}>
          View public pool
        </V3Button>
      </WorkspaceActions>
      {message && <V3Muted role="status">{message}</V3Muted>}
      {result.error && <V3Error role="status">Showing the last verified pool read. {result.error}</V3Error>}
      <PresentationWorkspace $editing={Boolean(draft)} $preview={previewOpen}>
        <div id={previewId} hidden={!previewOpen}>
          {previewOpen && (
            <Preview
              deployment={deployment}
              poolTypeEditor={
                !busy && (!local || (getWallet && writeAllowed))
                  ? {
                      action: draft ? 'Apply to draft' : local ? 'Save pool type' : 'Download update',
                      help: draft
                        ? undefined
                        : local
                        ? 'Confirm the change with your operator wallet. The new badge will appear on the public pool.'
                        : 'Publish the downloaded presentation entry to update the public pool badge.',
                      save: savePoolType,
                    }
                  : undefined
              }
              pool={
                draft
                  ? {
                      ...pool,
                      presentation: {
                        ...draft,
                        name: draft.name.trim() || pool.presentation.name,
                        artwork: safeArtwork(draft.artwork),
                      },
                    }
                  : pool
              }
            />
          )}
        </div>
        {draft && (
          <V3Card aria-label="Edit pool presentation">
            <div>
              <h3>Edit presentation</h3>
              <V3Muted>
                {local
                  ? 'A wallet signature saves these changes on the local catalogue.'
                  : 'Export your changes for the public metadata registry.'}{' '}
                The pool’s on-chain schedule, NFT rules and reward plan are set at creation.
              </V3Muted>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  void save()
                }}
              >
                <PresentationFields>
                  <V3Field>
                    Pool name
                    <input
                      autoFocus
                      name="presentation-name"
                      required
                      maxLength={60}
                      value={draft.name}
                      onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    />
                  </V3Field>
                  <V3Field>
                    Artwork
                    <select
                      name="presentation-artwork-choice"
                      value={useCustomArtwork ? customArtwork : draft.artwork ?? ''}
                      onChange={(event) => {
                        const choice = event.target.value
                        setUseCustomArtwork(choice === customArtwork)
                        if (choice !== customArtwork) setDraft({ ...draft, artwork: choice || undefined })
                      }}
                    >
                      <option value="">Default artwork</option>
                      {gallery.map(({ id, label, src }) => (
                        <option key={id} value={src}>
                          {label}
                        </option>
                      ))}
                      <option value={customArtwork}>Custom HTTPS URL</option>
                    </select>
                  </V3Field>
                  {useCustomArtwork && (
                    <V3Field>
                      Image URL
                      <input
                        name="presentation-artwork-url"
                        type="url"
                        placeholder="https://…"
                        maxLength={200}
                        value={draft.artwork?.startsWith('https://') ? draft.artwork : ''}
                        onChange={(event) => setDraft({ ...draft, artwork: event.target.value })}
                      />
                    </V3Field>
                  )}
                  <V3Field>
                    Description
                    <textarea
                      name="presentation-description"
                      rows={3}
                      maxLength={200}
                      value={draft.description}
                      onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                    />
                  </V3Field>
                </PresentationFields>
                <WorkspaceActions>
                  <V3Button type="submit" disabled={busy || (local && (!getWallet || !writeAllowed))}>
                    {busy ? 'Waiting for wallet…' : local ? 'Save presentation' : 'Download presentation'}
                  </V3Button>
                  <V3Button
                    type="button"
                    $secondary
                    disabled={busy}
                    onClick={() => {
                      setDraft(undefined)
                      setError('')
                    }}
                  >
                    Close editor
                  </V3Button>
                </WorkspaceActions>
                {error && <V3Error role="alert">{error}</V3Error>}
              </form>
            </div>
          </V3Card>
        )}
      </PresentationWorkspace>
      {pool.collections.some(({ managed }) => managed?.standard === 1155) && (
        <V3Card>
          <div>
            <h3>ERC-1155 quantity limits</h3>
            {pool.collections.map(
              ({ managed, weight }) =>
                managed?.standard === 1155 && (
                  <form
                    key={managed.adapter}
                    method="post"
                    aria-label={`Quantity limit for ${managed.collection}`}
                    onSubmit={async (event) => {
                      event.preventDefault()
                      const limit = Number(new FormData(event.currentTarget).get('limit'))
                      if (!Number.isSafeInteger(limit) || limit < 1 || limit > managed.maxUnits) return
                      if (
                        await settlementAction.run({
                          to: managed.adapter,
                          data: encodeFunctionData({
                            abi: managedNftCollectionAbi,
                            functionName: 'setUnitLimit',
                            args: [poolId, limit],
                          }),
                        })
                      )
                        result.refresh()
                    }}
                  >
                    <V3Muted>
                      {managed.collection} · {weight} power per unit
                    </V3Muted>
                    <V3Actions>
                      <V3Field>
                        Active units per token ID and wallet
                        <input
                          key={managed.limit}
                          name="limit"
                          type="number"
                          min={1}
                          max={managed.maxUnits}
                          step={1}
                          defaultValue={managed.limit}
                          disabled={
                            !writeAllowed ||
                            settlementAction.busy ||
                            settlementAction.unconfirmed ||
                            pool.timestamp >= pool.config.start
                          }
                          required
                        />
                      </V3Field>
                      <V3Button
                        type="submit"
                        $secondary
                        disabled={
                          !writeAllowed ||
                          settlementAction.busy ||
                          settlementAction.unconfirmed ||
                          pool.timestamp >= pool.config.start
                        }
                      >
                        Save limit
                      </V3Button>
                    </V3Actions>
                  </form>
                ),
            )}
          </div>
        </V3Card>
      )}
      {pool.claimDeadline !== undefined && (
        <V3Card>
          <div>
            <h2>Claims and treasury settlement</h2>
            {claimMessage && <V3Muted>{claimMessage}</V3Muted>}
            {directSurplus && (
              <V3Muted>
                Unallocated rewards can return to Treasury after the pool ends. Earned rewards remain available to claim
                until the deadline.
              </V3Muted>
            )}
            <V3Metrics>
              {pool.rewards.map(({ token, symbol, decimals, inventory, settlement }) => {
                if (!settlement) return null
                const { claimLiability, expiredRecovered } = settlement
                const canRecover = expired && inventory > ZERO
                const surplus = directSurplus?.get(token)
                const returnAmount = surplus === undefined || surplus === ZERO
                  ? undefined
                  : decimals === null ? `${surplus} base units` : `${formatUnits(surplus, decimals)} ${symbol}`
                return (
                  <div key={token}>
                    <dt>{symbol} claim liability</dt>
                    <dd>
                      {shortAmount(claimLiability, (decimals ?? 0) + 18)}
                      {decimals === null ? ' base units' : ` ${symbol}`}
                    </dd>
                    <dt>{symbol} {directSurplus ? 'unallocated rewards' : 'treasury recovery'}</dt>
                    <dd>
                      {directSurplus ? (
                        <>
                          <V3Muted>
                            {returnAmount && `${returnAmount} available to return`}
                            {surplus === ZERO && 'No unallocated rewards to return'}
                            {surplus === undefined && 'Return amount unavailable'}
                          </V3Muted>
                          {returnAmount && (
                            <V3Button
                              type="button"
                              $secondary
                              disabled={recoveryLocked}
                              onClick={() => void returnSurplus(token, symbol)}
                            >
                              Return unallocated {symbol}
                            </V3Button>
                          )}
                        </>
                      ) : canRecover ? (
                        <V3Muted>
                          {shortAmount(inventory, decimals)} {symbol} awaiting treasury recovery
                        </V3Muted>
                      ) : expiredRecovered > ZERO ? (
                        <V3Muted>
                          {shortAmount(expiredRecovered, decimals)} {symbol} recovered to treasury
                        </V3Muted>
                      ) : (
                        <V3Muted>
                          {expired ? 'No balance to recover' : 'Treasury settlement opens at the deadline'}
                        </V3Muted>
                      )}
                      {canRecover && (
                        <V3Button
                          type="button"
                          $secondary
                          disabled={recoveryLocked}
                          onClick={async () => {
                            if (await settlementAction.run(recoverV3Rewards(deployment, poolId, token, 'expired'))) {
                              result.refresh()
                            }
                          }}
                        >
                          Recover {symbol} to treasury
                        </V3Button>
                      )}
                    </dd>
                  </div>
                )
              })}
            </V3Metrics>
            <V3Muted role="status">{settlementAction.message}</V3Muted>
            {settlementAction.error && <V3Error role="alert">{settlementAction.error}</V3Error>}
            {settlementAction.unconfirmed && (
              <V3Actions>
                <V3Button
                  type="button"
                  $secondary
                  disabled={settlementAction.busy}
                  onClick={async () => {
                    if (await settlementAction.recheck()) result.refresh()
                  }}
                >
                  Retry on-chain verification
                </V3Button>
              </V3Actions>
            )}
          </div>
        </V3Card>
      )}
      {renderFunding(pool)}
    </>
  )
}
