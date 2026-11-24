import { useCallback, useEffect, useId, useState, type FormEvent } from 'react'
import { Button, CheckmarkCircleFillIcon, Flex, Text } from '@pancakeswap/uikit'
import styled from 'styled-components'
import type { Address } from 'viem'
import { useAccount, useSwitchChain } from 'wagmi'
import { useTranslation } from 'contexts/Localization'
import { readNftMetadataFromUri } from 'features/nftPoolManager/user/nftDiscovery'
import { useV3Query, type useV3Action } from 'features/universalRewards/hooks'
import { WalletLookup } from 'features/universalRewards/poolWalletStyles'
import { poolTiming, positionDailyEstimate, shortAmount, sourceName } from 'features/universalRewards/presentation'
import {
  canStakeV3Nft,
  discoverV3Nfts,
  MAX_V3_PAGE,
  nftRefKey,
  readV3NftBalance,
  readV3NftUri,
  readV3WalletSeats,
  type NftRef,
  type V3PoolSnapshot,
} from 'features/universalRewards/reader'
import type { V3Client, V3Deployment } from 'features/universalRewards/runtime'
import { joinV3 } from 'features/universalRewards/transactions'
import { UINT256_MAX } from 'features/universalRewards/units'
import V33CollectionActions from 'features/universalRewards/V33CollectionActions'
import { walletOfOwnerApi } from 'state/nftMarket/helpers'
import NftSelectionModal from '../NftSelectionModal'

const POLYGON = BigInt(137)
const ZERO = BigInt(0)
const PLACEHOLDER = '/images/nfts/no-profile-md.png'

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: space-between;
  margin-bottom: 14px;

  select {
    flex: 1;
    min-width: min(160px, 100%);
    max-width: 100%;
  }
`

const Filter = styled.select`
  min-height: 44px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 12px;
  padding: 0 12px;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.input};
`

const CollectionSection = styled.section`
  margin-bottom: 12px;
  padding: clamp(10px, 2.5vw, 16px);
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.background};

  &[hidden] {
    display: none;
  }

  &:last-child {
    margin-bottom: 0;
  }
`

const CollectionHeading = styled.div`
  display: flex;
  min-width: 0;
  gap: 9px;
  align-items: center;
  margin-bottom: 12px;
  color: ${({ theme }) => theme.colors.text};

  img {
    border-radius: 8px;
    object-fit: cover;
    flex: none;
  }
  h3 {
    font-weight: 750;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }
  small {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.textSubtle};
    font-size: 12px;
  }
`

const TileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (min-width: 560px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

const Tile = styled.label`
  position: relative;
  display: grid;
  align-content: start;
  min-width: 0;
  gap: 5px;
  padding: 5px 5px 9px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 12px;
  background: ${({ theme }) => theme.modal.background};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;

  &[data-selected='true'] {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 1px ${({ theme }) => theme.colors.primary};
  }
  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
  &[data-disabled='true'] {
    cursor: default;
  }
  @media (hover: hover) {
    &:hover:not([data-disabled='true']) {
      border-color: ${({ theme }) => theme.colors.primary};
    }
  }
  @media (prefers-reduced-motion: no-preference) {
    transition: border-color 140ms ease, box-shadow 140ms ease;
  }
  img {
    width: 100%;
    aspect-ratio: 1;
    height: auto;
    object-fit: cover;
    border-radius: 8px;
  }
  strong,
  small {
    padding-inline: 4px;
    overflow-wrap: anywhere;
  }
  strong {
    font-size: 14px;
    line-height: 1.25;
  }
  small {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.textSubtle};
  }
  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
  svg {
    position: absolute;
    top: 9px;
    right: 9px;
    border: 2px solid ${({ theme }) => theme.modal.background};
    border-radius: 50%;
    background: ${({ theme }) => theme.modal.background};
  }
`

const Lookup = styled(WalletLookup)`
  margin-top: 10px;
  summary {
    min-height: 44px;
    align-content: center;
  }
  input {
    width: 100%;
  }
