import { CloseIcon } from '@pancakeswap/uikit'
import ConnectWalletButton from 'components/ConnectWalletButton'
import { readNftMetadataFromUri, type V2NftMetadata } from 'features/nftPoolManager/user/nftDiscovery'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { isAddressEqual, type Address } from 'viem'
import { useAccount, useSwitchChain } from 'wagmi'
import { studioCollection } from './assetCatalog'
import { useV3Action, useV3Query, useV3Wallet } from './hooks'
import {
  WalletDialog,
  WalletDialogBody,
  WalletDialogHeading,
  WalletLookup,
  WalletNftGrid,
  WalletNftTile,
} from './poolWalletStyles'
import { claimPeriodMessage, isV3ClaimExpired, poolTiming, shortAmount, sourceName } from './presentation'
import {
  discoverV3Nfts,
  MAX_V3_PAGE,
  nftRefKey,
  readV3Nft,
  readV3NftUri,
  readV3PositionPage,
  readV3WalletSeats,
  type NftRef,
  type V3PoolSnapshot,
  type WalletNftSnapshot,
} from './reader'
import type { V3Client, V3Deployment } from './runtime'
import {
  V3Actions,
  V3Button,
  V3Error,
  V3Field,
  V3Fields,
  V3Grid,
  V3Link,
  V3Metrics,
  V3Muted,
  V3RewardValue,
} from './styles'
import { joinV3, manageV3Position, reconcileV3Position } from './transactions'
import { UINT256_MAX } from './units'
import V33CollectionActions from './V33CollectionActions'

const ZERO = BigInt(0)
const POLYGON = BigInt(137)

async function loadNfts(
  client: V3Client,
  deployment: V3Deployment,
  pool: V3PoolSnapshot,
  account: Address,
  collectionIndex: number,
  collectionOffset: bigint,
  historyOffset: bigint,
  manual: readonly NftRef[],
) {
  const rule = pool.collections[collectionIndex] ?? pool.collections[0]
  const [collection, history, seats] = await Promise.all([
    rule.sourceChainId === POLYGON && !rule.managed
      ? discoverV3Nfts(client, pool, account, rule.collection, collectionOffset)
      : Promise.resolve({ enumerable: false, total: ZERO, tokenIds: [] }),
    readV3PositionPage(client, deployment, pool, account, historyOffset),
    readV3WalletSeats(client, deployment, pool, account),
  ])
  const refs = new Map<string, NftRef>()
  for (const tokenId of collection.tokenIds) {
    const ref = { sourceChainId: rule.sourceChainId, collection: rule.collection, tokenId }
    refs.set(nftRefKey(ref), ref)
  }
  manual.forEach((ref) => {
    if (ref.sourceChainId === rule.sourceChainId && isAddressEqual(ref.collection, rule.collection))
      refs.set(nftRefKey(ref), ref)
  })
  const historyByRef = new Map(history.positions.map((position) => [nftRefKey(position.ref), position]))
  const choices = await Promise.all(
    Array.from(
      refs.values(),
      async (ref) => historyByRef.get(nftRefKey(ref)) ?? readV3Nft(client, deployment, pool, account, ref),
    ),
  )
  const positions = [...history.positions]
  for (const entry of choices) {
    if (entry.tracked && !historyByRef.has(nftRefKey(entry.ref))) positions.push(entry)
  }
  return {
    choices: await Promise.all(
      choices
        .filter(({ eligible, seated }) => eligible && !seated)
        .map(async (nft) => {
          const collection = studioCollection(nft.ref.sourceChainId, nft.ref.collection)
          const metadata =
            nft.ref.sourceChainId === POLYGON
              ? await readV3NftUri(client, nft.ref, pool.blockNumber)
                  .then(readNftMetadataFromUri)
                  .catch(() => ({} as V2NftMetadata))
              : {}
          const image =
            metadata.image && /^(https:\/\/|\/(?!\/))/.test(metadata.image) ? metadata.image : collection?.image
          return { ...nft, name: metadata.name?.trim().slice(0, 100) || collection?.name || 'NFT', image }
        }),
    ),
    enumerable: collection.enumerable,
    collectionTotal: collection.total,
    positionTotal: history.total,
    positions: positions.filter(
      (position) =>
        position.eligible ||
        (position.managed && isAddressEqual(position.managed.holder, account)) ||
        (pool.capacity > 32 && isAddressEqual(position.seatOwner, account)) ||
        (position.unavailable && isAddressEqual(position.previousOwner, account)),
    ),
    seats,
  }
}

