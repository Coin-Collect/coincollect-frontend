import { readManagedCollection } from 'features/universalRewards/managedNfts'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import BigNumber from 'bignumber.js'
import { AddIcon, ChevronRightIcon, CloseIcon, Flex } from '@pancakeswap/uikit'
import { getAddress, isAddress, isAddressEqual, parseAbi, zeroAddress, type Address } from 'viem'
import { poolArtworkRegistry } from 'features/nftPoolManager/studio/artworkRegistry'
import { universalRewardsAbi } from 'features/universalRewards/abi'
import { preferStudioTokens, studioCollection, studioCollections } from 'features/universalRewards/assetCatalog'
import RewardTokenIcon from '../FarmCard/RewardTokenIcon'
import { useV3Query } from 'features/universalRewards/hooks'
import { safeArtwork, v3PoolTypeLabels } from 'features/universalRewards/metadata'
import { shortAmount } from 'features/universalRewards/presentation'
import { adjustRewardShare, equalRewardShares } from 'features/universalRewards/rewardShares'
import {
  inspectStudioCollection,
  parseV3Amount,
  quoteV3RewardWindow,
  type V3StudioDraft,
} from 'features/universalRewards/studio'
import { V3Actions, V3Button, V3Error, V3Field, V3Fields, V3Muted } from 'features/universalRewards/styles'
import type { V3StudioComposerProps } from 'features/universalRewards/V3Studio'
import { Action, StyledActionButton } from '../FarmCard/CardActionsContainer'
import CardHeadingWithBanner from '../FarmCard/CardHeadingWithBanner'
import { NftFarmCardLayout } from '../FarmCard/FarmCard'
import V3PoolTypeEditor from './V3PoolTypeEditor'
import {
  AssetChoice,
  Choice,
  DetailButton,
  Distribution,
  EditorBody,
  EditorDialog,
  EditorFooter,
  EditorGrid,
  EditorHeader,
  InlineTitle,
  Inspector,
  Launch,
  NameInput,
  Preview,
  RewardLane,
  RowButton,
  ShareInput,
  Slice,
  Workspace,
} from './studioStyles'

const ZERO = BigInt(0)
const collectionNameAbi = parseAbi(['function name() view returns (string)'])
const artworkOptions = [
  { id: 'studio-default', label: 'Collect Hero', src: '/images/collectHeroes/14.jpg' },
  ...poolArtworkRegistry,
]
const panelTitles = {
  artwork: 'Pool artwork',
  description: 'Pool description',
  collections: 'Eligible NFT collections',
  rewards: 'Reward tokens',
  budget: 'Funding budget',
  schedule: 'Reward schedule',
  limits: 'Participation rules',
} as const

type Panel = keyof typeof panelTitles
type CollectionRule = V3StudioDraft['collections'][number]

function localTime(timestamp: number) {
  const date = new Date(timestamp)
  return new Date(timestamp - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function StudioDialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) {
      dialog.showModal()
      dialog.querySelector<HTMLElement>('[data-studio-focus]')?.focus()
    }
  }, [])
  return (
    <EditorDialog aria-labelledby={titleId} ref={ref} onClose={close}>
      <EditorHeader>
        <h2 id={titleId}>{title}</h2>
        <V3Button type="button" $secondary aria-label="Close editor" onClick={() => ref.current?.close()}>
          <CloseIcon width="18px" color="currentColor" />
        </V3Button>
      </EditorHeader>
      <EditorBody>{children}</EditorBody>
      <EditorFooter>
        <V3Button type="button" onClick={() => ref.current?.close()}>
          Done
        </V3Button>
      </EditorFooter>
    </EditorDialog>
  )
}