`

const BrowseMore = styled(Button)`
  width: 100%;
  min-height: 44px;
  margin-top: 10px;
`

const ManagedSection = styled.details`
  margin-bottom: 12px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 16px;
  padding: 0 12px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};

  &[hidden] {
    display: none;
  }

  summary {
    padding-block: 14px;
    cursor: pointer;
    font-weight: 700;
  }
  &[open] {
    padding-bottom: 12px;
  }
`

const Summary = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;

  span {
    color: ${({ theme }) => theme.colors.textSubtle};
  }
`

const ReviewSelection = styled.button`
  min-height: 44px;
  padding: 2px 8px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  font-weight: 700;
  cursor: pointer;

  &[aria-expanded='true'] {
    border-color: ${({ theme }) => theme.colors.primary};
  }
  &:disabled {
    cursor: default;
  }
`

type Collection = { name: string; image?: string }
type Choice = { ref: NftRef; name: string; image?: string; weight: number; collectionName: string }

type StakeContext = {
  client: V3Client
  deployment: V3Deployment
  pool: V3PoolSnapshot
  account: Address
}

type GalleryGroup = {
  rule: V3PoolSnapshot['collections'][number]
  collection: Collection
}

async function loadChoice(context: StakeContext, group: GalleryGroup, tokenId: bigint): Promise<Choice | undefined> {
  const { client, deployment, pool, account } = context
  const { rule, collection } = group
  const ref = { sourceChainId: rule.sourceChainId, collection: rule.collection, tokenId }
  if (!(await canStakeV3Nft(client, deployment, pool, account, ref))) return undefined
  const metadata =
    ref.sourceChainId === POLYGON
      ? await readV3NftUri(client, ref, pool.blockNumber)
          .then(readNftMetadataFromUri)
          .catch(() => undefined)
      : undefined
  return {
    ref,
    name: metadata?.name || collection.name,
    image: metadata?.image || collection.image,
    weight: rule.weight,
    collectionName: collection.name,
  }
}

async function loadPage(context: StakeContext, group: GalleryGroup, offset: bigint, pageSize: number) {
  const { client, deployment, pool, account } = context
  const { rule } = group
  const inventory =
    rule.sourceChainId === POLYGON
      ? await discoverV3Nfts(client, pool, account, rule.collection, offset, pageSize)
      : { enumerable: false, total: ZERO, tokenIds: [] }
  let { tokenIds, total } = inventory
  if (!inventory.enumerable && rule.sourceChainId === POLYGON && deployment.chainId === Number(POLYGON)) {
    const indexed = await walletOfOwnerApi(account, [rule.collection], {
      maxPages: 5,
      signal: AbortSignal.timeout?.(4_000),
    })
    const ids = indexed
      .filter(
        (nft) =>
          nft.collectionAddress.toLowerCase() === rule.collection.toLowerCase() &&
          nft.tokenId.isInteger() &&
          !nft.tokenId.isNegative(),
      )
      .map((nft) => BigInt(nft.tokenId.toFixed(0)))
      .filter((id) => id <= UINT256_MAX)
    total = BigInt(ids.length)
    tokenIds = ids.slice(Number(offset), Number(offset) + pageSize)
  }
  const choices = await Promise.all(tokenIds.map((tokenId) => loadChoice(context, group, tokenId)))
  return {
    choices: choices.filter((choice): choice is Choice => Boolean(choice)),
    more: offset + BigInt(pageSize) < total,
    complete: inventory.enumerable,
  }
}

type TileSelection = {
  selected: Record<string, Choice>
  blocked: boolean
  full: boolean
  toggle: (choice: Choice) => void
}