function RewardRows({
  pool,
  nft,
  onManage,
  actionDisabled,
  onReconcile,
  onManageQuantity,
}: {
  pool: V3PoolSnapshot
  nft: WalletNftSnapshot
  onManage: (action: 'claim' | 'exit' | 'leave', rewardToken?: Address) => void
  actionDisabled: boolean
  onReconcile?: () => void
  onManageQuantity: () => void
}) {
  const claimsExpired = isV3ClaimExpired(pool)
  const hasClaimable = !claimsExpired && nft.claimable.some((amount) => amount > ZERO)
  let participation = 'Not staked'
  if (poolTiming(pool) === 'Finished') participation = 'Pool ended'
  else if (onReconcile) participation = 'Ownership changed'
  else if (nft.seated) participation = 'Staked'
  return (
    <V3Fields>
      <legend>
        {sourceName(nft.managed?.sourceChainId ?? nft.ref.sourceChainId)}{' '}
        {nft.managed ? `ERC-${nft.managed.standard}` : 'NFT'} #
        {(nft.managed?.underlyingId ?? nft.ref.tokenId).toString()}
      </legend>
      <V3Muted>
        {nft.managed?.released ? 'Released rewards' : participation} · {nft.weight} power
        {nft.managed && !nft.managed.released && ` · ${nft.managed.active} participating units`}
      </V3Muted>
      {nft.managed?.released && nft.managed.claimsReady === false && (
        <V3Muted role="status">
          {nft.managed.paused ? 'Claims for this source are paused.' : 'Your rewards are still being verified.'}
        </V3Muted>
      )}
      {nft.managed && !nft.managed.released && nft.managed.sourceChainId !== POLYGON && (
        <V3Muted>Request release on the source network before claiming on Polygon.</V3Muted>
      )}
      {!nft.managed && nft.unavailable && <V3Error role="status">Could not confirm current ownership.</V3Error>}
      <V3Metrics>
        {pool.rewards.map((reward, index) => (
          <div key={reward.token}>
            <dt>{reward.symbol} claimable</dt>
            <dd>
              <V3RewardValue key={nft.claimable[index].toString()}>
                {shortAmount(claimsExpired || !nft.eligible ? ZERO : nft.claimable[index], reward.decimals)}
              </V3RewardValue>
            </dd>
            {!claimsExpired && pool.rewards.length > 1 && nft.claimable[index] > ZERO && (
              <V3Button
                type="button"
                $secondary
                disabled={actionDisabled || !nft.eligible}
                onClick={() => onManage('claim', reward.token)}
              >
                Claim {reward.symbol}
              </V3Button>
            )}
          </div>
        ))}
      </V3Metrics>
      <V3Actions>
        {onReconcile && (
          <V3Button type="button" $secondary disabled={actionDisabled} onClick={onReconcile}>
            Refresh ownership
          </V3Button>
        )}
        <V3Button
          type="button"
          disabled={actionDisabled || !nft.eligible || !hasClaimable}
          onClick={() => onManage('claim')}
        >
          Claim rewards
        </V3Button>
        {nft.managed && nft.seated && (
          <V3Button type="button" $secondary onClick={onManageQuantity}>
            Manage NFT
          </V3Button>
        )}
        {!nft.managed && nft.seated && (
          <>
            <V3Button
              type="button"
              $secondary
              disabled={actionDisabled || !nft.eligible || claimsExpired}
              onClick={() => onManage('exit')}
            >
              Exit and claim
            </V3Button>
            <V3Button
              type="button"
              $secondary
              disabled={actionDisabled || !nft.eligible}
              onClick={() => onManage('leave')}
            >
              {claimsExpired ? 'Leave pool' : 'Leave and keep claims'}
            </V3Button>
          </>
        )}
      </V3Actions>
    </V3Fields>
  )
}

