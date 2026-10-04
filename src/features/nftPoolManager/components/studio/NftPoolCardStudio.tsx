import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { BigNumber } from '@ethersproject/bignumber'
import type { NftCollection, NftPool, NftPoolDraft, NftPoolDraftReward } from '../../types'
import type { PoolEconomicsCalculation } from '../../economics'
import { applySoliditySideReward, formatBaseUnits } from '../../economics'
import type { NftDraftValidationResult } from '../../validation'
import type { NftPreflightResult } from '../../launch/types'
import { findNftCollection } from '../../registry'
import { collectionImageCandidates, resolveNftAssetUrl } from '../../assets'
import { isLocalForkMode } from 'config/localFork'
import {
  calculateRewardSharePreview,
  calculateSoloStakeRewardSharePreview,
  formatAllocationPercent,
  percentToBps,
} from '../../studio/economicsPreview'
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
  ReviewCheckDetail,
  ReviewChecks,
  ReviewCheckGroup,
  ReviewGroupCount,
  ReviewGroupHeader,
  ReviewGroupMark,
  ReviewGroupTitle,
  ReviewToggle,
  ReviewSummary,
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
  const candidates = collectionImageCandidates(collection)
  const [index, setIndex] = useState(0)
  return (
    <PickerIcon
      src={candidates[index]}
      alt=""
      onError={() => setIndex((current) => Math.min(current + 1, candidates.length - 1))}
    />
  )
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
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const body = document.body
    const previousOverflow = body.style.overflow
    const previousPaddingRight = body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const currentPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0

    setPortalTarget(body)
    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`

    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPaddingRight
    }
  }, [])

  if (!portalTarget) return null

  return createPortal(
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
    </ModalBackdrop>,
    portalTarget,
  )
}

function fundingCheckDetail(
  key: string,
  result: NftPreflightResult,
  rewards: NftPoolDraftReward[],
): string | undefined {
  const match = /^token-balance-(\d+)$/.exec(key)
  if (!match) return undefined

  const index = Number(match[1])
  const reward = rewards[index]
  if (!reward) return undefined
  const balance = result.tokenBalances.find((item) => item.tokenAddress.toLowerCase() === reward.address.toLowerCase())
  if (!balance || balance.decimals === undefined) return undefined

  const required = BigNumber.from(balance.requiredBalance)
  const available = BigNumber.from(balance.walletBalance)
  const shortfall = required.gt(available) ? required.sub(available) : BigNumber.from(0)
  const symbol = balance.symbol || reward.symbol
  const selectedAddress = balance.tokenAddress
  const requiredAmount = formatBaseUnits(required, balance.decimals)
  const availableAmount = formatBaseUnits(available, balance.decimals)

  if (shortfall.isZero()) {
    return `Required ${requiredAmount} ${symbol}; this wallet has ${availableAmount} ${symbol}. The balance is sufficient. Selected contract: ${selectedAddress}.`
  }

  const nextStep = isLocalForkMode
    ? 'Select a reward token with enough balance, or add the funded fork-only token by its exact address from npm run fork:status. Tokens with the same symbol can have different contract addresses.'
    : 'Select a reward token with enough balance or fund this connected wallet before continuing.'

  return `Required ${requiredAmount} ${symbol}; this wallet has ${availableAmount} ${symbol}; short by ${formatBaseUnits(
    shortfall,
    balance.decimals,
  )} ${symbol}. Selected contract: ${selectedAddress}. ${nextStep}`
}

function statusTone(validation: NftDraftValidationResult): 'draft' | 'ready' {
  return validation.blockers.length ? 'draft' : 'ready'
}

function statusText(validation: NftDraftValidationResult): string {
  return validation.blockers.length ? 'DRAFT' : 'READY'
}

function formatEncodedPercentage(value: BigNumber | string): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function sourceSideRewardPercentage(
  draft: NftPoolDraft,
  sourcePool: NftPool | undefined,
  reward: NftPoolDraftReward,
): string | undefined {
  const sourceEntry = draft.sourceEconomics?.originalSideRewardPercentages.find(
    (entry) => entry.tokenAddress.toLowerCase() === reward.address.toLowerCase(),
  )
  if (sourceEntry?.percentage !== undefined) return sourceEntry.percentage.toString()
  const poolReward = sourcePool?.rewards.side.find(
    (entry) => entry.token.address.toLowerCase() === reward.address.toLowerCase(),
  )
  return poolReward?.onChainPercentage?.toString() || poolReward?.configuredPercentage
}

function CardCollectionImage({ collection }: { collection: NftCollection }) {
  const candidates = collectionImageCandidates(collection)
  const [index, setIndex] = useState(0)
  return (
    <CollectionStackImage
      src={candidates[index]}
      alt=""
      onError={() => setIndex((current) => Math.min(current + 1, candidates.length - 1))}
    />
  )
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
  const [showAllPassedChecks, setShowAllPassedChecks] = useState(false)
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
  const sourceSideRatios = draft.rewards.side.flatMap((reward) => {
    const percentage = sourceSideRewardPercentage(draft, sourcePool, reward)
    return percentage === undefined ? [] : [{ symbol: reward.symbol, percentage }]
  })
  const effectiveThreshold = draft.constraints.participantThreshold
  const threshold = useMemo(() => safeBigNumber(effectiveThreshold), [effectiveThreshold])
  const rewardDecimals = draft.rewards.primary?.decimals
  const dailyPrimaryReward = economics?.primary.rewardPerBlock
    ? calculateRewardSharePreview({
        rewardPerBlock: economics.primary.rewardPerBlock,
        participantWeight: BigNumber.from(1),
        totalShares: threshold.isZero() ? safeBigNumber('1') : threshold,
        participantThreshold: threshold,
        secondsPerBlock,
      }).dailyReward
    : undefined

  const dailyRewardFor = (
    reward: NftPoolDraftReward,
    primaryDailyAmount = dailyPrimaryReward,
  ): BigNumber | undefined => {
    if (primaryDailyAmount === undefined || !draft.rewards.primary) return undefined
    if (reward.address.toLowerCase() === draft.rewards.primary.address.toLowerCase()) return primaryDailyAmount
    const side = economics?.side.find((item) => item.tokenAddress.toLowerCase() === reward.address.toLowerCase())
    if (!side || draft.rewards.primary.decimals === undefined || reward.decimals === undefined) return undefined
    return applySoliditySideReward(
      primaryDailyAmount,
      side.encodedPercentage,
      draft.rewards.primary.decimals,
      reward.decimals,
    )
  }
  const shareExamples = useMemo(() => {
    const rewardPerBlock = economics?.primary.rewardPerBlock
    if (!rewardPerBlock || rewardPerBlock.isZero() || !draft.rewards.primary) return []
    const baseline = threshold.isZero() ? safeBigNumber('1') : threshold
    const examples = [baseline, baseline.mul(2), baseline.mul(5)]
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
  }, [draft.rewards.primary, economics?.primary.rewardPerBlock, secondsPerBlock, threshold])

  const weightedExamples = useMemo(() => {
    const rewardPerBlock = economics?.primary.rewardPerBlock
    if (!rewardPerBlock || rewardPerBlock.isZero()) return []
    return draft.collections.slice(0, 3).flatMap((item) => {
      const participantWeight = safeBigNumber(item.weight)
      if (participantWeight.isZero()) return []
      const collection = findNftCollection(knownCollections, 137, item.address)
      const result = calculateSoloStakeRewardSharePreview({
        rewardPerBlock,
        participantWeight,
        participantThreshold: threshold,
        secondsPerBlock,
      })
      return [
        {
          key: item.address,
          label: collection?.displayName || item.name,
          participantWeight,
          result,
        },
      ]
    })
  }, [draft.collections, economics?.primary.rewardPerBlock, knownCollections, secondsPerBlock, threshold])

  const selectedArtwork = resolveNftAssetUrl(draft.banner || draft.avatar)
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
    if (isSide) onSetPrimaryReward(reward)
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
      description="Select rewards and split the budget. Side rewards use integer percentages of primary payouts, so a target below 1% rounds to zero."
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
              <PickerAction type="button" $active={isPrimary} disabled={isPrimary} onClick={() => toggleReward(reward)}>
                {isPrimary ? 'Primary' : isSide ? 'Make primary' : draft.rewards.primary ? 'Add' : 'Choose'}
              </PickerAction>
            </PickerRow>
          )
        })}
      </div>
      {sourceSideRatios.length ? (
        <Hint>
          Original contract ratios recovered:{' '}
          {sourceSideRatios
            .map(({ symbol, percentage }) => `${symbol} ${formatEncodedPercentage(percentage)}%`)
            .join(' · ')}
          . These are side-reward ratios, not the new budget split.
        </Hint>
      ) : null}
      <ModalDivider />
      <strong>Selected rewards</strong>
      {rewards.length > 1 ? (
        <Hint>
          New funding split for this renewal. The old pool did not store a budget allocation, so the safe default is
          100% primary and 0% side rewards until you set the new split.
        </Hint>
      ) : null}
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
            <div
              style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}
            >
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
              {!isPrimary ? (
                <PickerAction type="button" $active onClick={() => onRemoveSideReward(reward.address)}>
                  Remove
                </PickerAction>
              ) : null}
            </div>
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
      <Hint>
        ERC-20 metadata is read from the connected network.{' '}
        {isLocalForkMode
          ? 'On LOCAL FORK, same-symbol faucet tokens use a different contract address. Add the fork-only token address printed by npm run fork:status.'
          : 'Custom tokens are saved in this pool draft only.'}
      </Hint>
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
          placeholder="1"
        />
      </FieldLabel>
      <Hint>Independent reward-sharing floor, not a wallet count. Use 0 for actual staked power only.</Hint>
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
      {reviewResult ? (
        <ReviewSummary $ok={reviewResult.ok} role={reviewResult.ok ? 'status' : 'alert'}>
          <strong>{reviewResult.ok ? 'Preflight passed' : 'Pool creation is blocked'}</strong>
          <span>
            {reviewResult.ok
              ? reviewResult.checks.some((check) => check.status === 'WARN')
                ? 'The remaining warning is informational and does not prevent creation.'
                : 'All required checks passed. Create Pool can continue.'
              : `${
                  reviewResult.checks.filter((check) => check.status === 'BLOCK').length
                } blocking check(s) must be fixed. Informational warnings do not prevent creation.`}
          </span>
        </ReviewSummary>
      ) : null}
      {!reviewResult && !reviewBusy ? (
        <Hint>Review runs the Polygon network, authority, balances, gas and launch simulation checks.</Hint>
      ) : null}
      {reviewBusy ? <Hint>Checking Polygon setup…</Hint> : null}
      {reviewResult ? (
        <ReviewChecks>
          {(['BLOCK', 'WARN', 'PASS'] as const).map((status) => {
            const checks = reviewResult.checks.filter((check) => check.status === status)
            if (!checks.length) return null

            const passedPreviewLimit = 3
            const visibleChecks =
              status === 'PASS' && !showAllPassedChecks ? checks.slice(0, passedPreviewLimit) : checks
            const groupTitle = status === 'BLOCK' ? 'Needs fixing' : status === 'WARN' ? 'Warnings' : 'Passed checks'
            const groupDescription =
              status === 'BLOCK'
                ? 'Resolve these items before creating the pool.'
                : status === 'WARN'
                ? 'Review these notes; warnings may still allow you to continue.'
                : checks.length > passedPreviewLimit
                ? showAllPassedChecks
                  ? 'All passed checks are visible.'
                  : 'The first three are shown. Expand to inspect every check.'
                : 'All required checks passed.'

            return (
              <ReviewCheckGroup key={status} $status={status}>
                <ReviewGroupHeader>
                  <ReviewGroupMark $status={status} aria-hidden="true">
                    {status === 'BLOCK' ? '×' : status === 'WARN' ? '!' : '✓'}
                  </ReviewGroupMark>
                  <ReviewGroupTitle>
                    <strong>{groupTitle}</strong>
                    <span>{groupDescription}</span>
                  </ReviewGroupTitle>
                  <ReviewGroupCount $status={status}>
                    {status === 'PASS' && checks.length > passedPreviewLimit && !showAllPassedChecks
                      ? `${Math.min(checks.length, passedPreviewLimit)} / ${checks.length}`
                      : checks.length}
                  </ReviewGroupCount>
                </ReviewGroupHeader>
                <div id={status === 'PASS' ? 'nft-pool-passed-checks' : undefined}>
                  {visibleChecks.map((check) => {
                    const fundingDetail = fundingCheckDetail(check.key, reviewResult, rewards)
                    return (
                      <ReviewCheck key={`${check.key}-${check.label}`} $status={check.status}>
                        <strong aria-hidden="true">
                          {check.status === 'PASS' ? '✓' : check.status === 'WARN' ? '!' : '×'}
                        </strong>
                        <div>
                          <span>{check.label}</span>
                          {check.detail ? <ReviewCheckDetail>{check.detail}</ReviewCheckDetail> : null}
                          {fundingDetail ? <ReviewCheckDetail>{fundingDetail}</ReviewCheckDetail> : null}
                        </div>
                      </ReviewCheck>
                    )
                  })}
                </div>
                {status === 'PASS' && checks.length > passedPreviewLimit ? (
                  <ReviewToggle
                    type="button"
                    aria-expanded={showAllPassedChecks}
                    aria-controls="nft-pool-passed-checks"
                    onClick={() => setShowAllPassedChecks((expanded) => !expanded)}
                  >
                    {showAllPassedChecks
                      ? 'Show fewer passed checks'
                      : `Show ${checks.length - passedPreviewLimit} more passed checks`}
                    <span aria-hidden="true">{showAllPassedChecks ? '⌃' : '⌄'}</span>
                  </ReviewToggle>
                ) : null}
              </ReviewCheckGroup>
            )
          })}
        </ReviewChecks>
      ) : null}
      {reviewResult && !reviewResult.ok ? (
        <Hint style={{ color: 'inherit' }}>Resolve the blocked items, then run the review again.</Hint>
      ) : null}
      <ButtonCluster style={{ marginTop: 16 }}>
        <StudioButton
          type="button"
          onClick={() => {
            setShowAllPassedChecks(false)
            onReview()
          }}
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
                      <CardCollectionImage key={collection.id} collection={collection} />
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
                {rewards.length > 1 ? (
                  <CardMeta>
                    New funding split · this is not the historical allocation. The old budget split is not stored
                    on-chain; choose a new split for this renewal. Original side payout ratios are separate.
                  </CardMeta>
                ) : null}
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
                {sourceSideRatios.length ? (
                  <CardMeta style={{ display: 'block', marginTop: 8 }}>
                    Original on-chain side payout ratios (of primary reward):{' '}
                    {sourceSideRatios
                      .map(({ symbol, percentage }) => `${symbol} ${formatEncodedPercentage(percentage)}%`)
                      .join(' · ')}
                  </CardMeta>
                ) : null}
                {economics && draft.economics.totalBudget ? (
                  <div style={{ display: 'grid', gap: 4, marginTop: 9 }}>
                    <CardMeta>Allocated budget, quoted token target and estimated protocol payout</CardMeta>
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
                      const dailyReward = allocation.source === 'missing' ? undefined : dailyRewardFor(reward)
                      const sideReward = economics.side.find(
                        (item) => item.tokenAddress.toLowerCase() === allocation.tokenAddress.toLowerCase(),
                      )
                      return (
                        <div key={allocation.tokenAddress}>
                          <CardMeta>
                            {reward.symbol} {formatAllocationPercent(allocation.allocationBps.toString())}% ·{' '}
                            {formatBaseUnits(budgetAllocation.allocatedBudget, draft.economics.budgetDecimals)}{' '}
                            {draft.economics.budgetDenomination || 'USDT'} → {amount}
                            {dailyReward !== undefined ? (
                              <span style={{ display: 'block' }}>
                                ≈ {formatBaseUnits(dailyReward, reward.decimals)} {reward.symbol}/day per 1x ·{' '}
                                {threshold.isZero()
                                  ? 'at 1 total power; no minimum floor'
                                  : `up to ${threshold.toString()} total power`}
                              </span>
                            ) : null}
                          </CardMeta>
                          {sideReward?.blocking ? (
                            <CardMeta role="alert" style={{ display: 'block', marginTop: 3 }}>
                              {sideReward.encodedPercentage.isZero()
                                ? `${reward.symbol} pays 0% at this split: the contract rounds this side-reward ratio down to zero.`
                                : `The contract would pay ${formatBaseUnits(
                                    sideReward.maximumImpliedSideFunding,
                                    reward.decimals,
                                  )} ${reward.symbol}, not the quoted ${formatBaseUnits(
                                    sideReward.desiredSideAmount,
                                    reward.decimals,
                                  )} ${reward.symbol}.`}{' '}
                              Adjust the funding split or remove this side reward before review.
                            </CardMeta>
                          ) : null}
                        </div>
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
                  <MetricHint>{sourcePool ? 'Estimated from original block schedule' : 'Editable schedule'}</MetricHint>
                </CardMetricButton>
                <CardMetricButton type="button" onClick={() => setModal('economics')}>
                  <MetricLabel>Min. effective power</MetricLabel>
                  <MetricValue>{effectiveThreshold || 'Set power'}</MetricValue>
                  <MetricHint>Weighted shares</MetricHint>
                </CardMetricButton>
              </CardMetricGrid>
              <SharingCallout>
                <strong>Reward sharing</strong>
                <br />
                The primary reward is shared by staking power. Side rewards follow a contract-encoded ratio of each
                primary payout; they do not have an independent emission schedule.
                {shareExamples.length ? (
                  <div style={{ marginTop: 9, display: 'grid', gap: 4 }}>
                    {shareExamples.map(({ totalShares, result }) => (
                      <div key={totalShares.toString()}>
                        <strong>At {totalShares.toString()} total power, a 1x stake earns:</strong>
                        {rewards.map((reward) => {
                          const dailyReward = dailyRewardFor(reward, result.dailyReward)
                          return dailyReward === undefined ? null : (
                            <div key={reward.address}>
                              {reward.symbol} ≈ {formatBaseUnits(dailyReward, reward.decimals)} {reward.symbol}/day
                            </div>
                          )
                        })}
                      </div>
                    ))}
                    {weightedExamples.length ? (
                      <div style={{ marginTop: 5, display: 'grid', gap: 3 }}>
                        <strong>Each example assumes one NFT staked alone:</strong>
                        {weightedExamples.map(({ key, label, participantWeight, result }) => (
                          <div key={key}>
                            <strong>
                              {label} {participantWeight.toString()}x at {result.totalShares.toString()} total power:
                            </strong>
                            {rewards.map((reward) => {
                              const dailyReward = dailyRewardFor(reward, result.dailyReward)
                              return dailyReward === undefined ? null : (
                                <div key={reward.address}>
                                  {reward.symbol} ≈ {formatBaseUnits(dailyReward, reward.decimals)} {reward.symbol}/day
                                </div>
                              )
                            })}
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
