import { useMemo, useState } from 'react'
import { BigNumber } from '@ethersproject/bignumber'
import type { NftCollection, NftPool, NftPoolDraft, NftPoolDraftReward } from '../../types'
import type { PoolEconomicsCalculation } from '../../economics'
import { formatBaseUnits } from '../../economics'
import type { NftDraftValidationResult } from '../../validation'
import type { NftPreflightResult } from '../../launch/types'
import { findNftCollection } from '../../registry'
import { calculateRewardSharePreview, formatAllocationPercent, percentToBps } from '../../studio/economicsPreview'
import { poolArtworkRegistry } from '../../studio/artworkRegistry'
import {
  AddCollectionCircle,
  ArtworkButton,
  ArtworkEditHint,
  ArtworkEmpty,
  ArtworkOption,
  ButtonCluster,
  CardArtworkTitle,
  CardMeta,
  CardMetricButton,
  CardMetricGrid,
  CardSection,
  CardSectionHeading,
  CardStatus,
  CardToolbar,
  CardNameButton,
  CloseButton,
  CollectionStack,
  CollectionStackButton,
  CollectionStackImage,
  EditIcon,
  Hint,
  MetricHint,
  MetricLabel,
  MetricValue,
  ModalBackdrop,
  ModalDivider,
  ModalField,
  ModalGrid,
  ModalHeader,
  ModalInput,
  ModalSelect,
  ModalTitle,
  PickerAction,
  PickerIcon,
  PickerRow,
  PoolCardBody,
  RewardAreaButton,
  RewardChip,
  ReviewCheck,
  ReviewChecks,
  SidePanel,
  SidePanelTitle,
  SharingCallout,
  StackLabel,
  StudioButton,
  StudioEyebrow,
  StudioLayout,
  StudioModal,
  StudioPreviewColumn,
  StudioSidePanel,
  EditablePoolCard,
  TokenFallback,
  TokenIcon,
} from './styles'

type StudioModalName = 'artwork' | 'collections' | 'rewards' | 'economics' | 'details' | 'review' | 'name' | null

export interface NftPoolCardStudioProps {
  draft: NftPoolDraft
  knownCollections: NftCollection[]
  knownRewards: NftPoolDraftReward[]
  economics?: PoolEconomicsCalculation
  validation: NftDraftValidationResult
  secondsPerBlock: number
  sourcePool?: NftPool
  quoteBusy: boolean
  walletBalanceBusy: boolean
  walletBalances: Record<string, string>
  account?: string
  reviewBusy: boolean
  reviewResult?: NftPreflightResult | null
  message?: string
  onUpdateDraft: (patch: Partial<NftPoolDraft>) => void
  onUpdateEconomics: (patch: Partial<NftPoolDraft['economics']>) => void
  onAddCollection: (collection: NftCollection) => void
  onRemoveCollection: (address: string) => void
  onUpdateCollectionWeight: (address: string, weight: string) => void
  onAddCustomCollection: (address: string) => Promise<void>
  onSetPrimaryReward: (reward: NftPoolDraftReward | null) => void
  onAddSideReward: (reward: NftPoolDraftReward) => void
  onRemoveSideReward: (address: string) => void
  onAddCustomReward: (side: boolean, address: string) => Promise<void>
  onUpdateAllocation: (address: string, bps: string) => void
  onRefreshQuotes: () => void
  onReadWalletBalances: () => void
  onSave: () => void
  onReview: () => void
  onCreatePool: () => void
  onOpenAdvanced: () => void
}

function safeBigNumber(value?: string): BigNumber {
  if (!value || !/^\d+$/.test(value)) return BigNumber.from(0)
  try {
    return BigNumber.from(value)
  } catch {
    return BigNumber.from(0)
  }
}

function durationLabel(draft: NftPoolDraft): string {
  return draft.economics.durationPreset === 'custom'
    ? draft.economics.customDurationDays
      ? `${draft.economics.customDurationDays} days`
      : 'Set duration'
    : draft.economics.durationPreset
}

function tokenIconCandidates(reward: NftPoolDraftReward): string[] {
  const symbolPaths: Record<string, string> = {
    COLLECT: '/images/games/tokens/0x56633733fc8BAf9f730AD2b6b9956Ae22c6d4148.png',
    USDT: '/images/games/tokens/0xc2132D05D31c914a87C6611C10748AEb04B58e8F.png',
    BLITZ: '/images/games/tokens/0x4e6D6d050BEEfd732344398aE20B23c245d6A59F.png',
    SHIB: '/images/games/tokens/shib-min.png',
  }
  return [
    symbolPaths[reward.symbol.toUpperCase()],
    `/images/tokens/${reward.address}.png`,
    `/images/tokens/${reward.address}.svg`,
  ].filter(Boolean) as string[]
}