export function PoolDialogFrame({
  open,
  title,
  subtitle,
  onDismiss,
  children,
}: {
  open: boolean
  title: string
  subtitle?: string
  onDismiss: () => void
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const element = dialog.current
    if (open && element && !element.open) element.showModal()
    if (!open && element?.open) element.close()
  }, [open])
  return (
    <WalletDialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={() => {
        if (open) onDismiss()
      }}
    >
      <WalletDialogHeading>
        <div>
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <V3Button type="button" $secondary aria-label="Close" onClick={() => dialog.current?.close()}>
          <CloseIcon color="currentColor" width="18px" aria-hidden="true" />
        </V3Button>
      </WalletDialogHeading>
      <WalletDialogBody>{children}</WalletDialogBody>
    </WalletDialog>
  )
}

export default function V3PoolWalletDialog({
  open,
  initialView,
  pool,
  client,
  deployment,
  refresh,
  onDismiss,
}: {
  open: boolean
  initialView: 'nfts' | 'positions'
  pool: V3PoolSnapshot
  client: V3Client
  deployment: V3Deployment
  refresh: () => void
  onDismiss: () => void
}) {
  const { address: account, chainId } = useAccount()
  const { switchChain, isPending: switching } = useSwitchChain()
  const getWallet = useV3Wallet(deployment.chainId)
  const status = poolTiming(pool)
  const [collectionIndex, setCollectionIndex] = useState(0)
  const [collectionOffset, setCollectionOffset] = useState(ZERO)
  const [historyOffset, setHistoryOffset] = useState(ZERO)
  const [manualIds, setManualIds] = useState<Record<string, NftRef[]>>({})
  const [selectedByWallet, setSelectedByWallet] = useState<Record<string, NftRef[]>>({})
  const [typedId, setTypedId] = useState('')
  const [inputError, setInputError] = useState('')
  const startingView = status === 'Finished' ? 'positions' : initialView
  const [view, setView] = useState<'nfts' | 'positions'>(startingView)
  const accountKey = `${pool.poolId}:${account ?? ''}`
  const manual = useMemo(() => manualIds[accountKey] ?? [], [manualIds, accountKey])
  const selected = selectedByWallet[accountKey] ?? []

  useEffect(() => {
    if (open) setView(startingView)
  }, [open, startingView])

  const readNfts = useCallback(async () => {
    if (!pool || !deployment || !account) throw new Error('Connect your wallet to read eligible NFTs.')
    return loadNfts(client, deployment, pool, account, collectionIndex, collectionOffset, historyOffset, manual)
  }, [pool, deployment, account, client, collectionIndex, collectionOffset, historyOffset, manual])
  const walletData = useV3Query(
    open && status !== 'Upcoming' && account
      ? `${accountKey}:${collectionIndex}:${collectionOffset}:${historyOffset}`
      : '',
    readNfts,
  )
  const transaction = useV3Action(client, deployment, getWallet, account)
  const wrongChain = Boolean(account && deployment && chainId !== deployment.chainId)
  const writeDisabled = transaction.busy || transaction.unconfirmed || !getWallet || wrongChain
  const rule = pool?.collections[collectionIndex]
  const candidates = walletData.data?.choices ?? []
  const availableSeats = pool ? BigInt(pool.config.maxNftsPerWallet) - (walletData.data?.seats ?? ZERO) : ZERO
  const eligibleToJoin = Boolean(
    pool &&
      poolTiming(pool) === 'Live' &&
      !writeDisabled &&
      selected.length > 0 &&
      selected.length <= 32 &&
      BigInt(selected.length) <= availableSeats &&
      walletData.data &&
      !walletData.error,
  )

  const addId = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!rule || !account) return
    if (!/^\d{1,78}$/.test(typedId) || BigInt(typedId) > UINT256_MAX) {
      setInputError('Enter the numeric token ID shown in your NFT wallet.')
      event.currentTarget.querySelector('input')?.focus()
      return
    }
    const next = { sourceChainId: rule.sourceChainId, collection: rule.collection, tokenId: BigInt(typedId) }
    if (manual.some((item) => nftRefKey(item) === nftRefKey(next))) return
    if (manual.length >= MAX_V3_PAGE) {
      setInputError('Clear the checked IDs to search again.')
      return
    }
    setManualIds((previous) => ({ ...previous, [accountKey]: [...manual, next] }))
    setTypedId('')
    setInputError('')
  }

  const confirmJoin = async () => {
    if (!deployment || !eligibleToJoin) return
    if (await transaction.run(joinV3(deployment, pool.poolId, selected))) {
      setSelectedByWallet((previous) => ({ ...previous, [accountKey]: [] }))
      refresh()
    }
  }

  const manage = async (nft: WalletNftSnapshot, action: 'claim' | 'exit' | 'leave', rewardToken?: Address) => {
    if (!deployment || !pool || writeDisabled || !nft.eligible || (action !== 'leave' && isV3ClaimExpired(pool))) return
    if (await transaction.run(manageV3Position(deployment, pool.poolId, nft.ref, action, rewardToken))) refresh()
  }

  const chooseCollection = (index: number) => {
    setCollectionIndex(index)
    setCollectionOffset(ZERO)
    setTypedId('')
    setInputError('')
  }
  const positions = walletData.data?.positions ?? []
  const hasManagedCollections = pool.collections.some(({ managed }) => Boolean(managed))
  const start = new Date(Number(pool.config.start) * 1000)

  return (
    <PoolDialogFrame
      open={open}
      title={status === 'Upcoming' ? 'Staking opens soon' : view === 'positions' ? 'Your positions' : 'Select NFTs'}
      subtitle={pool.presentation.name}
      onDismiss={onDismiss}
    >
      {status === 'Upcoming' ? (
        <V3Muted>
          Come back when staking opens
          {Number.isFinite(start.getTime()) && (
            <>
              {' '}
              on <time dateTime={start.toISOString()}>{start.toLocaleString()}</time>
            </>
          )}
          .
        </V3Muted>
      ) : !account ? (
        <V3Actions>
          <ConnectWalletButton />
        </V3Actions>
      ) : (
        <>
          {((status === 'Live' && positions.length > 0) || (hasManagedCollections && status === 'Finished')) && (
            <V3Actions aria-label="Wallet view">
              <V3Button
                type="button"
                $secondary={view !== 'nfts'}
                aria-pressed={view === 'nfts'}
                onClick={() => setView('nfts')}
              >
                {status === 'Finished' ? 'Manage NFTs' : 'Select NFTs'}
              </V3Button>
              <V3Button
                type="button"
                $secondary={view !== 'positions'}
                aria-pressed={view === 'positions'}
                onClick={() => setView('positions')}
              >
                Your positions
              </V3Button>
            </V3Actions>
          )}
          {walletData.loading && !walletData.data && <V3Muted role="status">Looking for your NFTs…</V3Muted>}
          {walletData.error && (
            <V3Actions>
              <V3Error role="status">Could not load your NFTs.</V3Error>
              <V3Button type="button" $secondary onClick={walletData.refresh}>
                Try again
              </V3Button>
            </V3Actions>
          )}
          {wrongChain && (view === 'positions' || !rule?.managed) && (
            <V3Actions>
              <V3Button
                type="button"
                $secondary
                disabled={switching}
                onClick={() => switchChain({ chainId: deployment.chainId })}
              >
                Switch network
              </V3Button>
            </V3Actions>
          )}
          {view === 'nfts' && rule && (
            <>
              {(pool.collections.length > 1 || rule.managed) && (
                <V3Field>
                  Collection
                  <select value={collectionIndex} onChange={(event) => chooseCollection(Number(event.target.value))}>
                    {pool.collections.map((item, index) => {
                      const { sourceChainId, collection } = item.managed ?? item
                      const name = studioCollection(sourceChainId, collection)?.name ?? 'NFT collection'
                      return (
                        <option key={nftRefKey({ ...item, tokenId: ZERO })} value={index}>
                          {name} · {sourceName(sourceChainId)}
                        </option>
                      )
                    })}
                  </select>
                </V3Field>
              )}
              {rule.managed ? (
                <V33CollectionActions
                  key={`${account}:${rule.managed.adapter}`}
                  rule={rule.managed}
                  baseWeight={rule.weight}
                  client={client}
                  deployment={deployment}
                  pool={pool}
                  account={account}
                  chainId={chainId}
                  refresh={refresh}
                  active={open}
                />
              ) : (
                status === 'Live' && (
                  <>
                    {candidates.length > 0 && (
                      <WalletNftGrid aria-label="Eligible NFTs">
                        {candidates.map((nft) => {
                          const key = nftRefKey(nft.ref)
                          const checked = selected.some((ref) => nftRefKey(ref) === key)
                          return (
                            <WalletNftTile key={key} data-selected={checked}>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={transaction.busy || (!checked && BigInt(selected.length) >= availableSeats)}
                                onChange={() =>
                                  setSelectedByWallet((previous) => {
                                    const current = previous[accountKey] ?? []
                                    const next = checked
                                      ? current.filter((ref) => nftRefKey(ref) !== key)
                                      : [...current, nft.ref]
                                    return { ...previous, [accountKey]: next }
                                  })
                                }
                              />
                              <img
                                src={nft.image || '/images/nfts/no-profile-md.png'}
                                alt=""
                                width={128}
                                height={128}
                                loading="lazy"
                                onError={(event) => {
                                  const image = event.currentTarget
                                  if (!image.src.endsWith('/images/nfts/no-profile-md.png'))
                                    image.src = '/images/nfts/no-profile-md.png'
                                }}
                              />
                              <strong>
                                {nft.name} #{nft.ref.tokenId.toString()}
                              </strong>
                              <small>{nft.weight} power</small>
                            </WalletNftTile>
                          )
                        })}
                      </WalletNftGrid>
                    )}
                    {walletData.data && !walletData.loading && !walletData.error && !candidates.length && (
                      <V3Muted>
                        {manual.length
                          ? 'No eligible NFTs found for those IDs.'
                          : 'No eligible NFTs found in this collection.'}
                      </V3Muted>
                    )}
                    {walletData.data &&
                      (collectionOffset > ZERO || walletData.data.collectionTotal > BigInt(MAX_V3_PAGE)) && (
                        <V3Actions>
                          <V3Button
                            type="button"
                            $secondary
                            disabled={collectionOffset === ZERO}
                            onClick={() => setCollectionOffset(collectionOffset - BigInt(MAX_V3_PAGE))}
                          >
                            Previous
                          </V3Button>
                          <V3Button
                            type="button"
                            $secondary
                            disabled={collectionOffset + BigInt(MAX_V3_PAGE) >= walletData.data.collectionTotal}
                            onClick={() => setCollectionOffset(collectionOffset + BigInt(MAX_V3_PAGE))}
                          >
                            More NFTs
                          </V3Button>
                        </V3Actions>
                      )}
                    <WalletLookup>
                      <summary>Find by token ID</summary>
                      <form onSubmit={addId} aria-label="Find NFT by token ID">
                        <V3Field>
                          NFT token ID
                          <input
                            inputMode="numeric"
                            maxLength={78}
                            autoComplete="off"
                            required
                            value={typedId}
                            aria-invalid={Boolean(inputError)}
                            onChange={(event) => {
                              setTypedId(event.target.value)
                              setInputError('')
                            }}
                          />
                        </V3Field>
                        <V3Actions>
                          <V3Button type="submit" $secondary>
                            Find NFT
                          </V3Button>
                          {manual.length > 0 && (
                            <V3Button
                              type="button"
                              $secondary
                              onClick={() => setManualIds((previous) => ({ ...previous, [accountKey]: [] }))}
                            >
                              Clear checked IDs
                            </V3Button>
                          )}
                        </V3Actions>
                        {inputError && <V3Error role="alert">{inputError}</V3Error>}
                      </form>
                    </WalletLookup>
                    <V3Button type="button" disabled={!eligibleToJoin} onClick={() => void confirmJoin()}>
                      {selected.length
                        ? `Stake ${selected.length} NFT${selected.length === 1 ? '' : 's'}`
                        : 'Stake NFTs'}
                    </V3Button>
                  </>
                )
              )}
            </>
          )}
          {view === 'positions' && (
            <>
              {claimPeriodMessage(pool) && <V3Muted>{claimPeriodMessage(pool)}</V3Muted>}
              {walletData.data && !positions.length && <V3Muted>No positions in this pool yet.</V3Muted>}
              <V3Grid>
                {positions.map((nft) => (
                  <RewardRows
                    key={nft.key}
                    pool={pool}
                    nft={nft}
                    actionDisabled={writeDisabled}
                    onManageQuantity={() => {
                      const index = pool.collections.findIndex(
                        ({ sourceChainId, collection }) =>
                          sourceChainId === nft.ref.sourceChainId && isAddressEqual(collection, nft.ref.collection),
                      )
                      if (index >= 0) chooseCollection(index)
                      setView('nfts')
                    }}
                    onReconcile={
                      !nft.managed && pool.capacity > 32 && nft.seated && !isAddressEqual(nft.seatOwner, nft.owner)
                        ? async () => {
                            if (
                              !writeDisabled &&
                              (await transaction.run(reconcileV3Position(deployment, pool.poolId, nft.key)))
                            )
                              refresh()
                          }
                        : undefined
                    }
                    onManage={(action, token) => void manage(nft, action, token)}
                  />
                ))}
              </V3Grid>
              {walletData.data && (historyOffset > ZERO || walletData.data.positionTotal > BigInt(MAX_V3_PAGE)) && (
                <V3Actions>
                  <V3Button
                    type="button"
                    $secondary
                    disabled={historyOffset === ZERO}
                    onClick={() => setHistoryOffset(historyOffset - BigInt(MAX_V3_PAGE))}
                  >
                    Previous
                  </V3Button>
                  <V3Button
                    type="button"
                    $secondary
                    disabled={historyOffset + BigInt(MAX_V3_PAGE) >= walletData.data.positionTotal}
                    onClick={() => setHistoryOffset(historyOffset + BigInt(MAX_V3_PAGE))}
                  >
                    More positions
                  </V3Button>
                </V3Actions>
              )}
            </>
          )}
          {transaction.message && <V3Muted role="status">{transaction.message}</V3Muted>}
          {transaction.error && <V3Error role="alert">{transaction.error}</V3Error>}
          {transaction.unconfirmed && (
            <V3Button
              type="button"
              $secondary
              disabled={transaction.busy}
              onClick={async () => {
                if (await transaction.recheck()) refresh()
              }}
            >
              Check confirmation
            </V3Button>
          )}
          {transaction.hash && deployment.chainId === 137 && (
            <V3Link href={`https://polygonscan.com/tx/${transaction.hash}`} target="_blank" rel="noreferrer">
              View transaction
            </V3Link>
          )}
        </>
      )}
    </PoolDialogFrame>
  )
}
