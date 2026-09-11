import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import AdminShell from 'features/poolManager/components/AdminShell'
import {
  ActionButton,
  ButtonRow,
  Field,
  FormGrid,
  Input,
  LinkText,
  Muted,
  Notice,
  Panel,
  PanelTitle,
  StatusPill,
} from 'features/poolManager/components/styles'
import { useNftPoolRegistry } from '../hooks'
import { createEmptyNftPoolDraft, createNftPoolCloneDraft } from '../registry'
import { loadNftPoolDraft, saveNftPoolDraft } from '../storage'
import { NftPoolDraft as NftPoolDraftModel } from '../types'
import { DraftCollectionRow, DraftGrid } from './styles'

export default function NftPoolDraft() {
  const router = useRouter()
  const { data, loading, error } = useNftPoolRegistry()
  const cloneId = typeof router.query.clone === 'string' ? router.query.clone : ''
  const savedDraftId = typeof router.query.draft === 'string' ? router.query.draft : ''
  const [draft, setDraft] = useState<NftPoolDraftModel>(() => createEmptyNftPoolDraft())
  const [message, setMessage] = useState('')

  const sourcePool = useMemo(
    () => data?.pools.find((pool) => pool.id === cloneId || pool.address.toLowerCase() === cloneId.toLowerCase()),
    [cloneId, data?.pools],
  )

  useEffect(() => {
    if (savedDraftId) {
      const saved = loadNftPoolDraft(savedDraftId)
      if (saved) setDraft(saved)
    }
  }, [savedDraftId])

  useEffect(() => {
    if (sourcePool && draft.sourcePoolId !== sourcePool.id) setDraft(createNftPoolCloneDraft(sourcePool))
  }, [draft.sourcePoolId, sourcePool])

  const updateDraft = (patch: Partial<NftPoolDraftModel>) => {
    setDraft((current) => ({ ...current, ...patch, updatedAt: Date.now() }))
    setMessage('')
  }

  const updateConstraint = (key: keyof NftPoolDraftModel['constraints'], value: string) => {
    updateDraft({ constraints: { ...draft.constraints, [key]: value } })
  }

  const save = () => {
    saveNftPoolDraft(draft)
    setMessage('Draft saved locally. No blockchain transaction was sent.')
  }

  return (
    <AdminShell
      title={sourcePool ? 'Clone NFT pool' : 'New NFT pool draft'}
      subtitle="Edit a safe local draft first. Deployment and funding are intentionally unavailable in Phase 1."
      authorityScope="nft"
    >
      {error ? <Notice $error>{error}</Notice> : null}
      {loading ? <Notice>Reading the source registry…</Notice> : null}
      {sourcePool ? (
        <Notice>
          Cloned from <strong>{sourcePool.metadata.name}</strong>. Contract address, schedule, transaction identifiers
          and old owner are not reused for deployment.
        </Notice>
      ) : null}
      {cloneId && !loading && !sourcePool ? (
        <Notice $error>Clone source was not found in the current registry.</Notice>
      ) : null}
      {message ? <Notice>{message}</Notice> : null}

      <DraftGrid>
        <div>
          <Panel>
            <PanelTitle>Basic information</PanelTitle>
            <FormGrid>
              <Field>
                Pool name
                <Input
                  value={draft.name}
                  onChange={(event) => updateDraft({ name: event.target.value })}
                  placeholder="e.g. CoinCollect Gold Rewards"
                />
              </Field>
              <Field>
                Project URL
                <Input
                  value={draft.projectUrl || ''}
                  onChange={(event) => updateDraft({ projectUrl: event.target.value })}
                  placeholder="https://…"
                />
              </Field>
              <Field>
                Banner URL
                <Input
                  value={draft.banner || ''}
                  onChange={(event) => updateDraft({ banner: event.target.value })}
                  placeholder="https://…"
                />
              </Field>
              <Field>
                Avatar URL
                <Input
                  value={draft.avatar || ''}
                  onChange={(event) => updateDraft({ avatar: event.target.value })}
                  placeholder="https://…"
                />
              </Field>
            </FormGrid>
          </Panel>

          <Panel style={{ marginTop: 16 }}>
            <PanelTitle>Staking NFTs</PanelTitle>
            <Muted>
              Weights are editable in the local draft only. No setCollectionWeights transaction is available.
            </Muted>
            {draft.collections.map((collection, index) => (
              <DraftCollectionRow key={`${collection.collectionId}-${index}`}>
                <div>
                  <strong>{collection.name}</strong>
                  <Muted style={{ display: 'block', fontSize: 12 }}>
                    {collection.primary ? 'Primary collection' : 'Community collection'} · {collection.address}
                  </Muted>
                </div>
                <Field>
                  Power
                  <Input
                    type="number"
                    min="0"
                    value={collection.weight}
                    onChange={(event) => {
                      const collections = draft.collections.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, weight: event.target.value } : item,
                      )
                      updateDraft({ collections })
                    }}
                  />
                </Field>
              </DraftCollectionRow>
            ))}
          </Panel>

          <Panel style={{ marginTop: 16 }}>
            <PanelTitle>Rewards</PanelTitle>
            <Muted>Existing reward assets are copied for review. Budget-based planning arrives in Phase 2.</Muted>
            <div style={{ marginTop: 12, lineHeight: 1.8, fontSize: 14 }}>
              <div>
                <strong>Primary:</strong> {draft.rewards.primary.symbol}{' '}
                <Muted>· {draft.rewards.primary.address || 'Address unavailable'}</Muted>
              </div>
              <div>
                <strong>Side rewards:</strong>{' '}
                {draft.rewards.side.map((reward) => reward.symbol).join(' + ') || 'None detected'}
              </div>
            </div>
          </Panel>
        </div>

        <div>
          <Panel>
            <PanelTitle>Future economics</PanelTitle>
            <Muted>
              These fields are placeholders for the budget → duration → allocation builder. They do not price tokens or
              move funds.
            </Muted>
            <FormGrid style={{ marginTop: 16 }}>
              <Field>
                Budget denomination
                <Input
                  value={draft.economics.budgetDenomination || ''}
                  onChange={(event) =>
                    updateDraft({ economics: { ...draft.economics, budgetDenomination: event.target.value } })
                  }
                  placeholder="USDT"
                />
              </Field>
              <Field>
                Total budget
                <Input
                  value={draft.economics.totalBudget || ''}
                  onChange={(event) =>
                    updateDraft({ economics: { ...draft.economics, totalBudget: event.target.value } })
                  }
                  placeholder="10.00"
                />
              </Field>
            </FormGrid>
            <Field style={{ marginTop: 16 }}>
              Duration preset
              <select
                value={draft.economics.durationPreset || 'custom'}
                onChange={(event) =>
                  updateDraft({
                    economics: {
                      ...draft.economics,
                      durationPreset: event.target.value as NftPoolDraftModel['economics']['durationPreset'],
                    },
                  })
                }
              >
                <option value="1 month">1 month</option>
                <option value="3 months">3 months</option>
                <option value="6 months">6 months</option>
                <option value="1 year">1 year</option>
                <option value="custom">Custom</option>
              </select>
            </Field>
          </Panel>

          <Panel style={{ marginTop: 16 }}>
            <PanelTitle>Pool parameters</PanelTitle>
            <FormGrid>
              <Field>
                Participant threshold
                <Input
                  value={draft.constraints.participantThreshold}
                  onChange={(event) => updateConstraint('participantThreshold', event.target.value)}
                />
              </Field>
              <Field>
                Pool capacity
                <Input
                  value={draft.constraints.poolCapacity}
                  onChange={(event) => updateConstraint('poolCapacity', event.target.value)}
                />
              </Field>
              <Field>
                User limit
                <Input
                  value={draft.constraints.poolLimitPerUser}
                  onChange={(event) => updateConstraint('poolLimitPerUser', event.target.value)}
                />
              </Field>
              <Field>
                Limit window (blocks)
                <Input
                  value={draft.constraints.numberBlocksForUserLimit}
                  onChange={(event) => updateConstraint('numberBlocksForUserLimit', event.target.value)}
                />
              </Field>
            </FormGrid>
          </Panel>

          <Panel style={{ marginTop: 16 }}>
            <PanelTitle>Review</PanelTitle>
            <div style={{ lineHeight: 1.8, fontSize: 14 }}>
              <div>
                <Muted>Name:</Muted> {draft.name || 'Untitled draft'}
              </div>
              <div>
                <Muted>NFTs:</Muted>{' '}
                {draft.collections.map((collection) => `${collection.name} · ${collection.weight}x`).join(', ') ||
                  'None selected'}
              </div>
              <div>
                <Muted>Earn:</Muted> {draft.rewards.primary.symbol}
                {draft.rewards.side.length ? ` + ${draft.rewards.side.map((reward) => reward.symbol).join(' + ')}` : ''}
              </div>
              <div>
                <Muted>Source:</Muted> {draft.source === 'cloned' ? draft.sourcePoolId : 'Manual draft'}
              </div>
            </div>
            <ButtonRow>
              <ActionButton onClick={save}>Save local draft</ActionButton>
              <ActionButton disabled>Continue to deploy</ActionButton>
            </ButtonRow>
            <Muted>Deployment is not available in Phase 1. The disabled action cannot open a wallet transaction.</Muted>
            {draft.sourcePoolId ? (
              <Notice style={{ marginTop: 16 }}>
                The source pool is recorded by reference only. Its contract address, schedule and owner are not copied
                into deployment inputs.
              </Notice>
            ) : null}
          </Panel>
        </div>
      </DraftGrid>
      <p style={{ marginTop: 18 }}>
        <Link href="/admin/nft-pools">Back to NFT pools</Link>
        {' · '}
        <LinkText href="/docs/nft-pool-manager">Read the architecture notes</LinkText>
      </p>
    </AdminShell>
  )
}