function RewardTokenIcon({ reward }: { reward: NftPoolDraftReward }) {
  const candidates = tokenIconCandidates(reward)
  const [index, setIndex] = useState(0)
  const src = candidates[index]
  return src ? (
    <TokenIcon src={src} alt="" onError={() => setIndex((current) => current + 1)} />
  ) : (
    <TokenFallback>{reward.symbol.slice(0, 1)}</TokenFallback>
  )
}

function CollectionImage({ collection }: { collection: NftCollection }) {
  return <PickerIcon src={collection.image || '/images/nfts/no-profile-md.png'} alt="" />
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <ModalField>{children}</ModalField>
}

function StudioModalShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string
  description?: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <ModalBackdrop onClick={onClose}>
      <StudioModal role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <ModalHeader>
          <div>
            <ModalTitle>{title}</ModalTitle>
            {description ? <Hint style={{ marginTop: 0 }}>{description}</Hint> : null}
          </div>
          <CloseButton type="button" onClick={onClose} aria-label="Close">
            ×
          </CloseButton>
        </ModalHeader>
        {children}
      </StudioModal>
    </ModalBackdrop>
  )
}

function statusTone(validation: NftDraftValidationResult): 'draft' | 'ready' {
  return validation.blockers.length ? 'draft' : 'ready'
}

function statusText(validation: NftDraftValidationResult): string {
  return validation.blockers.length ? 'DRAFT' : 'READY'
}

function cardCollectionImage(collection: NftCollection): string {
  return collection.image || '/images/nfts/no-profile-md.png'
}

