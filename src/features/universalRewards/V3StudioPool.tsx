import { useCallback, useId, useState, type ComponentType, type ReactNode } from 'react'
import { type Address } from 'viem'
import { poolArtworkRegistry } from 'features/nftPoolManager/studio/artworkRegistry'
import { useV3Query, useV3Wallet } from './hooks'
import { safeArtwork, type V3Presentation } from './metadata'
import {
  emptyV3PresentationDocument,
  localPresentationMessage,
  presentationRevision,
  validateV3Presentation,
  validateV3PresentationDocument,
  withV3Presentation,
  type V3PresentationDocument,
} from './poolPresentation'
import { poolTiming, sourceName } from './presentation'
import { readV3Pool, type V3PoolSnapshot } from './reader'
import { validateV3Deployment, type V3Client, type V3Deployment } from './runtime'
import { PresentationFields, PresentationWorkspace, WorkspaceActions } from './studioDashboardStyles'
import { V3Button, V3Card, V3Error, V3Field, V3Muted } from './styles'
import { describeV3Error } from './transactions'

export interface V3StudioPreviewProps {
  pool: V3PoolSnapshot
  deployment: V3Deployment
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
    return readV3Pool(client, deployment, poolId, block)
  }, [client, deployment, poolId])
  const result = useV3Query(`${deployment.address}:manage:${poolId}`, load, 30_000)
  const [previewOpen, setPreviewOpen] = useState(true)
  const [draft, setDraft] = useState<V3Presentation>()
  const [version, setVersion] = useState('initial')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [useCustomArtwork, setUseCustomArtwork] = useState(false)
  const previewId = useId()
  const getWallet = useV3Wallet(deployment.chainId)
  const local = deployment.chainId === 31337
  const pool = result.data ? withV3Presentation(result.data, document) : undefined

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

  const save = async () => {
    if (!draft || busy || (local && (!getWallet || !writeAllowed))) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const presentation = validateV3Presentation(draft)
      const record = { poolId: poolId.toString(), ...presentation }
      if (local) {
        if (!getWallet) throw new Error('Connect the V3 operator wallet.')
        const issuedAt = Date.now()
        const wallet = await getWallet()
        const signature = await wallet.signMessage({
          account,
          message: localPresentationMessage(deployment, record, version, issuedAt),
        })
        const response = await fetch('/api/v3/presentation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...record, revision: version, issuedAt, signature, presentation }),
        })
        const body = await response.json()
        if (!response.ok) {
          if (response.status === 409) refreshPresentation()
          throw new Error(body.error || 'Presentation could not be saved.')
        }
        setDocument(validateV3PresentationDocument(body, deployment))
        setDraft(undefined)
        setMessage('Presentation saved. The local catalogue uses the updated FarmCard.')
      } else {
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
      {renderFunding(pool)}
    </>
  )
}
