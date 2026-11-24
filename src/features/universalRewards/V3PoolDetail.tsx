import { studioCollection } from './assetCatalog'
import V33CollectionActions from './V33CollectionActions'
import { withV3Presentation } from './poolPresentation'
import { useCallback, useEffect, useMemo, useState, type ComponentType, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ArrowBackIcon, ChevronDownIcon } from '@pancakeswap/uikit'
import ConnectWalletButton from 'components/ConnectWalletButton'
import { useAccount, useSwitchChain } from 'wagmi'
import { isAddressEqual, type Address } from 'viem'
import { useV3Action, useV3PresentationDocument, useV3Query, useV3Wallet } from './hooks'
import {
  availableReward,
  claimPeriodMessage,
  isV3ClaimExpired,
  poolTiming,
  positionDailyEstimate,
  shortAmount,
  sourceName,
  type V3PoolCardProps,
} from './presentation'
import {
  discoverV3Nfts,
  MAX_V3_PAGE,
  nftRefKey,
  readV3Nft,
  readV3PublicPool,
  readV3PositionPage,
  readV3WalletSeats,
  type NftRef,
  type V3PoolSnapshot,
  type WalletNftSnapshot,
} from './reader'
import { createV3Client, getV3Deployment, type V3Client, type V3Deployment } from './runtime'
import { joinV3, manageV3Position, reconcileV3Position } from './transactions'
import { UINT256_MAX } from './units'
import { poolShowroomData, type V3PoolShowroomData, type V3PoolTeaser } from './poolShowroom'
import { FarmCardSlot, PoolDisclosure, PoolStage, Showroom, ShowroomSection } from './poolShowroomStyles'
import { PoolShowroomCollections, PoolShowroomCover, PoolShowroomDiscover } from './V3PoolShowroom'
import {
  V3Actions,
  V3Button,
  V3Card,
  V3Error,
  V3Field,
  V3Fields,
  V3Grid,
  V3Link,
  V3Metrics,
  V3Muted,
  V3RewardValue,
  V3Section,
} from './styles'

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
  manual.forEach((ref) => refs.set(nftRefKey(ref), ref))
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
    choices,
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
}: {
  pool: V3PoolSnapshot
  nft: WalletNftSnapshot
  onManage: (action: 'claim' | 'exit' | 'leave', rewardToken?: Address) => void
  actionDisabled: boolean
  onReconcile?: () => void
}) {
  const claimsExpired = isV3ClaimExpired(pool)
  const hasClaimable = !claimsExpired && nft.claimable.some((amount) => amount > ZERO)
  let participation = 'No active participation'
  if (poolTiming(pool) === 'Finished') participation = 'Pool ended'
  else if (onReconcile) participation = 'Recorded participation · owner changed'
  else if (nft.seated) participation = 'Participating'
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
          {nft.managed.paused
            ? 'Claims for this source are paused.'
            : 'Claims reopen when the source journal catches up.'}
        </V3Muted>
      )}
      {nft.managed && !nft.managed.released && nft.managed.sourceChainId !== POLYGON && (
        <V3Muted>Request release on the source network before claiming on Polygon.</V3Muted>
      )}
      {!nft.managed && nft.unavailable && (
        <V3Error role="status">A fresh ownership proof is required for this position.</V3Error>
      )}
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
            Reconcile recorded owner
          </V3Button>
        )}
        <V3Button
          type="button"
          disabled={actionDisabled || !nft.eligible || !hasClaimable}
          onClick={() => onManage('claim')}
        >
          Claim rewards
        </V3Button>
        {nft.managed && nft.seated && <V3Link href="#eligible-nfts">Manage quantity</V3Link>}
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