export default function NftPoolCardStudio({
  draft,
  knownCollections,
  knownRewards,
  economics,
  validation,
  secondsPerBlock,
  sourcePool,
  quoteBusy,
  walletBalanceBusy,
  walletBalances,
  account,
  reviewBusy,
  reviewResult,
  onUpdateDraft,
  onUpdateEconomics,
  onAddCollection,
  onRemoveCollection,
  onUpdateCollectionWeight,
  onAddCustomCollection,
  onSetPrimaryReward,
  onAddSideReward,
  onRemoveSideReward,
  onAddCustomReward,
  onUpdateAllocation,
  onRefreshQuotes,
  onReadWalletBalances,
  onSave,
  onReview,
  onCreatePool,
  onOpenAdvanced,
}: NftPoolCardStudioProps) {
  const [modal, setModal] = useState<StudioModalName>(null)
  const [customCollectionAddress, setCustomCollectionAddress] = useState('')
  const [customRewardAddress, setCustomRewardAddress] = useState('')
  const [customRewardIsSide, setCustomRewardIsSide] = useState(true)
  const [nameDraft, setNameDraft] = useState(draft.name)
  const [detailsDraft, setDetailsDraft] = useState({
    name: draft.name,
    projectUrl: draft.projectUrl || '',
    getNftUrl: draft.getNftUrl || '',
  })
  const rewards = [draft.rewards.primary, ...draft.rewards.side].filter(Boolean) as NftPoolDraftReward[]
  const selectedCollections = draft.collections.map(
    (item) =>
      findNftCollection(knownCollections, 137, item.address) || {
        id: item.collectionId,
        chainId: item.chainId,
        address: item.address,
        name: item.name,
        symbol: 'NFT',
        displayName: item.name,
        image: undefined,
        source: 'on-chain' as const,
        verification: 'UNREADABLE' as const,
      },
  )
  const rewardAllocationTotal =
    rewards.reduce((sum, reward) => sum + Number(draft.economics.allocationBps[reward.address.toLowerCase()] || 0), 0) /
    100
  const threshold = safeBigNumber(draft.constraints.participantThreshold)
  const rewardDecimals = draft.rewards.primary?.decimals
  const shareExamples = useMemo(() => {
    const rewardPerBlock = economics?.primary.rewardPerBlock
    if (!rewardPerBlock || rewardPerBlock.isZero() || !draft.rewards.primary || threshold.isZero()) return []
    const examples = [threshold, threshold.mul(2), threshold.mul(5)]
    return examples.map((totalShares) => ({
      totalShares,
      result: calculateRewardSharePreview({
        rewardPerBlock,
        participantWeight: BigNumber.from(1),
        totalShares,
        participantThreshold: threshold,
        secondsPerBlock,
      }),
    }))
  }, [draft.rewards.primary, economics?.primary.rewardPerBlock?.toString(), secondsPerBlock, threshold.toString()])

  const weightedExamples = useMemo(() => {
    const rewardPerBlock = economics?.primary.rewardPerBlock
    if (!rewardPerBlock || rewardPerBlock.isZero() || threshold.isZero()) return []
    return draft.collections.slice(0, 3).flatMap((item) => {
      const participantWeight = safeBigNumber(item.weight)
      if (participantWeight.isZero()) return []
      const collection = findNftCollection(knownCollections, 137, item.address)
      return [
        {
          key: item.address,
          label: collection?.displayName || item.name,
          participantWeight,
          result: calculateRewardSharePreview({
            rewardPerBlock,
            participantWeight,
            totalShares: threshold,
            participantThreshold: threshold,
            secondsPerBlock,
          }),
        },
      ]
    })
  }, [
    draft.collections,
    economics?.primary.rewardPerBlock?.toString(),
    knownCollections,
    secondsPerBlock,
    threshold.toString(),
  ])

  const selectedArtwork = draft.banner || draft.avatar
  const primaryCollection = selectedCollections[0]
  const status = statusText(validation)
  const rewardPerBlock = economics?.primary.rewardPerBlock
  const hasRewardRate = Boolean(rewardPerBlock && !rewardPerBlock.isZero())

  const selectArtwork = (src: string) => {
    onUpdateDraft({ banner: src, avatar: draft.avatar || src })
    setModal(null)
  }

  const saveName = () => {
    onUpdateDraft({ name: nameDraft.trim() })
    setDetailsDraft((current) => ({ ...current, name: nameDraft.trim() }))
    setModal(null)
  }

  const saveDetails = () => {
    onUpdateDraft({
      name: detailsDraft.name.trim(),
      projectUrl: detailsDraft.projectUrl.trim() || undefined,
      getNftUrl: detailsDraft.getNftUrl.trim() || undefined,
    })
    setNameDraft(detailsDraft.name.trim())
    setModal(null)
  }

  const toggleCollection = (collection: NftCollection) => {
    const selected = draft.collections.some((item) => item.address.toLowerCase() === collection.address.toLowerCase())
    if (selected) onRemoveCollection(collection.address)
    else onAddCollection(collection)
  }

  const toggleReward = (reward: NftPoolDraftReward) => {
    const primary = draft.rewards.primary
    const isPrimary = primary?.address.toLowerCase() === reward.address.toLowerCase()
    const isSide = draft.rewards.side.some((item) => item.address.toLowerCase() === reward.address.toLowerCase())
    if (isPrimary) return
    if (isSide) onRemoveSideReward(reward.address)
    else if (!primary) onSetPrimaryReward(reward)
    else onAddSideReward(reward)
  }

  const renderArtworkModal = () => (
    <StudioModalShell
      title="Pool artwork"
      description="Use artwork already shipped by CoinCollect or add a public image URL. Upload storage is not assumed."
      onClose={() => setModal(null)}
    >
      <div>
        <Hint style={{ marginTop: 0 }}>Available artwork</Hint>
        <ModalGrid style={{ marginTop: 10 }}>
          {poolArtworkRegistry.map((artwork) => (
            <ArtworkOption
              key={artwork.id}
              type="button"
              $selected={selectedArtwork === artwork.src}
              onClick={() => selectArtwork(artwork.src)}
            >
              <img src={artwork.src} alt="" />
              <span>{artwork.label}</span>
            </ArtworkOption>
          ))}
        </ModalGrid>
      </div>
      <ModalDivider />
      <FieldLabel>
        Image URL
        <ModalInput
          value={draft.banner || ''}
          onChange={(event) => onUpdateDraft({ banner: event.target.value })}
          placeholder="https://…"
        />
      </FieldLabel>
      <ButtonCluster style={{ marginTop: 14 }}>
        <StudioButton type="button" onClick={() => setModal(null)}>
          Use artwork
        </StudioButton>
        <StudioButton type="button" $secondary onClick={() => onUpdateDraft({ banner: undefined, avatar: undefined })}>
          Use neutral placeholder
        </StudioButton>
      </ButtonCluster>
    </StudioModalShell>
  )

  const renderCollectionsModal = () => (
    <StudioModalShell
      title="NFT collections"
      description="Choose the collections shown on the card and edit their staking power. The first selected collection remains the protocol primary."
      onClose={() => setModal(null)}
    >
      <div>
        {knownCollections.map((collection) => {
          const selected = draft.collections.find(
            (item) => item.address.toLowerCase() === collection.address.toLowerCase(),
          )
          return (
            <PickerRow key={collection.id} $selected={Boolean(selected)}>
              <CollectionImage collection={collection} />
              <div style={{ minWidth: 0 }}>
                <strong>{collection.displayName || collection.name}</strong>
                <Hint style={{ margin: 3 }}>
                  Power {selected?.weight || '—'}x · {collection.symbol}
                </Hint>
              </div>
              {selected ? (
                <ButtonCluster>
                  <ModalInput
                    aria-label={`${collection.displayName} staking power`}
                    type="number"
                    min="1"
                    step="1"
                    value={selected.weight}
                    style={{ width: 72, padding: '8px' }}
                    onChange={(event) => onUpdateCollectionWeight(collection.address, event.target.value)}
                  />
                  <PickerAction type="button" $active onClick={() => onRemoveCollection(collection.address)}>
                    Remove
                  </PickerAction>
                </ButtonCluster>
              ) : (
                <PickerAction type="button" onClick={() => toggleCollection(collection)}>
                  Add
                </PickerAction>
              )}
            </PickerRow>
          )
        })}
        {draft.collections
          .filter(
            (item) =>
              !knownCollections.some((collection) => collection.address.toLowerCase() === item.address.toLowerCase()),
          )
          .map((item) => (
            <PickerRow key={item.collectionId} $selected>
              <CollectionImage
                collection={{
                  id: item.collectionId,
                  chainId: item.chainId,
                  address: item.address,
                  name: item.name,
                  symbol: 'NFT',
                  displayName: item.name,
                  source: 'on-chain',
                  verification: 'UNREADABLE',
                }}
              />
              <div>
                <strong>{item.name}</strong>
                <Hint style={{ margin: 3 }}>Power {item.weight}x · custom for this pool</Hint>
              </div>
              <PickerAction type="button" $active onClick={() => onRemoveCollection(item.address)}>
                Remove
              </PickerAction>
            </PickerRow>
          ))}
      </div>
      <ModalDivider />
      <FieldLabel>
        Add NFT contract for this pool
        <ModalInput
          value={customCollectionAddress}
          onChange={(event) => setCustomCollectionAddress(event.target.value)}
          placeholder="0x…"
        />
      </FieldLabel>
      <Hint>This validates the contract and adds it to this draft only; it does not change the global registry.</Hint>
      <ButtonCluster style={{ marginTop: 12 }}>
        <StudioButton
          type="button"
          onClick={() => void onAddCustomCollection(customCollectionAddress).then(() => setCustomCollectionAddress(''))}
          disabled={!customCollectionAddress}
        >
          Validate and add
        </StudioButton>
        <StudioButton type="button" $secondary onClick={() => setModal(null)}>
          Done
        </StudioButton>
      </ButtonCluster>
    </StudioModalShell>
  )

  const renderRewardsModal = () => (
    <StudioModalShell
      title="Reward tokens"
      description="Select rewards and split the budget with human percentages. Side rewards follow the contract's primary-pending semantics."
      onClose={() => setModal(null)}
    >
      <Hint style={{ marginTop: 0 }}>Known Polygon rewards</Hint>
      <div>
        {knownRewards.map((reward) => {
          const isPrimary = draft.rewards.primary?.address.toLowerCase() === reward.address.toLowerCase()
          const isSide = draft.rewards.side.some((item) => item.address.toLowerCase() === reward.address.toLowerCase())
          return (
            <PickerRow key={reward.address} $selected={isPrimary || isSide}>
              <RewardTokenIcon reward={reward} />
              <div style={{ minWidth: 0 }}>
                <strong>{reward.symbol}</strong>
                <Hint style={{ margin: 3 }}>{reward.name}</Hint>
              </div>
              <PickerAction type="button" $active={isPrimary || isSide} onClick={() => toggleReward(reward)}>
                {isPrimary ? 'Primary' : isSide ? 'Remove' : draft.rewards.primary ? 'Add' : 'Choose'}
              </PickerAction>
            </PickerRow>
          )
        })}
      </div>
      <ModalDivider />
      <strong>Selected rewards</strong>
      {rewards.map((reward) => {
        const key = reward.address.toLowerCase()
        const isPrimary = draft.rewards.primary?.address.toLowerCase() === key
        return (
          <PickerRow key={`selected-${reward.address}`} $selected>
            <RewardTokenIcon reward={reward} />
            <div style={{ minWidth: 0 }}>
              <strong>{reward.symbol}</strong>
              <Hint style={{ margin: 3 }}>{isPrimary ? 'Primary reward' : 'Side reward'}</Hint>
            </div>
            <ModalInput
              aria-label={`${reward.symbol} allocation percentage`}
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formatAllocationPercent(draft.economics.allocationBps[key])}
              style={{ width: 82, padding: '8px' }}
              onChange={(event) => {
                const bps = percentToBps(event.target.value)
                if (bps) onUpdateAllocation(reward.address, bps)
              }}
            />
          </PickerRow>
        )
      })}
      {rewards.length > 1 ? (
        <Hint style={{ color: rewardAllocationTotal === 100 ? 'inherit' : undefined }}>
          Total allocation: <strong>{rewardAllocationTotal}%</strong>{' '}
          {rewardAllocationTotal === 100 ? '· ready' : '· must equal 100%'}
        </Hint>
      ) : null}
      <ModalDivider />
      <FieldLabel>
        Add token contract
        <ModalInput
          value={customRewardAddress}
          onChange={(event) => setCustomRewardAddress(event.target.value)}
          placeholder="0x…"
        />
      </FieldLabel>
      <ModalField style={{ marginTop: 10 }}>
        Add as
        <ModalSelect
          value={customRewardIsSide ? 'side' : 'primary'}
          onChange={(event) => setCustomRewardIsSide(event.target.value === 'side')}
        >
          <option value="primary">Primary reward</option>
          <option value="side">Additional reward</option>
        </ModalSelect>
      </ModalField>
      <Hint>ERC-20 metadata is read from Polygon. Custom tokens are saved in this pool draft only.</Hint>
      <ButtonCluster style={{ marginTop: 12 }}>
        <StudioButton
          type="button"
          onClick={() =>
            void onAddCustomReward(customRewardIsSide, customRewardAddress).then(() => setCustomRewardAddress(''))
          }
          disabled={!customRewardAddress}
        >
          Validate and add
        </StudioButton>
        <StudioButton type="button" $secondary onClick={() => setModal(null)}>
          Done
        </StudioButton>
      </ButtonCluster>
    </StudioModalShell>
  )

  const renderEconomicsModal = () => (
    <StudioModalShell
      title="Pool economics"
      description="Edit only the choices that shape this pool. Protocol-specific values stay in Advanced Details."
      onClose={() => setModal(null)}
    >
      <FieldLabel>
        Total reward budget
        <ModalInput
          inputMode="decimal"
          value={draft.economics.totalBudget || ''}
          onChange={(event) => onUpdateEconomics({ totalBudget: event.target.value })}
          placeholder="10"
        />
      </FieldLabel>
      <Hint>Budget denomination: {draft.economics.budgetDenomination || 'USDT'} · read-only quotes, no swap.</Hint>
      <ModalField>
        Duration
        <ModalSelect
          value={draft.economics.durationPreset}
          onChange={(event) =>
            onUpdateEconomics({ durationPreset: event.target.value as NftPoolDraft['economics']['durationPreset'] })
          }
        >
          <option value="1 month">1 month · 30 days</option>
          <option value="3 months">3 months · 90 days</option>
          <option value="6 months">6 months · 180 days</option>
          <option value="1 year">1 year · 365 days</option>
          <option value="custom">Custom days</option>
        </ModalSelect>
      </ModalField>
      {draft.economics.durationPreset === 'custom' ? (
        <FieldLabel>
          Custom duration (days)
          <ModalInput
            type="number"
            min="1"
            step="1"
            value={draft.economics.customDurationDays || ''}
            onChange={(event) => onUpdateEconomics({ customDurationDays: event.target.value })}
            placeholder="200"
          />
        </FieldLabel>
      ) : null}
      <FieldLabel>
        Minimum effective staking power
        <ModalInput
          type="number"
          min="0"
          step="1"
          value={draft.constraints.participantThreshold}
          onChange={(event) =>
            onUpdateDraft({ constraints: { ...draft.constraints, participantThreshold: event.target.value } })
          }
          placeholder="20"
        />
      </FieldLabel>
      <Hint>
        Rewards are calculated as if at least this much total weighted staking power exists; it is not a wallet count.
      </Hint>
      <ButtonCluster style={{ marginTop: 16 }}>
        <StudioButton type="button" onClick={() => setModal(null)}>
          Done
        </StudioButton>
        <StudioButton type="button" $secondary onClick={onRefreshQuotes} disabled={quoteBusy}>
          {quoteBusy ? 'Refreshing…' : 'Refresh quote'}
        </StudioButton>
      </ButtonCluster>
    </StudioModalShell>
  )

  const renderDetailsModal = () => (
    <StudioModalShell
      title="Pool details"
      description="Title and links are presentation metadata. They do not edit an already deployed contract."
      onClose={() => setModal(null)}
    >
      <FieldLabel>
        Pool title
        <ModalInput
          value={detailsDraft.name}
          onChange={(event) => setDetailsDraft({ ...detailsDraft, name: event.target.value })}
          placeholder="Gold NFT Rewards"
        />
      </FieldLabel>
      <FieldLabel>
        Project link (optional)
        <ModalInput
          value={detailsDraft.projectUrl}
          onChange={(event) => setDetailsDraft({ ...detailsDraft, projectUrl: event.target.value })}
          placeholder="https://…"
        />
      </FieldLabel>
      <FieldLabel>
        NFT link (optional)
        <ModalInput
          value={detailsDraft.getNftUrl}
          onChange={(event) => setDetailsDraft({ ...detailsDraft, getNftUrl: event.target.value })}
          placeholder="https://…"
        />
      </FieldLabel>
      <Hint>Artwork has its own picker. Optional links stay secondary to the card.</Hint>
      <ButtonCluster style={{ marginTop: 16 }}>
        <StudioButton type="button" onClick={saveDetails}>
          Save details
        </StudioButton>
        <StudioButton type="button" $secondary onClick={onOpenAdvanced}>
          Advanced details
        </StudioButton>
      </ButtonCluster>
    </StudioModalShell>
  )

  const renderNameModal = () => (
    <StudioModalShell title="Pool title" onClose={() => setModal(null)}>
      <FieldLabel>
        Title
        <ModalInput
          autoFocus
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          placeholder="Gold NFT Rewards"
        />
      </FieldLabel>
      <ButtonCluster style={{ marginTop: 16 }}>
        <StudioButton type="button" onClick={saveName}>
          Save title
        </StudioButton>
        <StudioButton type="button" $secondary onClick={() => setModal('details')}>
          Pool details
        </StudioButton>
      </ButtonCluster>
    </StudioModalShell>
  )

  const renderReviewModal = () => (
    <StudioModalShell
      title={sourcePool?.status === 'FINISHED' ? 'Review renewal' : sourcePool ? 'Review duplicate' : 'Review pool'}
      description="Read-only checks run here. No wallet transaction is sent until you choose Create Pool."
      onClose={() => setModal(null)}
    >
      <SidePanel style={{ padding: 14, boxShadow: 'none' }}>
        <SidePanelTitle style={{ fontSize: 15 }}>Final card summary</SidePanelTitle>
        <SummaryLine
          label="NFTs"
          value={selectedCollections.map((collection) => collection.displayName).join(', ') || 'Add an NFT'}
        />
        <SummaryLine label="Rewards" value={rewards.map((reward) => reward.symbol).join(' · ') || 'Add a reward'} />
        <SummaryLine
          label="Budget"
          value={`${draft.economics.totalBudget || '—'} ${draft.economics.budgetDenomination || 'USDT'}`}
        />
        <SummaryLine label="Duration" value={durationLabel(draft)} />
        <SummaryLine label="Minimum effective power" value={draft.constraints.participantThreshold || '—'} />
        <SummaryLine
          label="Required primary funding"
          value={
            economics?.primary.maximumScheduledFunding.gt(0)
              ? `${formatBaseUnits(economics.primary.maximumScheduledFunding, rewardDecimals)} ${
                  draft.rewards.primary?.symbol || ''
                }`
              : '—'
          }
        />
      </SidePanel>
      {!reviewResult && !reviewBusy ? (
        <Hint>Review runs the Polygon network, authority, balances, gas and launch simulation checks.</Hint>
      ) : null}
      {reviewBusy ? <Hint>Checking Polygon setup…</Hint> : null}
      {reviewResult ? (
        <ReviewChecks>
          {reviewResult.checks.map((check) => (
            <ReviewCheck key={`${check.key}-${check.label}`} $pass={check.status === 'PASS'}>
              <strong>{check.status === 'PASS' ? '✓' : '!'}</strong>
              <span>
                {check.label}
                {check.detail ? ` · ${check.detail}` : ''}
              </span>
            </ReviewCheck>
          ))}
        </ReviewChecks>
      ) : null}
      {reviewResult && !reviewResult.ok ? (
        <Hint style={{ color: 'inherit' }}>Resolve the blocked items, then run the review again.</Hint>
      ) : null}
      <ButtonCluster style={{ marginTop: 16 }}>
        <StudioButton
          type="button"
          onClick={onReview}
          disabled={reviewBusy || validation.blockers.length > 0 || !account}
        >
          {reviewBusy ? 'Checking…' : reviewResult ? 'Run checks again' : 'Run checks'}
        </StudioButton>
        <StudioButton type="button" $secondary onClick={onCreatePool} disabled={!reviewResult?.ok || reviewBusy}>
          Create Pool
        </StudioButton>
      </ButtonCluster>
      {!account ? <Hint>Connect the intended Polygon admin wallet to run the review.</Hint> : null}
    </StudioModalShell>
  )

  return (
    <>
      <StudioLayout>
        <StudioPreviewColumn>
          <StudioEyebrow>
            NFT Pool Studio {sourcePool ? `· ${sourcePool.status === 'FINISHED' ? 'Renew' : 'Duplicate'}` : ''}
          </StudioEyebrow>
          <EditablePoolCard>
            <ArtworkButton
              type="button"
              $src={selectedArtwork}
              onClick={() => setModal('artwork')}
              aria-label="Edit pool artwork"
            >
              {!selectedArtwork ? <ArtworkEmpty>Choose pool artwork</ArtworkEmpty> : null}
              <CardStatus $tone={statusTone(validation)}>{status}</CardStatus>
              <CardArtworkTitle>
                {draft.name || primaryCollection?.displayName || 'Your NFT rewards pool'}
              </CardArtworkTitle>
              <ArtworkEditHint>✦ Change artwork</ArtworkEditHint>
            </ArtworkButton>
            <PoolCardBody>
              <CardToolbar>
                <CollectionStackButton
                  type="button"
                  onClick={() => setModal('collections')}
                  aria-label="Edit NFT collections"
                >
                  <CollectionStack>
                    {selectedCollections.slice(0, 4).map((collection) => (
                      <CollectionStackImage key={collection.id} src={cardCollectionImage(collection)} alt="" />
                    ))}
                    {!selectedCollections.length ? <AddCollectionCircle>+</AddCollectionCircle> : null}
                    {selectedCollections.length > 4 ? <StackLabel>+{selectedCollections.length - 4}</StackLabel> : null}
                  </CollectionStack>
                  <StackLabel>
                    {selectedCollections.length
                      ? `${selectedCollections.length} NFT${selectedCollections.length === 1 ? '' : 's'}`
                      : 'Add NFT'}
                  </StackLabel>
                </CollectionStackButton>
                <StudioButton type="button" $quiet onClick={() => setModal('details')}>
                  Pool details <EditIcon>✎</EditIcon>
                </StudioButton>
              </CardToolbar>
              <CardSection style={{ marginTop: 8 }}>
                <CardNameButton
                  type="button"
                  onClick={() => {
                    setNameDraft(draft.name)
                    setModal('name')
                  }}
                >
                  {draft.name || 'Name your pool'} <EditIcon>✎</EditIcon>
                </CardNameButton>
                <CardMeta>
                  {selectedCollections.map((collection) => collection.displayName).join(' · ') ||
                    'NFT collections will appear here'}
                </CardMeta>
              </CardSection>
              <CardSection>
                <CardSectionHeading>
                  <span>Rewards</span>
                  <StudioButton type="button" $quiet onClick={() => setModal('rewards')}>
                    Edit
                  </StudioButton>
                </CardSectionHeading>
                <RewardAreaButton type="button" onClick={() => setModal('rewards')} aria-label="Edit reward tokens">
                  {rewards.length ? (
                    rewards.map((reward, index) => (
                      <RewardChip key={reward.address} $primary={index === 0}>
                        <RewardTokenIcon reward={reward} />
                        {reward.symbol}
                        {rewards.length > 1
                          ? ` ${formatAllocationPercent(draft.economics.allocationBps[reward.address.toLowerCase()])}%`
                          : ''}
                      </RewardChip>
                    ))
                  ) : (
                    <CardMeta>Add reward tokens</CardMeta>
                  )}
                </RewardAreaButton>
                {economics && draft.economics.totalBudget ? (
                  <div style={{ display: 'grid', gap: 4, marginTop: 9 }}>
                    <CardMeta>Allocated budget and token estimate</CardMeta>
                    {economics.allocations.map((allocation) => {
                      const reward = rewards.find(
                        (item) => item.address.toLowerCase() === allocation.tokenAddress.toLowerCase(),
                      )
                      const budgetAllocation = economics.budgetAllocations.find(
                        (item) => item.tokenAddress.toLowerCase() === allocation.tokenAddress.toLowerCase(),
                      )
                      if (!reward || !budgetAllocation) return null
                      const amount =
                        allocation.source === 'missing'
                          ? 'Awaiting quote'
                          : `${formatBaseUnits(allocation.desiredAmount, reward.decimals)} ${reward.symbol}`
                      return (
                        <CardMeta key={allocation.tokenAddress}>
                          {reward.symbol} {formatAllocationPercent(allocation.allocationBps.toString())}% ·{' '}
                          {formatBaseUnits(budgetAllocation.allocatedBudget, draft.economics.budgetDecimals)}{' '}
                          {draft.economics.budgetDenomination || 'USDT'} → {amount}
                        </CardMeta>
                      )
                    })}
                  </div>
                ) : null}
              </CardSection>
              <CardMetricGrid>
                <CardMetricButton type="button" onClick={() => setModal('economics')}>
                  <MetricLabel>Reward budget</MetricLabel>
                  <MetricValue>{draft.economics.totalBudget || 'Add budget'}</MetricValue>
                  <MetricHint>{draft.economics.budgetDenomination || 'USDT'}</MetricHint>
                </CardMetricButton>
                <CardMetricButton type="button" onClick={() => setModal('economics')}>
                  <MetricLabel>Duration</MetricLabel>
                  <MetricValue>{durationLabel(draft)}</MetricValue>
                  <MetricHint>Editable schedule</MetricHint>
                </CardMetricButton>
                <CardMetricButton type="button" onClick={() => setModal('economics')}>
                  <MetricLabel>Min. effective power</MetricLabel>
                  <MetricValue>{draft.constraints.participantThreshold || 'Set power'}</MetricValue>
                  <MetricHint>Weighted shares</MetricHint>
                </CardMetricButton>
              </CardMetricGrid>
              <SharingCallout>
                <strong>Reward sharing</strong>
                <br />
                Rewards are shared by staking power. As more staking power enters the pool, each stake receives a
                smaller share of the fixed daily reward.
                {shareExamples.length ? (
                  <div style={{ marginTop: 9, display: 'grid', gap: 4 }}>
                    {shareExamples.map(({ totalShares, result }) => (
                      <div key={totalShares.toString()}>
                        <strong>At {totalShares.toString()} total power:</strong> 1x ≈{' '}
                        {formatBaseUnits(result.dailyReward, rewardDecimals)} {draft.rewards.primary?.symbol}
                      </div>
                    ))}
                    {weightedExamples.length ? (
                      <div style={{ marginTop: 5, display: 'grid', gap: 3 }}>
                        <strong>At {threshold.toString()} total power:</strong>
                        {weightedExamples.map(({ key, label, participantWeight, result }) => (
                          <div key={key}>
                            {label} {participantWeight.toString()}x ≈{' '}
                            {formatBaseUnits(result.dailyReward, rewardDecimals)} {draft.rewards.primary?.symbol}/day
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div style={{ marginTop: 5 }}>Add a budget and review the pool to see live share estimates.</div>
                )}
              </SharingCallout>
            </PoolCardBody>
          </EditablePoolCard>
        </StudioPreviewColumn>
        <StudioSidePanel>
          <SidePanel>
            <SidePanelTitle>Pool summary</SidePanelTitle>
            <SummaryLine label="NFT collections" value={String(draft.collections.length)} />
            <SummaryLine label="Reward tokens" value={rewards.map((reward) => reward.symbol).join(' · ') || '—'} />
            <SummaryLine
              label="Budget"
              value={`${draft.economics.totalBudget || '—'} ${draft.economics.budgetDenomination || 'USDT'}`}
            />
            <SummaryLine label="Duration" value={durationLabel(draft)} />
            <SummaryLine
              label="Funding status"
              value={economics?.primary.maximumScheduledFunding.gt(0) ? 'Plan calculated' : 'Budget needed'}
            />
          </SidePanel>
          <SidePanel>
            <SidePanelTitle>Live economics</SidePanelTitle>
            <SummaryLine
              label="Primary / block"
              value={
                hasRewardRate
                  ? `${formatBaseUnits(rewardPerBlock, rewardDecimals)} ${draft.rewards.primary?.symbol || ''}`
                  : '—'
              }
            />
            <SummaryLine
              label="Daily primary"
              value={
                hasRewardRate
                  ? `${formatBaseUnits(
                      calculateRewardSharePreview({
                        rewardPerBlock,
                        participantWeight: BigNumber.from(1),
                        totalShares: BigNumber.from(1),
                        participantThreshold: BigNumber.from(1),
                        secondsPerBlock,
                      }).dailyPrimaryEmission,
                      rewardDecimals,
                    )} ${draft.rewards.primary?.symbol || ''}`
                  : '—'
              }
            />
            <SummaryLine
              label="Wallet balance"
              value={
                walletBalanceBusy
                  ? 'Reading…'
                  : draft.rewards.primary
                  ? `${walletBalances[draft.rewards.primary.address.toLowerCase()] || 'Not read'} ${
                      draft.rewards.primary.symbol
                    }`
                  : '—'
              }
            />
            <ButtonCluster style={{ marginTop: 14 }}>
              <StudioButton
                type="button"
                $secondary
                onClick={onReadWalletBalances}
                disabled={walletBalanceBusy || !account || !rewards.length}
              >
                {walletBalanceBusy ? 'Reading…' : 'Read balances'}
              </StudioButton>
              <StudioButton
                type="button"
                $secondary
                onClick={onRefreshQuotes}
                disabled={quoteBusy || !draft.economics.totalBudget}
              >
                {quoteBusy ? 'Refreshing…' : 'Refresh quote'}
              </StudioButton>
            </ButtonCluster>
            <Hint>Quotes are read-only. No swap is performed.</Hint>
          </SidePanel>
          <SidePanel>
            <SidePanelTitle>
              {sourcePool?.status === 'FINISHED'
                ? 'Renew this pool'
                : sourcePool
                ? 'Duplicate this pool'
                : 'Ready when you are'}
            </SidePanelTitle>
            <Hint style={{ marginTop: 0 }}>
              {validation.blockers.length
                ? validation.blockers[0]
                : 'Review the card, then run the read-only checks before opening your wallet.'}
            </Hint>
            <ButtonCluster style={{ marginTop: 16 }}>
              <StudioButton type="button" onClick={() => setModal('review')} disabled={validation.blockers.length > 0}>
                Review Pool
              </StudioButton>
              <StudioButton type="button" $secondary onClick={onSave}>
                Save draft
              </StudioButton>
            </ButtonCluster>
            <ButtonCluster style={{ marginTop: 10 }}>
              <StudioButton type="button" $quiet onClick={onOpenAdvanced}>
                Advanced details
              </StudioButton>
            </ButtonCluster>
          </SidePanel>
        </StudioSidePanel>
      </StudioLayout>
      {modal === 'artwork' ? renderArtworkModal() : null}
      {modal === 'collections' ? renderCollectionsModal() : null}
      {modal === 'rewards' ? renderRewardsModal() : null}
      {modal === 'economics' ? renderEconomicsModal() : null}
      {modal === 'details' ? renderDetailsModal() : null}
      {modal === 'review' ? renderReviewModal() : null}
      {modal === 'name' ? renderNameModal() : null}
    </>
  )
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '9px 0',
        borderBottom: '1px solid currentColor',
        borderColor: 'inherit',
        fontSize: 12,
      }}
    >
      <span style={{ opacity: 0.7 }}>{label}</span>
      <strong style={{ textAlign: 'right' }}>{value}</strong>
    </div>
  )
}