export default function V3FarmCardStudio({
  draft,
  studio,
  deployment,
  client,
  locked,
  onChange,
  launch,
}: V3StudioComposerProps) {
  const [panel, setPanel] = useState<Panel>()
  const [editingPoolType, setEditingPoolType] = useState(false)
  const poolType = draft.poolType ?? 'community'
  const [editingName, setEditingName] = useState(false)
  const [title, setTitle] = useState('')
  const [artworkInput, setArtworkInput] = useState('')
  const [artworkError, setArtworkError] = useState('')
  const [collectionFilter, setCollectionFilter] = useState('')
  const [collectionInput, setCollectionInput] = useState('')
  const [collectionChain, setCollectionChain] = useState('137')
  const [collectionError, setCollectionError] = useState('')
  const [checkingCollection, setCheckingCollection] = useState(false)
  const collectionCheck = useRef(false)
  const collectionField = useRef<HTMLInputElement>(null)
  const collectionErrorId = useId()
  const [collectionLabels, setCollectionLabels] = useState<Record<string, string>>({})
  const [quote, setQuote] = useState<{ key: string; amounts: Record<string, string> }>()
  const [shareEntry, setShareEntry] = useState<{ address: string; text: string }>()
  const assets = preferStudioTokens(studio.supported.filter(({ decimals }) => decimals !== null))
  const assetFor = (address: string) => assets.find((asset) => asset.address.toLowerCase() === address.toLowerCase())
  const funding = assets.find(
    (asset) => asset.canDeposit && asset.address.toLowerCase() === draft.fundAsset.toLowerCase(),
  )
  const directFunding = draft.fundingSource === 'direct'
  const hasSwap = !isAddressEqual(studio.swap, zeroAddress)
  const hasRemote =
    (studio.managedCollections && deployment.chainId === 31337) || !isAddressEqual(studio.verifier, zeroAddress)
  const shares = draft.rewards.map(({ sharePercent }) => Math.round(Number(sharePercent) * 100))
  const start = new Date(draft.startLocal)
  const scheduleText = Number.isFinite(start.getTime())
    ? start.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Choose a start'
  const budgetText = draft.budget && funding ? `${draft.budget} ${funding.symbol}` : 'Set funding budget'
  const duration = Number(draft.durationDays)
  const interval = Number(draft.intervalHours)
  const minimumStart = Math.max(Number(studio.timestamp) * 1000, Date.now())
  const quoteKey = JSON.stringify([
    draft.fundAsset,
    draft.budget,
    draft.durationDays,
    draft.intervalHours,
    draft.rewards,
  ])

  const open = (next: Panel) => {
    if (locked) return
    if (next === 'artwork') {
      setArtworkInput(draft.artwork || '')
      setArtworkError('')
    }
    if (next === 'collections') {
      setCollectionFilter('')
      setCollectionError('')
    }
    setPanel(next)
  }

  const readCollections = useCallback(async () => {
    const ledger = { address: deployment.address, abi: universalRewardsAbi }
    const count = Number(await client.readContract({ ...ledger, functionName: 'poolCount' }))
    const recent = Array.from({ length: Math.min(count, 8) }, (_, index) => BigInt(count - index))
    const groups = await Promise.all(
      recent.map((id) =>
        client.readContract({
          ...ledger,
          functionName: 'collectionRules',
          args: [id],
        }),
      ),
    )
    const entries = [
      ...new Map(
        groups.flat().map((rule) => [`${rule.sourceChainId}:${rule.collection.toLowerCase()}`, rule]),
      ).values(),
    ]
    return Promise.all(
      entries.slice(0, 16).map(async (rule) => {
        const managed = await readManagedCollection(client, deployment, rule.collection, undefined, studio.blockNumber)
        const name =
          !managed && rule.sourceChainId === BigInt(137)
            ? await client
                .readContract({ address: rule.collection, abi: collectionNameAbi, functionName: 'name' })
                .catch(() => '')
            : ''
        return {
          address: managed?.collection ?? rule.collection,
          sourceChain: String(managed?.sourceChainId ?? rule.sourceChainId),
          power: String(rule.weight),
          name: managed ? `ERC-${managed.standard} · ${managed.collection.slice(0, 8)}…` : name,
        }
      }),
    )
  }, [client, deployment, studio.blockNumber])
  const knownCollections = useV3Query(panel === 'collections' ? deployment.address : '', readCollections)
  const [collectionNames, setCollectionNames] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!knownCollections.data) return
    const names = Object.fromEntries(
      knownCollections.data
        .filter(({ name }) => name)
        .map(({ address, sourceChain, name }) => [`${sourceChain}:${address.toLowerCase()}`, name]),
    )
    setCollectionNames((existing) => ({ ...existing, ...names }))
  }, [knownCollections.data])

  const previewAmounts = useMemo(() => {
    if (
      directFunding ||
      !funding ||
      funding.decimals === null ||
      !Number.isInteger(duration) ||
      duration <= 0 ||
      duration > 1460
    )
      return undefined
    try {
      return parseV3Amount(draft.budget, funding.decimals, 'funding budget')
    } catch {
      return undefined
    }
  }, [directFunding, draft.budget, duration, funding])

  useEffect(() => {
    if (
      !hasSwap ||
      !funding ||
      !previewAmounts ||
      !Number.isInteger(interval) ||
      interval < 1 ||
      interval > duration * 24 ||
      interval > 720
    )
      return undefined
    const swaps = draft.rewards.filter(({ address }) => address.toLowerCase() !== funding.address.toLowerCase())
    if (!swaps.length) return undefined
    let active = true
    const timer = window.setTimeout(async () => {
      const block = await client.getBlock().catch(() => undefined)
      if (!block || !active) return
      const results = await Promise.all(
        swaps.map(async ({ address, sharePercent }) => {
          const reward = studio.supported.find((candidate) => candidate.address.toLowerCase() === address.toLowerCase())
          if (!reward || reward.decimals === null) return undefined
          const total = (previewAmounts * BigInt(Math.round(Number(sharePercent) * 100))) / BigInt(10000)
          const hours = BigInt(duration * 24)
          const tranche = (total * BigInt(interval) + hours - BigInt(1)) / hours
          if (tranche === ZERO) return undefined
          try {
            const { minimum: floor } = await quoteV3RewardWindow(client, studio, funding, reward, tranche, block.number)
            return [address, shortAmount((total * floor) / tranche / BigInt(duration), reward.decimals)] as const
          } catch {
            return undefined
          }
        }),
      )
      if (active)
        setQuote({
          key: quoteKey,
          amounts: Object.fromEntries(results.filter(Boolean) as Array<readonly [string, string]>),
        })
    }, 320)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [client, draft.rewards, duration, funding, hasSwap, interval, previewAmounts, quoteKey, studio])

  const amountPerDay = (address: Address, share: number) => {
    if (directFunding) {
      const reward = assetFor(address)
      const amount = draft.directRewardAmounts?.[address.toLowerCase()]
      if (!amount || !reward || reward.decimals === null || !Number.isInteger(duration) || duration <= 0)
        return undefined
      try {
        return shortAmount(parseV3Amount(amount, reward.decimals, 'reward amount') / BigInt(duration), reward.decimals)
      } catch {
        return undefined
      }
    }
    if (!funding || funding.decimals === null || !previewAmounts) return undefined
    if (isAddressEqual(funding.address, address)) {
      return shortAmount((previewAmounts * BigInt(share)) / BigInt(10000) / BigInt(duration), funding.decimals)
    }
    return quote?.key === quoteKey ? quote.amounts[address] : undefined
  }
  const chips = draft.rewards.flatMap(({ address, sharePercent }, index) => {
    const reward = assetFor(address)
    if (!reward) return []
    return [
      {
        token: reward.symbol,
        tokenMeta: { address: reward.address, symbol: reward.symbol },
        primary: index === 0,
        amount: amountPerDay(reward.address, shares[index]) ?? (directFunding ? '—' : `${sharePercent}%`),
      },
    ]
  })

  const setRewards = (addresses: string[], distribution = equalRewardShares(addresses.length)) => {
    onChange({
      rewards: addresses.map((address, index) => ({ address, sharePercent: String(distribution[index] / 100) })),
    })
  }
  const setShare = (index: number, value: number) => {
    if (!Number.isFinite(value)) return
    setRewards(
      draft.rewards.map(({ address }) => address),
      adjustRewardShare(shares, index, value),
    )
  }
  const toggleReward = (address: Address) => {
    const selected = draft.rewards.map((reward) => reward.address)
    if (selected.includes(address)) {
      setRewards(selected.filter((item) => item !== address))
    } else if (selected.length < 4) {
      setRewards([...selected, address])
    }
  }
  const setFunding = (address: Address) => {
    onChange({
      fundAsset: address,
      ...((!hasSwap || !draft.rewards.length) && {
        rewards: assetFor(address)?.canReward ? [{ address, sharePercent: '100' }] : [],
      }),
    })
  }

  const collectionName = ({ address, sourceChain }: CollectionRule) =>
    studioCollection(sourceChain, address)?.name ||
    collectionNames[`${sourceChain}:${address.toLowerCase()}`] ||
    `${address.slice(0, 8)}…${address.slice(-4)}`
  const addCollection = async (value: string, sourceChain: string, power?: string) => {
    if (collectionCheck.current || draft.collections.length >= 16) return
    const address = value.trim()
    if (!isAddress(address) || isAddressEqual(address, zeroAddress)) {
      setCollectionError('Enter an NFT contract address.')
      collectionField.current?.focus()
      return
    }
    const key = `${sourceChain}:${address.toLowerCase()}`
    if (draft.collections.some((rule) => `${rule.sourceChain}:${rule.address.toLowerCase()}` === key)) {
      setCollectionError('This NFT collection is already included.')
      return
    }

    collectionCheck.current = true
    setCheckingCollection(true)
    setCollectionError('')
    try {
      const checked = await inspectStudioCollection(
        client,
        deployment,
        studio,
        BigInt(sourceChain),
        getAddress(address),
      )
      setCollectionLabels((current) => ({ ...current, [key]: checked.label }))
      onChange({
        collections: [
          ...draft.collections,
          {
            address: getAddress(address),
            sourceChain,
            power: power ?? studioCollection(sourceChain, address)?.power ?? '1',
          },
        ],
      })
      setCollectionInput('')
    } catch (error) {
      setCollectionError(
        error instanceof Error ? error.message.split('\n')[0] : 'Collection verification is unavailable.',
      )
    } finally {
      collectionCheck.current = false
      setCheckingCollection(false)
    }
  }

  const beginName = () => {
    setTitle(draft.name)
    setEditingName(true)
  }
  const saveName = () => {
    onChange({ name: title.trim() })
    setEditingName(false)
  }
  const setArtwork = (value: string) => {
    const source = value.trim()
    if (!safeArtwork(source)) {
      setArtworkError('Choose an image below or enter a valid HTTPS image URL.')
      return
    }
    setArtworkInput(source)
    setArtworkError('')
    onChange({ artwork: source })
  }

  const renderEditor = () => {
    switch (panel) {
      case 'artwork':
        return (
          <>
            <EditorGrid aria-label="CoinCollect artwork">
              {artworkOptions.map(({ id, label, src }) => (
                <Choice
                  type="button"
                  key={id}
                  $selected={draft.artwork === src}
                  aria-pressed={draft.artwork === src}
                  onClick={() => setArtwork(src)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" />
                  <span>{label}</span>
                </Choice>
              ))}
            </EditorGrid>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                setArtwork(artworkInput)
              }}
            >
              <V3Field>
                Image URL
                <input
                  name="artwork-url"
                  value={artworkInput}
                  onChange={(event) => setArtworkInput(event.target.value)}
                  placeholder="https://…"
                />
              </V3Field>
              <V3Button type="submit" $secondary>
                Use image
              </V3Button>
            </form>
            {artworkError && <V3Error role="alert">{artworkError}</V3Error>}
          </>
        )
      case 'description':
        return (
          <V3Field>
            Description
            <textarea
              data-studio-focus
              name="pool-description"
              maxLength={200}
              rows={4}
              value={draft.description}
              onChange={(event) => onChange({ description: event.target.value })}
            />
          </V3Field>
        )
      case 'collections': {
        const query = collectionFilter.trim().toLowerCase()
        const matches = ({ name, address }: { name?: string; address: string }) =>
          !query || address.toLowerCase().includes(query) || name?.toLowerCase().includes(query)
        const featured = studioCollections.filter(matches)
        const recent = knownCollections.data?.filter(
          (rule) => !studioCollection(rule.sourceChain, rule.address) && matches(rule),
        )
        const isIncluded = ({ sourceChain, address }: CollectionRule) =>
          draft.collections.some(
            (rule) => rule.sourceChain === sourceChain && address.toLowerCase() === rule.address.toLowerCase(),
          )
        return (
          <>
            <V3Field>
              Search collections
              <input
                data-studio-focus
                type="search"
                value={collectionFilter}
                onChange={(event) => setCollectionFilter(event.target.value)}
                placeholder="Name or contract address"
              />
            </V3Field>
            <div role="status">
              {checkingCollection && <V3Muted>Checking collection compatibility…</V3Muted>}
              {collectionError && <V3Error id={collectionErrorId}>{collectionError}</V3Error>}
            </div>
            {draft.collections.map((rule, index) => (
              <V3Fields key={`${rule.sourceChain}:${rule.address}`}>
                <legend>{collectionName(rule)}</legend>
                {collectionLabels[`${rule.sourceChain}:${rule.address.toLowerCase()}`] && (
                  <V3Muted>{collectionLabels[`${rule.sourceChain}:${rule.address.toLowerCase()}`]}</V3Muted>
                )}
                <EditorGrid>
                  <V3Field>
                    NFT power
                    <input
                      type="number"
                      name={`collection-power-${index}`}
                      min={1}
                      max={1000000000}
                      value={rule.power}
                      onChange={(event) =>
                        onChange({
                          collections: draft.collections.map((current, i) =>
                            i === index ? { ...current, power: event.target.value } : current,
                          ),
                        })
                      }
                    />
                  </V3Field>
                  <V3Button
                    type="button"
                    $secondary
                    onClick={() => onChange({ collections: draft.collections.filter((_, i) => i !== index) })}
                  >
                    Remove collection
                  </V3Button>
                </EditorGrid>
              </V3Fields>
            ))}
            <EditorGrid aria-label="CoinCollect and partner collections">
              {featured.map((rule) => {
                const selected = isIncluded(rule)
                return (
                  <AssetChoice
                    type="button"
                    key={rule.address}
                    $selected={selected}
                    disabled={
                      selected ||
                      checkingCollection ||
                      Boolean(rule.requiresCompatibility) ||
                      draft.collections.length >= 16
                    }
                    onClick={() => void addCollection(rule.address, rule.sourceChain)}
                  >
                    <img src={rule.image} alt="" width="30" height="30" loading="lazy" />
                    <span>
                      <strong>{rule.name}</strong>
                      <small>
                        {rule.requiresCompatibility
                          ? 'Compatibility required'
                          : selected
                          ? 'Included'
                          : `Power ${rule.power}`}
                      </small>
                    </span>
                  </AssetChoice>
                )
              })}
            </EditorGrid>
            {knownCollections.loading && !knownCollections.data && <V3Muted>Finding recent V3 collections…</V3Muted>}
            {!featured.length && !recent?.length && !knownCollections.loading && (
              <V3Muted>No matching collections. Check the name or add a contract below.</V3Muted>
            )}
            {Boolean(recent?.length) && (
              <EditorGrid aria-label="Recent pool collections">
                {recent?.map((rule) => {
                  const selected = isIncluded(rule)
                  return (
                    <Choice
                      type="button"
                      key={`${rule.sourceChain}:${rule.address}`}
                      $selected={selected}
                      disabled={selected || checkingCollection || draft.collections.length >= 16}
                      onClick={() => void addCollection(rule.address, rule.sourceChain, rule.power)}
                    >
                      <strong>{rule.name || collectionName(rule)}</strong>
                      <small>{selected ? 'Included' : `Power ${rule.power}`}</small>
                    </Choice>
                  )
                })}
              </EditorGrid>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void addCollection(collectionInput, collectionChain)
              }}
            >
              <EditorGrid>
                <V3Field>
                  Collection address
                  <input
                    name="collection-address"
                    ref={collectionField}
                    value={collectionInput}
                    readOnly={checkingCollection}
                    aria-invalid={Boolean(collectionError)}
                    aria-describedby={collectionError ? collectionErrorId : undefined}
                    onChange={(event) => {
                      setCollectionInput(event.target.value)
                      setCollectionError('')
                    }}
                    placeholder="0x…"
                  />
                </V3Field>
                <V3Field>
                  Source network
                  <select
                    value={collectionChain}
                    disabled={checkingCollection}
                    onChange={(event) => {
                      setCollectionChain(event.target.value)
                      setCollectionError('')
                    }}
                  >
                    <option value="137">Polygon</option>
                    {hasRemote && <option value="8453">Base</option>}
                    {hasRemote && <option value="42161">Arbitrum One</option>}
                  </select>
                </V3Field>
              </EditorGrid>
              <V3Button type="submit" $secondary disabled={checkingCollection || draft.collections.length >= 16}>
                Add collection
              </V3Button>
            </form>
            {studio.managedCollections && (
              <V3Muted>
                ERC-1155 and remote collections require a registered transfer adapter. Set quantity limits in Manage
                before the pool starts.
              </V3Muted>
            )}
          </>
        )
      }
      case 'budget':
        return (
          <>
            <EditorGrid aria-label="Funding assets">
              {assets
                .filter((asset) => asset.canDeposit)
                .map((asset) => (
                  <AssetChoice
                    type="button"
                    key={asset.address}
                    $selected={funding?.address === asset.address}
                    aria-pressed={funding?.address === asset.address}
                    onClick={() => setFunding(asset.address)}
                  >
                    <RewardTokenIcon token={asset.symbol} tokenMeta={asset} size={30} />
                    <strong>{asset.symbol}</strong>
                  </AssetChoice>
                ))}
            </EditorGrid>
            <V3Field>
              Total budget{funding ? ` · ${funding.symbol}` : ''}
              <input
                data-studio-focus
                name="funding-budget"
                inputMode="decimal"
                value={draft.budget}
                placeholder="0"
                onChange={(event) => onChange({ budget: event.target.value })}
              />
            </V3Field>
            <V3Actions>
              {['100', '500', '1000'].map((amount) => (
                <V3Button type="button" key={amount} $secondary onClick={() => onChange({ budget: amount })}>
                  {amount}
                </V3Button>
              ))}
            </V3Actions>
            <V3Field>
              USD per funding token <small>Optional reference price</small>
              <input
                name="usd-per-token"
                inputMode="decimal"
                value={draft.usdPerFundingUnit}
                onChange={(event) => onChange({ usdPerFundingUnit: event.target.value })}
              />
            </V3Field>
          </>
        )
      case 'rewards':
        return (
          <>
            <EditorGrid aria-label="Available reward tokens">
              {assets
                .filter((asset) => asset.canReward || draft.rewards.some(({ address }) => address === asset.address))
                .map((asset) => {
                  const selected = draft.rewards.some(({ address }) => address === asset.address)
                  const disabled =
                    !selected &&
                    (draft.rewards.length >= 4 ||
                      (!directFunding && !hasSwap && !!funding && !isAddressEqual(funding.address, asset.address)))
                  return (
                    <AssetChoice
                      key={asset.address}
                      type="button"
                      $selected={selected}
                      aria-pressed={selected}
                      disabled={disabled}
                      onClick={() => {
                        if (!directFunding && !funding && !selected && asset.canDeposit) setFunding(asset.address)
                        if (directFunding || funding || hasSwap) toggleReward(asset.address)
                      }}
                    >
                      <RewardTokenIcon token={asset.symbol} tokenMeta={asset} size={30} />
                      <span>
                        <strong>{asset.symbol}</strong>
                        <small>{selected ? 'Included' : 'Add reward'}</small>
                      </span>
                    </AssetChoice>
                  )
                })}
            </EditorGrid>
            {!directFunding && !hasSwap && (
              <V3Muted>This deployment funds rewards in the same token as the budget.</V3Muted>
            )}
            {!directFunding && draft.rewards.length > 0 && (
              <>
                <Distribution aria-hidden="true">
                  {shares.map((share, index) => (
                    <Slice key={draft.rewards[index].address} $index={index} style={{ width: `${share / 100}%` }} />
                  ))}
                </Distribution>
                <V3Actions>
                  <strong>100% allocated</strong>
                  {draft.rewards.length > 1 && (
                    <V3Button
                      type="button"
                      $secondary
                      onClick={() => setRewards(draft.rewards.map(({ address }) => address))}
                    >
                      Split evenly
                    </V3Button>
                  )}
                </V3Actions>
              </>
            )}
            {!directFunding &&
              draft.rewards.map(({ address, sharePercent }, index) => {
                const reward = assetFor(address)
                if (!reward) return null
                const allocation =
                  funding && funding.decimals !== null && previewAmounts
                    ? shortAmount((previewAmounts * BigInt(shares[index])) / BigInt(10000), funding.decimals)
                    : undefined
                const daily = amountPerDay(reward.address, shares[index])
                return (
                  <RewardLane key={address}>
                    <Flex justifyContent="space-between" alignItems="center" style={{ gap: 10 }}>
                      <label htmlFor={draft.rewards.length > 1 ? `studio-share-${index}` : `studio-percent-${index}`}>
                        <Flex as="span" alignItems="center" style={{ gap: 6 }}>
                          <RewardTokenIcon token={reward.symbol} tokenMeta={reward} size={20} />
                          {reward.symbol} share
                        </Flex>
                      </label>
                      <Flex alignItems="center" style={{ gap: 5 }}>
                        <ShareInput
                          id={`studio-percent-${index}`}
                          type="text"
                          inputMode="decimal"
                          aria-label={`${reward.symbol} percentage`}
                          value={shareEntry?.address === address ? shareEntry.text : sharePercent}
                          disabled={draft.rewards.length === 1}
                          onChange={(event) => setShareEntry({ address, text: event.target.value })}
                          onBlur={() => {
                            if (shareEntry?.address === address && /^\d{1,3}(\.\d{0,2})?$/.test(shareEntry.text))
                              setShare(index, Number(shareEntry.text) * 100)
                            setShareEntry(undefined)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') event.currentTarget.blur()
                          }}
                        />
                        <span>%</span>
                      </Flex>
                    </Flex>
                    {draft.rewards.length > 1 && (
                      <input
                        id={`studio-share-${index}`}
                        name={`reward-share-${index}`}
                        type="range"
                        min={1}
                        max={10000 - draft.rewards.length + 1}
                        step={1}
                        value={shares[index]}
                        aria-valuetext={`${sharePercent}%`}
                        style={{ '--reward-share': `${sharePercent}%` } as CSSProperties}
                        onChange={(event) => setShare(index, Number(event.target.value))}
                      />
                    )}
                    <small>
                      {allocation !== undefined
                        ? `${allocation} ${funding?.symbol} allocated`
                        : 'Set a budget to calculate the allocation'}
                      {daily !== undefined && ` · ${daily} ${reward.symbol} / day`}
                    </small>
                    {allocation && daily === undefined && quote?.key === quoteKey && (
                      <V3Muted>Quote unavailable for the current tranche.</V3Muted>
                    )}
                  </RewardLane>
                )
              })}
          </>
        )
      case 'schedule':
        return (
          <>
            <V3Field>
              Start time
              <input
                data-studio-focus
                type="datetime-local"
                name="start-date"
                value={draft.startLocal}
                onChange={(event) => onChange({ startLocal: event.target.value })}
              />
            </V3Field>
            <V3Actions>
              {[
                { minutes: 15, label: 'In 15 min' },
                { minutes: 60, label: 'In 1 hour' },
                { minutes: 1440, label: 'In 24 hours' },
              ].map(({ minutes, label }) => (
                <V3Button
                  key={minutes}
                  type="button"
                  $secondary
                  onClick={() => onChange({ startLocal: localTime(minimumStart + minutes * 60_000) })}
                >
                  {label}
                </V3Button>
              ))}
            </V3Actions>
            <EditorGrid>
              <V3Field>
                Duration in days
                <input
                  type="number"
                  min={1}
                  max={1460}
                  name="duration-days"
                  value={draft.durationDays}
                  onChange={(event) => onChange({ durationDays: event.target.value })}
                />
              </V3Field>
              {!directFunding && (
                <V3Field>
                  Replenish every (hours)
                  <input
                    type="number"
                    min={1}
                    max={Math.min(720, duration * 24) || 720}
                    name="interval-hours"
                    value={draft.intervalHours}
                    onChange={(event) => onChange({ intervalHours: event.target.value })}
                  />
                </V3Field>
              )}
            </EditorGrid>
          </>
        )
      case 'limits':
        return (
          <>
            <EditorGrid>
              <V3Field>
                Wallets for full rewards
                <input
                  data-studio-focus
                  type="number"
                  min={0}
                  max={Number(draft.maxWallets)}
                  name="threshold"
                  value={draft.threshold}
                  onChange={(event) => onChange({ threshold: event.target.value })}
                />
              </V3Field>
              <V3Field>
                Maximum wallets
                <input
                  type="number"
                  min={1}
                  max={studio.capacity}
                  name="max-wallets"
                  value={draft.maxWallets}
                  onChange={(event) => onChange({ maxWallets: event.target.value })}
                />
              </V3Field>
              <V3Field>
                NFTs per wallet
                <input
                  type="number"
                  min={1}
                  max={studio.capacity}
                  name="max-nfts"
                  value={draft.maxNfts}
                  onChange={(event) => onChange({ maxNfts: event.target.value })}
                />
              </V3Field>
            </EditorGrid>
            <V3Muted>
              The ledger supports up to {studio.capacity.toLocaleString()} active NFT positions per pool.
            </V3Muted>
          </>
        )
      default:
        return null
    }
  }

  const row = (label: string, value: string, target: Panel) => (
    <RowButton type="button" disabled={locked} onClick={() => open(target)}>
      <strong>{label}</strong>
      <Flex alignItems="center" style={{ gap: 6 }}>
        <small>{value}</small>
        <ChevronRightIcon width="15px" color="textSubtle" />
      </Flex>
    </RowButton>
  )

  return (
    <Workspace>
      <Preview aria-label="Editable FarmCard">
        <NftFarmCardLayout
          variant="expanded"
          heading={
            <CardHeadingWithBanner
              lpLabel={draft.name || 'Name your pool'}
              isCommunity={poolType === 'community'}
              onEditPoolType={locked ? undefined : () => setEditingPoolType(true)}
              publishedPool={{
                banner: draft.artwork,
                status: 'UPCOMING',
                collections: draft.collections.map((rule) => ({
                  name: collectionName(rule),
                  image: studioCollection(rule.sourceChain, rule.address)?.image,
                  weight: rule.power,
                })),
              }}
              editor={{
                onArtwork: () => open('artwork'),
                onCollections: () => open('collections'),
                onSchedule: () => open('schedule'),
                title: editingName ? (
                  <NameInput
                    autoFocus
                    aria-label="Pool name"
                    name="pool-name"
                    maxLength={60}
                    value={title}
                    placeholder="Pool name"
                    onChange={(event) => setTitle(event.target.value)}
                    onBlur={saveName}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        saveName()
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        setEditingName(false)
                      }
                    }}
                  />
                ) : (
                  <InlineTitle type="button" disabled={locked} aria-label="Edit pool name" onClick={beginName}>
                    {draft.name || 'Name your pool'}
                  </InlineTitle>
                ),
              }}
            />
          }
          rewards={{ chips, onEdit: () => open('rewards') }}
          detailsInitiallyOpen
          details={{
            totalStaked: new BigNumber(0),
            editSchedule: (
              <DetailButton type="button" onClick={() => open('schedule')}>
                {scheduleText}
              </DetailButton>
            ),
            additionalDetails: (
              <>
                {row('Participation rules', `${draft.maxNfts} NFTs per wallet`, 'limits')}
                {row('Description', draft.description ? 'Edit description' : 'Add description', 'description')}
              </>
            ),
          }}
        >
          <Action>
            <StyledActionButton
              type="button"
              width="100%"
              variant="primary"
              disabled={locked}
              onClick={() => open(directFunding ? 'rewards' : 'budget')}
            >
              {directFunding
                ? 'Edit direct rewards'
                : draft.budget && funding
                ? `Budget · ${budgetText}`
                : 'Set funding budget'}
            </StyledActionButton>
          </Action>
        </NftFarmCardLayout>
      </Preview>

      <Inspector aria-label="Pool setup">
        <h2>Pool setup</h2>
        <V3Muted>Click the card to edit. Check the plan before signing.</V3Muted>
        <RowButton type="button" aria-haspopup="dialog" disabled={locked} onClick={() => setEditingPoolType(true)}>
          <strong>Pool type</strong>
          <Flex alignItems="center" style={{ gap: 6 }}>
            <small>{v3PoolTypeLabels[poolType]}</small>
            <ChevronRightIcon width="15px" color="textSubtle" />
          </Flex>
        </RowButton>
        {row(
          'Eligible NFTs',
          draft.collections.length ? `${draft.collections.length} included` : 'Add collections',
          'collections',
        )}
        {row('Reward tokens', chips.length ? chips.map(({ token }) => token).join(', ') : 'Add rewards', 'rewards')}
        {!directFunding && row('Funding budget', funding && draft.budget ? budgetText : 'Set budget', 'budget')}
        {row(
          'Schedule',
          draft.startLocal ? `${scheduleText} · ${draft.durationDays} days` : 'Choose a start',
          'schedule',
        )}
        <Launch>{launch}</Launch>
      </Inspector>

      {editingPoolType && (
        <V3PoolTypeEditor
          value={poolType}
          action="Apply to draft"
          onApply={(type) => onChange({ poolType: type })}
          onClose={() => setEditingPoolType(false)}
        />
      )}
      {panel && (
        <StudioDialog
          key={panel}
          title={panelTitles[panel]}
          close={() => {
            setShareEntry(undefined)
            setPanel(undefined)
          }}
        >
          {renderEditor()}
        </StudioDialog>
      )}
    </Workspace>
  )
}