function StakeTile({
  choice,
  selection,
  showCollection = false,
}: {
  choice: Choice
  selection: TileSelection
  showCollection?: boolean
}) {
  const { t } = useTranslation()
  const checked = Boolean(selection.selected[nftRefKey(choice.ref)])
  const disabled = selection.blocked || (!checked && selection.full)
  const power = t('%power% Power', { power: choice.weight })
  return (
    <Tile data-selected={checked} data-disabled={disabled}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={`${choice.name} #${choice.ref.tokenId} · ${power}`}
        onChange={() => selection.toggle(choice)}
      />
      <img
        src={choice.image || PLACEHOLDER}
        alt=""
        width={160}
        height={160}
        loading="lazy"
        onError={(event) => {
          if (!event.currentTarget.src.endsWith(PLACEHOLDER)) event.currentTarget.src = PLACEHOLDER
        }}
      />
      {checked && <CheckmarkCircleFillIcon width="24px" color="primary" aria-hidden="true" />}
      <strong title={choice.name}>#{choice.ref.tokenId.toString()}</strong>
      <small>{showCollection ? `${choice.collectionName} · ${power}` : power}</small>
    </Tile>
  )
}

function DirectCollection({
  context,
  group,
  hidden,
  pageSize,
  selection,
}: {
  context: StakeContext
  group: GalleryGroup
  hidden: boolean
  pageSize: number
  selection: TileSelection
}) {
  const { t } = useTranslation()
  const heading = useId()
  const [offset, setOffset] = useState(ZERO)
  const [earlier, setEarlier] = useState<Choice[]>([])
  const [manual, setManual] = useState<Choice[]>([])
  const [typed, setTyped] = useState('')
  const [lookup, setLookup] = useState<'loading' | 'missing' | 'invalid' | 'error'>()
  const read = useCallback(() => loadPage(context, group, offset, pageSize), [context, group, offset, pageSize])
  const page = useV3Query(offset.toString(), read)
  const choices = [
    ...new Map(
      [...earlier, ...manual, ...(page.data?.choices ?? [])].map((choice) => [nftRefKey(choice.ref), choice]),
    ).values(),
  ]
  const selectedCount = choices.filter((choice) => selection.selected[nftRefKey(choice.ref)]).length
  const checkToken = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (lookup === 'loading' || selection.blocked) return
    if (!/^\d{1,78}$/.test(typed) || BigInt(typed) > UINT256_MAX || manual.length >= MAX_V3_PAGE) {
      setLookup('invalid')
      return
    }
    setLookup('loading')
    try {
      const choice = await loadChoice(context, group, BigInt(typed))
      if (!choice) {
        setLookup('missing')
        return
      }
      setManual((previous) => [...previous.filter(({ ref }) => ref.tokenId !== choice.ref.tokenId), choice])
      setTyped('')
      setLookup(undefined)
    } catch {
      setLookup('error')
    }
  }
  return (
    <CollectionSection hidden={hidden} aria-labelledby={heading}>
      <CollectionHeading>
        {group.collection.image && <img src={group.collection.image} alt="" width={34} height={34} />}
        <div>
          <h3 id={heading}>{group.collection.name}</h3>
          {choices.length > 0 && (
            <small>
              {page.data?.complete && !page.data.more
                ? t('%count% eligible', { count: choices.length })
                : t('%count% shown', { count: choices.length })}
              {selectedCount > 0 && ` · ${t('%count% selected', { count: selectedCount })}`}
            </small>
          )}
        </div>
      </CollectionHeading>
      {choices.length > 0 && (
        <TileGrid>
          {choices.map((choice) => (
            <StakeTile key={nftRefKey(choice.ref)} choice={choice} selection={selection} />
          ))}
        </TileGrid>
      )}
      {page.loading && (
        <Text small color="textSubtle" role="status">
          {t('Finding your NFTs…')}
        </Text>
      )}
      {page.error && (
        <BrowseMore variant="secondary" onClick={page.refresh}>
          {t('Retry loading NFTs')}
        </BrowseMore>
      )}
      {page.data?.more && (
        <BrowseMore
          variant="secondary"
          disabled={page.loading || selection.blocked}
          aria-label={t('Show more NFTs from %collection%', { collection: group.collection.name })}
          onClick={() => {
            setEarlier(choices)
            setOffset(offset + BigInt(pageSize))
          }}
        >
          {t('Show more NFTs')}
        </BrowseMore>
      )}
      {!page.loading && !page.error && !page.data?.more && choices.length === 0 && (
        <Text small color="textSubtle">
          {t('No eligible NFTs found in this collection.')}
        </Text>
      )}
      <Lookup>
        <summary>{t('Find by token ID')}</summary>
        <form onSubmit={(event) => void checkToken(event)} aria-label={t('Check NFT token ID')}>
          <Flex alignItems="center" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Filter
              as="input"
              aria-label={t('NFT token ID')}
              style={{ flex: '1 1 125px', width: 'auto' }}
              inputMode="numeric"
              placeholder={t('NFT token ID')}
              value={typed}
              maxLength={78}
              onChange={(event) => {
                setTyped(event.target.value)
                setLookup(undefined)
              }}
              disabled={lookup === 'loading'}
              required
            />
            <Button type="submit" variant="secondary" disabled={lookup === 'loading' || selection.blocked}>
              {t('Check NFT')}
            </Button>
          </Flex>
          {lookup === 'loading' && (
            <Text small role="status">
              {t('Checking your NFT…')}
            </Text>
          )}
          {lookup === 'missing' && (
            <Text small role="status">
              {t('No eligible NFT was found for this ID.')}
            </Text>
          )}
          {lookup === 'invalid' && (
            <Text small role="alert" color="failure">
              {t('Enter a valid NFT token ID. You can check up to %count% IDs.', { count: MAX_V3_PAGE })}
            </Text>
          )}
          {lookup === 'error' && (
            <Text small role="alert" color="failure">
              {t('Could not check this NFT. Try again.')}
            </Text>
          )}
        </form>
      </Lookup>
    </CollectionSection>
  )
}