export default function V3PoolDetail({
  poolId,
  Card,
  initialPool,
  related,
  shareUrl,
}: {
  poolId: bigint
  Card: ComponentType<V3PoolCardProps>
  initialPool: V3PoolShowroomData | null
  related: V3PoolTeaser[]
  shareUrl: string
}) {
  const router = useRouter()
  const { address: account, chainId } = useAccount()
  const { switchChain, isPending: switching } = useSwitchChain()
  const client = useMemo(createV3Client, [])
  const deployment = useMemo(getV3Deployment, [])
  const getWallet = useV3Wallet(deployment?.chainId)
  const [collectionIndex, setCollectionIndex] = useState(0)
  const [collectionOffset, setCollectionOffset] = useState(ZERO)
  const [historyOffset, setHistoryOffset] = useState(ZERO)
  const [manualIds, setManualIds] = useState<Record<string, NftRef[]>>({})
  const [selectedKeys, setSelectedKeys] = useState<Record<string, string[]>>({})
  const [typedId, setTypedId] = useState('')
  const [inputError, setInputError] = useState('')
  const [walletToolsOpen, setWalletToolsOpen] = useState(false)
  const accountKey = `${poolId}:${account ?? ''}`
  const manual = useMemo(() => manualIds[accountKey] ?? [], [manualIds, accountKey])
  const selection = selectedKeys[accountKey] ?? []

  const readPool = useCallback(async () => {
    if (!deployment) throw new Error('V3 is unavailable in this environment.')
    return readV3PublicPool(client, deployment, poolId)
  }, [client, deployment, poolId])
  const result = useV3Query(deployment ? `${deployment.address}:${poolId}` : '', readPool, 20_000)
  const presentation = useV3PresentationDocument(deployment)
  const pool = useMemo(() => {
    if (!result.data) return undefined
    if (presentation) return withV3Presentation(result.data, presentation)
    return initialPool
      ? {
          ...result.data,
          presentation: {
            ...result.data.presentation,
            name: initialPool.name,
            description: initialPool.description,
            artwork: initialPool.artwork,
            poolType: initialPool.type,
          },
        }
      : result.data
  }, [result.data, presentation, initialPool])
  const overview = pool ? poolShowroomData(pool) : initialPool
  const hasPool = Boolean(pool)
  useEffect(() => {
    if (!hasPool) return undefined
    let frame: number
    const reveal = () => {
      const target = window.location.hash.slice(1)
      if (target === 'eligible-nfts' || target === 'v3-positions') setWalletToolsOpen(true)
      else if (target === 'contract') {
        const details = document.getElementById(target)
        if (details instanceof HTMLDetailsElement) details.open = true
      } else return
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const section = document.getElementById(target) ?? document.getElementById('eligible-nfts')
        section?.scrollIntoView()
      })
    }
    reveal()
    window.addEventListener('hashchange', reveal)
    router.events.on('hashChangeComplete', reveal)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('hashchange', reveal)
      router.events.off('hashChangeComplete', reveal)
    }
  }, [hasPool, router.events])
  const readNfts = useCallback(async () => {
    if (!pool || !deployment || !account) throw new Error('Connect your wallet to read eligible NFTs.')
    return loadNfts(client, deployment, pool, account, collectionIndex, collectionOffset, historyOffset, manual)
  }, [pool, deployment, account, client, collectionIndex, collectionOffset, historyOffset, manual])
  const walletData = useV3Query(
    walletToolsOpen && pool && account ? `${accountKey}:${collectionIndex}:${collectionOffset}:${historyOffset}` : '',
    readNfts,
  )
  const transaction = useV3Action(client, deployment, getWallet, account)
  const wrongChain = Boolean(account && deployment && chainId !== deployment.chainId)
  const writeDisabled = transaction.busy || transaction.unconfirmed || !getWallet || wrongChain
  const rule = pool?.collections[collectionIndex]
  const candidates = walletData.data?.choices ?? []
  const selected = candidates.filter((nft) => selection.includes(nftRefKey(nft.ref)) && nft.eligible && !nft.seated)
  const selectedPower = selected.reduce((sum, item) => sum + item.weight, 0)
  const availableSeats = pool ? BigInt(pool.config.maxNftsPerWallet) - (walletData.data?.seats ?? ZERO) : ZERO
  const eligibleToJoin = Boolean(
    pool &&
      poolTiming(pool) === 'Live' &&
      !writeDisabled &&
      selected.length > 0 &&
      selected.length <= 32 &&
      BigInt(selected.length) <= availableSeats &&
      !result.error &&
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
      setInputError('Clear checked IDs before looking up more NFTs.')
      return
    }
    setManualIds((previous) => ({ ...previous, [accountKey]: [...manual, next] }))
    setTypedId('')
    setInputError('')
  }

  const confirmJoin = async () => {
    if (!deployment || !eligibleToJoin) return
    if (
      await transaction.run(
        joinV3(
          deployment,
          poolId,
          selected.map(({ ref }) => ref),
        ),
      )
    ) {
      setSelectedKeys((previous) => ({ ...previous, [accountKey]: [] }))
      result.refresh()
    }
  }

  const manage = async (nft: WalletNftSnapshot, action: 'claim' | 'exit' | 'leave', rewardToken?: Address) => {
    if (!deployment || !pool || writeDisabled || !nft.eligible || (action !== 'leave' && isV3ClaimExpired(pool))) return
    if (await transaction.run(manageV3Position(deployment, poolId, nft.ref, action, rewardToken))) result.refresh()
  }

  return (
    <Showroom>
      <V3Actions style={{ marginBottom: 12 }}>
        <V3Link as={Link} href="/nftpools/v3">
          <ArrowBackIcon color="currentColor" width="16px" mr="5px" aria-hidden="true" />
          All V3 pools
        </V3Link>
      </V3Actions>
      {overview && <PoolShowroomCover pool={overview} url={shareUrl} hasCardHeading={hasPool} />}
      {result.error && (
        <V3Actions style={{ marginTop: 12 }}>
          <V3Error role="status">Pool data is temporarily unavailable.</V3Error>
          <V3Button type="button" $secondary onClick={result.refresh}>
            Retry
          </V3Button>
        </V3Actions>
      )}

      <ShowroomSection id="pool-farmcard" aria-labelledby="pool-rewards-title">
        <header>
          <h2 id="pool-rewards-title">Pool rewards</h2>
        </header>
        {pool && deployment ? (
          <PoolStage>
            <FarmCardSlot>
              <Card pool={pool} deployment={deployment} detail onPositionChange={result.refresh} />
            </FarmCardSlot>
            <PoolShowroomCollections collections={pool.collections} />
          </PoolStage>
        ) : (
          !result.error && <V3Muted role="status">Loading the pool card…</V3Muted>
        )}
      </ShowroomSection>

      {pool && deployment && (
        <ShowroomSection aria-label="Pool information and participation">
          <PoolDisclosure
            id="eligible-nfts"
            open={walletToolsOpen}
            onToggle={(event) => setWalletToolsOpen(event.currentTarget.open)}
          >
            <summary>
              Your NFTs and rewards <ChevronDownIcon width="20px" color="currentColor" aria-hidden="true" />
            </summary>
            <div>
              {claimPeriodMessage(pool) && <V3Muted>{claimPeriodMessage(pool)}</V3Muted>}
              {!account && (
                <div>
                  <ConnectWalletButton />
                </div>
              )}
              {wrongChain && deployment && (
                <V3Actions>
                  <V3Muted role="status">Switch to the settlement network to send transactions.</V3Muted>
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
              {account && (
                <>
                  <V3Card>
                    <div>
                      <h3>Eligible collections</h3>
                      <V3Field>
                        Collection
                        <select
                          name="collection"
                          value={collectionIndex}
                          onChange={(event) => {
                            setCollectionIndex(Number(event.target.value))
                            setCollectionOffset(ZERO)
                            setInputError('')
                          }}
                        >
                          {pool.collections.map((item, index) => {
                            const source = item.managed?.sourceChainId ?? item.sourceChainId
                            const address = item.managed?.collection ?? item.collection
                            const name = studioCollection(source, address)?.name ?? `${address.slice(0, 10)}…`
                            return (
                              <option key={`${item.sourceChainId}:${item.collection}`} value={index}>
                                {sourceName(source)} · {item.managed ? `ERC-${item.managed.standard} · ` : ''}
                                {name} · {item.weight} power
                              </option>
                            )
                          })}
                        </select>
                      </V3Field>
                      {rule?.managed ? (
                        <V33CollectionActions
                          key={rule.managed.adapter}
                          rule={rule.managed}
                          baseWeight={rule.weight}
                          client={client}
                          deployment={deployment}
                          pool={pool}
                          account={account}
                          chainId={chainId}
                          refresh={result.refresh}
                        />
                      ) : (
                        <>
                          {rule && rule.sourceChainId !== POLYGON && (
                            <V3Muted>
                              Base and Arbitrum participation requires a fresh quorum observation in the isolated
                              environment.
                            </V3Muted>
                          )}
                          <form onSubmit={addId} method="post" aria-label="Check NFT token ID">
                            <V3Actions>
                              <V3Field>
                                NFT token ID
                                <input
                                  name="token-id"
                                  value={typedId}
                                  inputMode="numeric"
                                  required
                                  maxLength={78}
                                  autoComplete="off"
                                  aria-invalid={Boolean(inputError)}
                                  aria-describedby={inputError ? 'v3-id-error' : undefined}
                                  onChange={(event) => {
                                    setTypedId(event.target.value)
                                    setInputError('')
                                  }}
                                />
                              </V3Field>
                              <V3Button type="submit" $secondary>
                                Check NFT
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
                            {inputError && (
                              <V3Error id="v3-id-error" role="status">
                                {inputError}
                              </V3Error>
                            )}
                          </form>
                          {walletData.loading && !walletData.data && (
                            <V3Muted role="status">Checking wallet ownership…</V3Muted>
                          )}
                          {walletData.error && (
                            <V3Actions>
                              <V3Error role="status">{walletData.error}</V3Error>
                              <V3Button type="button" $secondary onClick={walletData.refresh}>
                                Retry wallet check
                              </V3Button>
                            </V3Actions>
                          )}
                          {!!walletData.data && !walletData.data.enumerable && candidates.length === 0 && (
                            <V3Muted>Enter a token ID to check ownership for this collection.</V3Muted>
                          )}
                          {candidates.length > 0 && (
                            <V3Fields>
                              <legend>Select NFTs to join</legend>
                              {candidates.map((nft) => {
                                const key = nftRefKey(nft.ref)
                                const checked = selection.includes(key)
                                return (
                                  <V3Field key={key}>
                                    <V3Actions>
                                      <input
                                        name={`nft-${key}`}
                                        type="checkbox"
                                        checked={checked}
                                        disabled={
                                          !nft.eligible ||
                                          nft.seated ||
                                          (!checked && BigInt(selected.length) >= availableSeats)
                                        }
                                        onChange={() =>
                                          setSelectedKeys((previous) => ({
                                            ...previous,
                                            [accountKey]: checked
                                              ? selection.filter((id) => id !== key)
                                              : [...selection, key],
                                          }))
                                        }
                                      />
                                      #{nft.ref.tokenId.toString()} · {nft.weight} power
                                      {nft.seated && nft.eligible
                                        ? ' · Participating'
                                        : nft.unavailable
                                        ? ' · Ownership unavailable'
                                        : !nft.eligible
                                        ? ' · Owned by another wallet'
                                        : ''}
                                    </V3Actions>
                                  </V3Field>
                                )
                              })}
                            </V3Fields>
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
                                  Previous NFTs
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
                          {selected.length > 0 && (
                            <V3Metrics>
                              {pool.rewards.map((reward) => (
                                <div key={reward.token}>
                                  <dt>Estimated next 24 hours · {reward.symbol}</dt>
                                  <dd>
                                    {shortAmount(
                                      positionDailyEstimate(
                                        pool,
                                        reward,
                                        selectedPower,
                                        (walletData.data?.seats ?? ZERO) > ZERO,
                                      ),
                                      reward.decimals,
                                    )}
                                  </dd>
                                </div>
                              ))}
                            </V3Metrics>
                          )}
                          <V3Muted>Joining keeps your NFTs in your wallet and needs no NFT approval.</V3Muted>
                          <V3Button type="button" disabled={!eligibleToJoin} onClick={() => void confirmJoin()}>
                            {poolTiming(pool) === 'Live' ? 'Join with selected NFTs' : 'Joining is closed'}
                          </V3Button>
                        </>
                      )}
                    </div>
                  </V3Card>
                  <div id="v3-positions" />
                  {walletData.data && (
                    <V3Section aria-label="Your V3 positions">
                      <header>
                        <h3>Your positions</h3>
                      </header>
                      {walletData.data.positions.length === 0 && (
                        <V3Muted>No wallet positions in the records on this page.</V3Muted>
                      )}
                      <V3Grid>
                        {walletData.data.positions.map((nft) => (
                          <RewardRows
                            key={nft.key}
                            pool={pool}
                            nft={nft}
                            actionDisabled={writeDisabled}
                            onReconcile={
                              !nft.managed &&
                              pool.capacity > 32 &&
                              nft.seated &&
                              !isAddressEqual(nft.seatOwner, nft.owner)
                                ? async () => {
                                    if (
                                      !writeDisabled &&
                                      (await transaction.run(reconcileV3Position(deployment, poolId, nft.key)))
                                    )
                                      result.refresh()
                                  }
                                : undefined
                            }
                            onManage={(action, token) => void manage(nft, action, token)}
                          />
                        ))}
                      </V3Grid>
                      {(historyOffset > ZERO || walletData.data.positionTotal > BigInt(MAX_V3_PAGE)) && (
                        <V3Actions>
                          <V3Button
                            type="button"
                            $secondary
                            disabled={historyOffset === ZERO}
                            onClick={() => setHistoryOffset(historyOffset - BigInt(MAX_V3_PAGE))}
                          >
                            Previous position records
                          </V3Button>
                          <V3Button
                            type="button"
                            $secondary
                            disabled={historyOffset + BigInt(MAX_V3_PAGE) >= walletData.data.positionTotal}
                            onClick={() => setHistoryOffset(historyOffset + BigInt(MAX_V3_PAGE))}
                          >
                            More position records
                          </V3Button>
                        </V3Actions>
                      )}
                    </V3Section>
                  )}
                  <V3Muted role="status">{transaction.message}</V3Muted>
                  {transaction.error && <V3Error role="alert">{transaction.error}</V3Error>}
                  {transaction.unconfirmed && (
                    <V3Button
                      type="button"
                      $secondary
                      disabled={transaction.busy}
                      onClick={async () => {
                        if (await transaction.recheck()) result.refresh()
                      }}
                    >
                      Check confirmation
                    </V3Button>
                  )}
                  {transaction.hash &&
                    (deployment?.chainId === 137 ? (
                      <V3Link href={`https://polygonscan.com/tx/${transaction.hash}`} target="_blank" rel="noreferrer">
                        View settlement transaction
                      </V3Link>
                    ) : (
                      <V3Muted>Local transaction · {transaction.hash}</V3Muted>
                    ))}
                </>
              )}
            </div>
          </PoolDisclosure>

          <PoolDisclosure id="contract">
            <summary>
              Pool details <ChevronDownIcon width="20px" color="currentColor" aria-hidden="true" />
            </summary>
            <div>
              <V3Metrics aria-label="Recorded pool participation">
                <div>
                  <dt>Participant wallets</dt>
                  <dd>{pool.activeWallets.toLocaleString('en-US')}</dd>
                </div>
                <div>
                  <dt>Active NFTs</dt>
                  <dd>{pool.activeNfts.toLocaleString('en-US')}</dd>
                </div>
                <div>
                  <dt>Total NFT power</dt>
                  <dd>{pool.totalWeight.toLocaleString('en-US')}</dd>
                </div>
                {pool.collections.some(({ managed }) => managed?.standard === 1155) && (
                  <div>
                    <dt>Participating ERC-1155 units</dt>
                    <dd>
                      {pool.collections
                        .reduce((sum, { managed }) => (managed?.standard === 1155 ? sum + managed.units : sum), ZERO)
                        .toLocaleString('en-US')}
                    </dd>
                  </div>
                )}
              </V3Metrics>
              <V3Metrics aria-label="Reward reserves">
                {pool.rewards.map((reward) => (
                  <div key={reward.token}>
                    <dt>{reward.symbol} uncommitted reserve</dt>
                    <dd>{shortAmount(availableReward(reward), reward.decimals)}</dd>
                  </div>
                ))}
              </V3Metrics>
              {pool.funding.paused && <V3Muted role="status">Funding replenishment is paused.</V3Muted>}
              {poolTiming(pool) === 'Live' && pool.rewards.some((reward) => availableReward(reward) === ZERO) && (
                <V3Muted role="status">A reward token is awaiting replenishment.</V3Muted>
              )}
              {pool.capacity > 32 && (
                <V3Muted>Participation totals may update after an NFT transfer is verified.</V3Muted>
              )}
              {deployment.chainId === 137 ? (
                <V3Link href={`https://polygonscan.com/address/${deployment.address}`} rel="noreferrer" target="_blank">
                  View settlement contract on PolygonScan
                </V3Link>
              ) : (
                <V3Muted>Settlement contract · {deployment.address}</V3Muted>
              )}
            </div>
          </PoolDisclosure>
        </ShowroomSection>
      )}
      <PoolShowroomDiscover related={related} />
    </Showroom>
  )
}