function ManagedCollection({
  context,
  group,
  hidden,
  defaultOpen,
  blocked,
  onBusyChange,
  refresh,
}: {
  context: StakeContext
  group: GalleryGroup
  hidden: boolean
  defaultOpen: boolean
  blocked: boolean
  onBusyChange: (id: string, busy: boolean) => void
  refresh: () => void
}) {
  const { t } = useTranslation()
  const { chainId } = useAccount()
  const [open, setOpen] = useState(defaultOpen)
  const { managed, weight } = group.rule
  const id = group.rule.collection.toLowerCase()
  const reportBusy = useCallback((busy: boolean) => onBusyChange(id, busy), [id, onBusyChange])
  if (!managed) return null
  return (
    <ManagedSection hidden={hidden} open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        {group.collection.name} · {t('Choose quantity')}
      </summary>
      <V33CollectionActions
        {...context}
        rule={managed}
        baseWeight={weight}
        chainId={chainId}
        refresh={refresh}
        active={open && !hidden}
        blocked={blocked}
        stakeOnly
        onBusyChange={reportBusy}
      />
    </ManagedSection>
  )
}

export default function V3StakeSelection({
  title,
  client,
  deployment,
  pool,
  collections,
  account,
  action,
  onSuccess,
  onDismiss,
  onBusyChange,
}: StakeContext & {
  title: string
  collections: readonly Collection[]
  action: ReturnType<typeof useV3Action>
  onSuccess: (close?: boolean) => void
  onDismiss: () => void
  onBusyChange: (busy: boolean) => void
}) {
  const { t } = useTranslation()
  const { chainId } = useAccount()
  const { switchChainAsync, isPending: switching } = useSwitchChain()
  const selectionPanelId = useId()
  const [openedPool] = useState(pool)
  const [filter, setFilter] = useState('all')
  const [selectedOnly, setSelectedOnly] = useState(false)
  const [selected, setSelected] = useState<Record<string, Choice>>({})
  const [managedBusy, setManagedBusy] = useState<string>()
  const [switchFailed, setSwitchFailed] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [groups] = useState(() =>
    pool.collections.map((rule, index) => ({
      rule,
      collection: collections[index] ?? { name: sourceName(rule.sourceChainId) },
    })),
  )
  const readWallet = useCallback(async () => {
    const block = await client.getBlock()
    const snapshot = { ...openedPool, blockNumber: block.number, timestamp: block.timestamp }
    const [count, ...balances] = await Promise.all([
      readV3WalletSeats(client, deployment, snapshot, account),
      ...groups.map(({ rule }) =>
        rule.managed || rule.sourceChainId !== POLYGON
          ? Promise.resolve(undefined)
          : readV3NftBalance(client, account, rule.collection, block.number).catch(() => undefined),
      ),
    ])
    return { count: Number(count), balances, context: { client, deployment, pool: snapshot, account } }
  }, [account, client, deployment, groups, openedPool])
  const wallet = useV3Query(`${deployment.address}:${pool.poolId}:${account}:stake`, readWallet)
  const context = wallet.data?.context
  const items = Object.values(selected)
  const seats = wallet.data?.count
  const openSlots = seats === undefined ? undefined : Math.max(0, pool.config.maxNftsPerWallet - seats - items.length)
  const blocked = action.busy || action.unconfirmed || Boolean(managedBusy) || switching
  const full = openSlots === 0 || items.length === 32
  const wrongChain = chainId !== deployment.chainId
  const visible = groups.filter((_, index) => wallet.data?.balances[index] !== ZERO)
  const showFilter = Boolean(
    wallet.data &&
      visible.length > 1 &&
      (visible.length > 3 ||
        wallet.data.balances.some((balance) => balance === undefined) ||
        wallet.data.balances.reduce<bigint>((sum, balance) => sum + (balance ?? ZERO), ZERO) > BigInt(12)),
  )
  const reportManaged = useCallback((id: string, busy: boolean) => {
    setManagedBusy((previous) => (busy ? id : previous === id ? undefined : previous))
  }, [])
  const subflowBusy = Boolean(managedBusy) || switching
  useEffect(() => onBusyChange(subflowBusy), [onBusyChange, subflowBusy])
  const refresh = () => {
    wallet.refresh()
    onSuccess(false)
  }
  const toggle = (choice: Choice) => {
    if (blocked) return
    const key = nftRefKey(choice.ref)
    setSelected((previous) => {
      if (!previous[key]) {
        const limit = Math.min(32, pool.config.maxNftsPerWallet - (seats ?? 0))
        return Object.keys(previous).length >= limit ? previous : { ...previous, [key]: choice }
      }
      const copy = { ...previous }
      delete copy[key]
      return copy
    })
  }
  const selection: TileSelection = { selected, blocked, full, toggle }
  const hasDirect = visible.some(({ rule }) => !rule.managed)
  const power = items.reduce((sum, item) => sum + item.weight, 0)
  const canStake = Boolean(
    wallet.data &&
      !wallet.error &&
      items.length &&
      wallet.data.count + items.length <= pool.config.maxNftsPerWallet &&
      poolTiming(pool) === 'Live',
  )
  const confirm = async () => {
    if (blocked || !canStake) return
    if (wrongChain) {
      setSwitchFailed(false)
      try {
        await switchChainAsync({ chainId: deployment.chainId })
      } catch {
        setSwitchFailed(true)
      }
      return
    }
    setAttempted(true)
    if (
      await action.run(
        joinV3(
          deployment,
          pool.poolId,
          items.map(({ ref }) => ref),
        ),
      )
    )
      onSuccess()
  }
  const summary = (
    <>
      {hasDirect && (
        <Summary>
          <ReviewSelection
            type="button"
            aria-expanded={selectedOnly}
            aria-controls={selectedOnly ? selectionPanelId : undefined}
            disabled={!items.length && !selectedOnly}
            onClick={() => setSelectedOnly((previous) => !previous)}
          >
            {selectedOnly ? t('Back to gallery') : t('%count% selected', { count: items.length })}
          </ReviewSelection>
          <span role="status" aria-atomic="true">
            {power > 0 && `${t('%power% Power', { power })} · `}
            {openSlots === 1
              ? t('1 slot left')
              : openSlots !== undefined && t('%count% slots left', { count: openSlots })}
          </span>
        </Summary>
      )}
      {power > 0 && (
        <Text small color="textSubtle">
          {t('Estimated next 24 hours')} ·{' '}
          {pool.rewards
            .map(
              (reward) =>
                `${shortAmount(positionDailyEstimate(pool, reward, power, Boolean(seats)), reward.decimals)} ${
                  reward.symbol
                }`,
            )
            .join(' · ')}
        </Text>
      )}
      {switchFailed && (
        <Text small color="failure" role="alert">
          {t('Switch to the settlement network in your wallet and try again.')}
        </Text>
      )}
      {attempted && action.error && (
        <Text small color="failure" role="alert">
          {action.error}
        </Text>
      )}
      {attempted && action.message && (
        <Text small role="status">
          {action.message}
        </Text>
      )}
      {action.unconfirmed && (
        <Button
          type="button"
          scale="sm"
          variant="text"
          disabled={action.busy}
          onClick={async () => {
            if (await action.recheck()) onSuccess()
          }}
        >
          {t('Retry on-chain verification')}
        </Button>
      )}
    </>
  )
  return (
    <NftSelectionModal
      title={title}
      initialFocus
      pending={blocked && !action.unconfirmed}
      disabled={blocked || !canStake}
      confirmLabel={
        wrongChain
          ? t('Switch network')
          : items.length === 1
          ? t('Stake 1 NFT')
          : items.length > 1
          ? t('Stake %count% NFTs', { count: items.length })
          : t('Stake NFTs')
      }
      onDismiss={onDismiss}
      onConfirm={hasDirect ? () => void confirm() : undefined}
      gallery={{
        label: t('Eligible NFTs'),
        summary,
        content: (
          <>
            {showFilter && (
              <Toolbar>
                <Filter
                  aria-label={t('Filter by collection')}
                  value={filter}
                  disabled={blocked}
                  onChange={(event) => {
                    setFilter(event.target.value)
                    setSelectedOnly(false)
                  }}
                >
                  <option value="all">{t('All collections')}</option>
                  {visible.map(({ collection, rule }) => (
                    <option key={rule.collection} value={rule.collection}>
                      {collection.name}
                    </option>
                  ))}
                </Filter>
              </Toolbar>
            )}
            {wallet.loading && !wallet.data && (
              <Text role="status" color="textSubtle">
                {t('Finding your NFTs…')}
              </Text>
            )}
            {wallet.error && (
              <Button variant="secondary" onClick={wallet.refresh}>
                {t('Retry loading wallet')}
              </Button>
            )}
            {wallet.data && visible.length === 0 && (
              <Text color="textSubtle">{t('You don’t have any eligible NFTs for this pool.')}</Text>
            )}
            {selectedOnly && (
              <CollectionSection id={selectionPanelId} aria-label={t('Selected NFTs')}>
                {items.length ? (
                  <TileGrid>
                    {items.map((choice) => (
                      <StakeTile key={nftRefKey(choice.ref)} choice={choice} selection={selection} showCollection />
                    ))}
                  </TileGrid>
                ) : (
                  <Text small color="textSubtle">
                    {t('No NFTs selected')}
                  </Text>
                )}
              </CollectionSection>
            )}
            {context &&
              visible.map((group) => {
                const { rule } = group
                const hidden = selectedOnly || (showFilter && filter !== 'all' && filter !== rule.collection)
                return rule.managed ? (
                  <ManagedCollection
                    key={rule.collection}
                    context={context}
                    group={group}
                    hidden={hidden}
                    defaultOpen={visible.length === 1}
                    refresh={refresh}
                    blocked={
                      action.busy ||
                      action.unconfirmed ||
                      switching ||
                      Boolean(managedBusy && managedBusy !== rule.collection.toLowerCase())
                    }
                    onBusyChange={reportManaged}
                  />
                ) : (
                  <DirectCollection
                    key={rule.collection}
                    context={context}
                    group={group}
                    hidden={hidden}
                    pageSize={groups.length > 1 ? 4 : MAX_V3_PAGE}
                    selection={selection}
                  />
                )
              })}
          </>
        ),
      }}
    />
  )
}
