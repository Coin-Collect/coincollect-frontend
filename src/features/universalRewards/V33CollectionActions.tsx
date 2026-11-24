import { readNftMetadataFromUri } from 'features/nftPoolManager/user/nftDiscovery'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  createPublicClient,
  encodeFunctionData,
  getAbiItem,
  http,
  isAddressEqual,
  keccak256,
  parseEventLogs,
  zeroAddress,
  type Address,
} from 'viem'
import { useSwitchChain } from 'wagmi'
import { finalizedNftJournalAbi, managedNftCollectionAbi, nftSourceJournalAbi } from './abi'
import { studioCollection } from './assetCatalog'
import { useV3Action, useV3Query, useV3Wallet } from './hooks'
import { managedBatchAbi, type ManagedExit } from './managedBatch'
import ManagedBatchExit from './ManagedBatchExit'
import { managedSourceChains } from './managedChains'
import {
  discoverManagedIds,
  managed1155Abi,
  managed721Abi,
  SETTLEMENT_SOURCE,
  type ManagedCollection,
} from './managedNfts'
import { poolTiming, shortAmount, sourceName, positionDailyEstimate } from './presentation'
import type { V3PoolSnapshot, WalletNftSnapshot } from './reader'
import { isV3MissingSelector, type V3Client, type V3Deployment } from './runtime'
import { V3Actions, V3Button, V3Error, V3Field, V3Fields, V3Muted } from './styles'
import { UINT256_MAX } from './units'
import { WalletLookup, WalletNftGrid, WalletNftTile } from './poolWalletStyles'

const ZERO = BigInt(0)

type Props = {
  rule: ManagedCollection
  baseWeight: number
  client: V3Client
  deployment: V3Deployment
  pool: V3PoolSnapshot
  account: Address
  chainId?: number
  refresh: () => void
  active?: boolean
  positions?: readonly WalletNftSnapshot[]
  stakeOnly?: boolean
  blocked?: boolean
  onBusyChange?: (busy: boolean) => void
}

export default function V33CollectionActions({
  rule,
  baseWeight,
  client,
  deployment,
  pool,
  account,
  chainId,
  refresh,
  active = true,
  positions = [],
  stakeOnly = false,
  blocked = false,
  onBusyChange,
}: Props) {
  const local = rule.sourceChainId === SETTLEMENT_SOURCE
  const [enteredId, setEnteredId] = useState('')
  const [tokenId, setTokenId] = useState<bigint>()
  const [quantity, setQuantity] = useState('1')
  const [error, setError] = useState('')
  const [request, setRequest] = useState<bigint>()
  const [extraBatchChoices, setExtraBatchChoices] = useState<ReadonlyMap<bigint, bigint>>(new Map())
  const chain = managedSourceChains.find(({ id }) => BigInt(id) === rule.sourceChainId)
  const sourceClient = useMemo(
    () =>
      chain &&
      createPublicClient({
        transport: http(chain.rpcUrls.default.http[0], { timeout: 8_000 }),
        pollingInterval: 2_000,
      }),
    [chain],
  )
  const targetChain = local ? deployment.chainId : chain?.id
  const wallet = useV3Wallet(targetChain)
  const { switchChain, isPending: switching } = useSwitchChain()

  const readExitLimit = useCallback(async () => {
    try {
      const limit = await client.readContract({
        address: rule.adapter,
        abi: managedBatchAbi,
        functionName: 'batchExitLimit',
      })
      return limit > ZERO && limit <= BigInt(16) ? Number(limit) : 0
    } catch (failure) {
      if (isV3MissingSelector(failure)) return 0
      throw failure
    }
  }, [client, rule.adapter])
  const exitLimit = useV3Query(
    active && !stakeOnly && local && rule.standard === 1155 ? rule.adapter : '',
    readExitLimit,
  )
  const batchLimit = exitLimit.data ?? 0

  const readOwnership = useCallback(async () => {
    if (tokenId === undefined) throw Error('Check a token ID first.')
    const source = local ? client : sourceClient
    if (!source) throw Error('This preview has no isolated source network configured.')
    if ((await source.getChainId()) !== targetChain) throw Error('The source RPC is on a different chain.')
    const position = { address: rule.adapter, abi: managedNftCollectionAbi }
    const id = await client.readContract({
      ...position,
      functionName: 'positionId',
      args: [pool.poolId, tokenId, account, false],
    })
    const [[entitled, active], owned] = await Promise.all([
      client.readContract({ ...position, functionName: 'positions', args: [id] }),
      rule.standard === 1155
        ? source.readContract({
            address: rule.collection,
            abi: managed1155Abi,
            functionName: 'balanceOf',
            args: [account, tokenId],
          })
        : source
            .readContract({ address: rule.collection, abi: managed721Abi, functionName: 'ownerOf', args: [tokenId] })
            .then((owner) => (isAddressEqual(owner, account) ? BigInt(1) : ZERO)),
    ])
    let sourceDeployment: V3Deployment | undefined
    if (!local && rule.journal && rule.journal !== zeroAddress && chain) {
      const target = { address: rule.journal, abi: nftSourceJournalAbi }
      const [code, collection, ledger, standard] = await Promise.all([
        source.getCode({ address: rule.journal }),
        source.readContract({ ...target, functionName: 'collection' }),
        source.readContract({ ...target, functionName: 'settlementLedger' }),
        source.readContract({ ...target, functionName: 'standard' }),
      ])
      if (
        !code ||
        !isAddressEqual(collection, rule.collection) ||
        !isAddressEqual(ledger, deployment.address) ||
        standard !== rule.standard
      )
        throw Error('The source journal does not match the verified pool.')
      sourceDeployment = { address: rule.journal, chainId: chain.id, runtimeHash: keccak256(code) }
    }
    return { id, owned, entitled, active, sourceDeployment }
  }, [tokenId, client, rule, pool.poolId, account, local, sourceClient, chain, deployment.address, targetChain])
  const loadInventory = useCallback(async () => {
    const source = local ? client : sourceClient
    if (!source || (await source.getChainId()) !== targetChain) return []
    return discoverManagedIds(source, rule, account)
  }, [local, client, sourceClient, rule, account, targetChain])
  const inventory = useV3Query(active ? `${account}:${rule.adapter}` : '', loadInventory)
  const loadArtwork = useCallback(async () => {
    const source = local ? client : sourceClient
    if (!source || tokenId === undefined || (await source.getChainId()) !== targetChain) return undefined
    const uri =
      rule.standard === 1155
        ? (
            await source.readContract({
              address: rule.collection,
              abi: managed1155Abi,
              functionName: 'uri',
              args: [tokenId],
            })
          ).replace(/\{id\}/g, tokenId.toString(16).padStart(64, '0'))
        : await source.readContract({
            address: rule.collection,
            abi: managed721Abi,
            functionName: 'tokenURI',
            args: [tokenId],
          })
    return readNftMetadataFromUri(uri)
  }, [local, client, sourceClient, tokenId, targetChain, rule])
  const artwork = useV3Query(!active || tokenId === undefined ? '' : `${rule.collection}:${tokenId}`, loadArtwork)
  const ownership = useV3Query(
    !active || tokenId === undefined ? '' : `${account}:${rule.adapter}:${tokenId}`,
    readOwnership,
    15_000,
  )
  const action = useV3Action(
    local ? client : sourceClient ?? client,
    local ? deployment : ownership.data?.sourceDeployment,
    wallet,
    account,
  )
  const busy = action.busy || switching
  useEffect(() => {
    onBusyChange?.(busy)
  }, [busy, onBusyChange])
  const { refresh: refreshOwnership } = ownership
  const readProgress = useCallback(async () => {
    if (!rule.journal || local || request === undefined) return 'pending'
    const verifier = await client.readContract({
      address: rule.adapter,
      abi: managedNftCollectionAbi,
      functionName: 'journal',
    })
    const [, next] = await client.readContract({
      address: verifier,
      abi: finalizedNftJournalAbi,
      functionName: 'streams',
      args: [rule.adapter],
    })
    if (next <= request) return 'pending'
    const block = await client.getBlockNumber()
    const lookback = BigInt(3_000)
    const skipped = await client.getLogs({
      address: verifier,
      event: getAbiItem({ abi: finalizedNftJournalAbi, name: 'IntentSkipped' }),
      args: { adapter: rule.adapter, sequence: request },
      fromBlock: block > lookback ? block - lookback : ZERO,
      toBlock: block,
    })
    refreshOwnership()
    return skipped.length > 0 ? 'skipped' : 'processed'
  }, [client, rule, local, request, refreshOwnership])
  const progress = useV3Query(!active || request === undefined ? '' : request.toString(), readProgress, 10_000)

  const check = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!/^\d{1,78}$/.test(enteredId) || BigInt(enteredId) > UINT256_MAX) {
      setError('Enter a valid NFT token ID.')
      event.currentTarget.querySelector('input')?.focus()
      return
    }
    setError('')
    const id = BigInt(enteredId)
    if (id === tokenId) ownership.refresh()
    setTokenId(id)
  }

  const submit = async (operation: 'join' | 'exit' | 'release') => {
    if (blocked || tokenId === undefined || !ownership.data || !wallet || targetChain !== chainId || rule.paused) return
    const amount = rule.standard === 721 ? 1 : /^\d{1,10}$/.test(quantity) ? Number(quantity) : NaN
    if (operation !== 'release' && (!Number.isSafeInteger(amount) || amount < 1 || amount > 4_294_967_295)) {
      setError('Enter a positive whole quantity.')
      return
    }
    if (
      operation === 'join' &&
      (amount + ownership.data.active > rule.limit || BigInt(amount + ownership.data.active) > ownership.data.owned)
    ) {
      setError('Choose a quantity within your verified balance and the participating unit limit.')
      return
    }
    if (operation === 'exit' && BigInt(amount) > ownership.data.entitled) {
      setError('Choose at most your current entitled quantity.')
      return
    }
    setError('')
    const receipt = local
      ? await action.run({
          to: rule.adapter,
          data:
            operation === 'join'
              ? encodeFunctionData({
                  abi: managedNftCollectionAbi,
                  functionName: 'join',
                  args: [pool.poolId, tokenId, amount],
                })
              : encodeFunctionData({
                  abi: managedNftCollectionAbi,
                  functionName: 'exit',
                  args: [pool.poolId, tokenId, BigInt(amount)],
                }),
        })
      : ownership.data.sourceDeployment &&
        (await action.run({
          to: ownership.data.sourceDeployment.address,
          data: encodeFunctionData({
            abi: nftSourceJournalAbi,
            functionName: 'request',
            args: [
              operation === 'join' ? 1 : operation === 'exit' ? 2 : 3,
              pool.poolId,
              tokenId,
              operation === 'release' ? 0 : amount,
            ],
          }),
        }))
    recordReceipt(receipt || undefined)
  }

  const recordReceipt = (receipt: Awaited<ReturnType<typeof action.recheck>>) => {
    if (!receipt) return
    if (!local && ownership.data?.sourceDeployment) {
      const address = ownership.data?.sourceDeployment.address
      const [intent] = parseEventLogs({
        abi: nftSourceJournalAbi,
        eventName: 'Observation',
        logs: receipt.logs.filter((log) => isAddressEqual(log.address, address)),
      })
      if (intent) setRequest(intent.args.sequence)
    }
    ownership.refresh()
    refresh()
  }

  const data = ownership.data
  const collection = studioCollection(rule.sourceChainId, rule.collection)
  const tokenImage =
    artwork.data?.image && /^(https:\/\/|\/(?!\/))/.test(artwork.data.image) ? artwork.data.image : undefined
  const ended = pool.claimDeadline !== undefined && pool.timestamp >= pool.claimDeadline
  const ready = Boolean(data && wallet && !blocked && !action.busy && !action.unconfirmed && !ended && !rule.paused)
  const additional = /^\d{1,9}$/.test(quantity) ? Number(quantity) : 0
  const estimate =
    data &&
    additional > 0 &&
    additional + data.active <= rule.limit &&
    BigInt(additional + data.active) <= data.owned &&
    poolTiming(pool) === 'Live'
  const batchChoices = new Map(extraBatchChoices)
  for (const { managed, eligible, ref } of positions) {
    if (!managed || managed.released || !eligible || !isAddressEqual(ref.collection, rule.adapter)) continue
    if (managed.entitled > ZERO) batchChoices.set(managed.underlyingId, managed.entitled)
    else batchChoices.delete(managed.underlyingId)
  }
  const canAddToken = Boolean(
    batchLimit &&
      tokenId !== undefined &&
      data &&
      data.entitled > ZERO &&
      data.owned >= data.entitled &&
      !batchChoices.has(tokenId),
  )
  const submitBatch = async (selections: readonly ManagedExit[], onConfirmed: () => void) => {
    if (!wallet || !local || chainId !== targetChain || ended || rule.paused || selections.length > batchLimit) return
    setError('')
    await action.runMany(async () => [
      {
        to: rule.adapter,
        data: encodeFunctionData({ abi: managedBatchAbi, functionName: 'exitBatch', args: [pool.poolId, selections] }),
        confirmationLabel: `Unstake · ${selections.length} NFT IDs`,
        onConfirmed: () => {
          onConfirmed()
          setExtraBatchChoices(new Map())
          ownership.refresh()
          refresh()
        },
      },
    ])
  }
  return (
    <V3Fields>
      <legend>{collection?.name ?? 'Your NFTs'}</legend>
      {!local && (!sourceClient || rule.paused) && (
        <V3Muted role="status">NFTs from this network are temporarily unavailable.</V3Muted>
      )}
      {batchLimit > 0 && !ended && batchChoices.size > 0 && (
        <ManagedBatchExit
          choices={batchChoices}
          limit={batchLimit}
          disabled={switching || action.busy || action.unconfirmed || Boolean(rule.paused) || !wallet}
          needsNetwork={chainId !== targetChain}
          onSwitch={() => switchChain({ chainId: deployment.chainId })}
          onConfirm={submitBatch}
        />
      )}
      {!!inventory.data?.length && (
        <WalletNftGrid aria-label="Your NFTs in this collection">
          {inventory.data.map((id) => (
            <WalletNftTile key={id.toString()} data-selected={tokenId === id}>
              <input
                type="radio"
                name="managed-nft"
                checked={tokenId === id}
                onChange={() => {
                  setEnteredId(id.toString())
                  setTokenId(id)
                }}
              />
              <img
                src={(tokenId === id ? tokenImage : undefined) || collection?.image || '/images/nfts/no-profile-md.png'}
                alt=""
                width={128}
                height={128}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <strong>#{id.toString()}</strong>
              <small>
                {baseWeight} power{rule.standard === 1155 && ' each'}
              </small>
            </WalletNftTile>
          ))}
        </WalletNftGrid>
      )}
      {inventory.loading && <V3Muted role="status">Looking for your NFTs…</V3Muted>}
      <WalletLookup>
        <summary>Find by token ID</summary>
        <form method="post" onSubmit={check} aria-label="Check managed NFT ownership">
          <V3Actions>
            <V3Field>
              NFT token ID
              <input
                name="managed-token-id"
                inputMode="numeric"
                required
                maxLength={78}
                value={enteredId}
                onChange={(event) => {
                  setEnteredId(event.target.value)
                  setError('')
                }}
              />
            </V3Field>
            <V3Button type="submit" $secondary>
              Check NFT
            </V3Button>
          </V3Actions>
        </form>
      </WalletLookup>
      {ownership.loading && !data && <V3Muted role="status">Checking your NFT…</V3Muted>}
      {ownership.error && <V3Error role="status">Could not confirm NFT ownership. Check the ID and try again.</V3Error>}
      {data && (
        <>
          {artwork.data?.image && /^(https:\/\/|\/(?!\/))/.test(artwork.data.image) && (
            <img
              src={artwork.data.image}
              alt={artwork.data.name ?? ''}
              width={64}
              height={64}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          )}
          <V3Muted>
            #{tokenId?.toString()} · {data.owned.toString()} owned · {data.active} staked · {data.active * baseWeight}{' '}
            power
          </V3Muted>
          {rule.standard === 1155 && (
            <V3Field>
              {stakeOnly ? 'Quantity to stake' : 'Quantity to stake or unstake'}
              <input
                name="managed-quantity"
                inputMode="numeric"
                maxLength={10}
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value)
                  setError('')
                }}
              />
            </V3Field>
          )}
          {canAddToken && tokenId !== undefined && (
            <V3Button
              type="button"
              $secondary
              disabled={action.busy || action.unconfirmed || ended}
              onClick={() => setExtraBatchChoices((previous) => new Map(previous).set(tokenId, data.entitled))}
            >
              Add NFT #{tokenId.toString()} to Unstake selection
            </V3Button>
          )}
          {estimate && (
            <V3Muted>
              Estimated next 24 hours ·{' '}
              {pool.rewards
                .map(
                  (reward) =>
                    `${shortAmount(
                      positionDailyEstimate(pool, reward, additional * baseWeight, data.active > 0),
                      reward.decimals,
                    )} ${reward.symbol}`,
                )
                .join(' · ')}
            </V3Muted>
          )}
          {targetChain && chainId !== targetChain ? (
            <V3Button
              type="button"
              disabled={blocked || switching}
              onClick={() => switchChain({ chainId: targetChain })}
            >
              Switch to {sourceName(rule.sourceChainId)}
            </V3Button>
          ) : (
            <V3Actions>
              <V3Button
                type="button"
                disabled={!ready || poolTiming(pool) !== 'Live'}
                onClick={() => void submit('join')}
              >
                {rule.standard === 1155 && additional > 0
                  ? `Stake ${additional} NFT${additional === 1 ? '' : 's'}`
                  : 'Stake NFT'}
              </V3Button>
              {!stakeOnly && (
                <V3Button
                  type="button"
                  $secondary
                  disabled={!ready || data.entitled === ZERO}
                  onClick={() => void submit('exit')}
                >
                  Unstake
                </V3Button>
              )}
              {!stakeOnly && !local && (
                <V3Button
                  type="button"
                  $secondary
                  disabled={!ready || data.entitled === ZERO}
                  onClick={() => void submit('release')}
                >
                  Request rewards
                </V3Button>
              )}
            </V3Actions>
          )}
        </>
      )}
      {(error || action.error || progress.error) && (
        <V3Error role="status">{error || action.error || progress.error}</V3Error>
      )}
      {request !== undefined ? (
        <V3Muted role="status">
          {progress.data === 'skipped' &&
            'The request could not be applied. Check your balance and pool status, then try again.'}
          {progress.data === 'processed' && 'Request completed. Check your position for the result.'}
          {(!progress.data || progress.data === 'pending') && 'Request confirmed. Your position is being updated.'}
        </V3Muted>
      ) : (
        action.message && <V3Muted role="status">{action.message}</V3Muted>
      )}
      {action.unconfirmed && (
        <V3Button
          type="button"
          $secondary
          disabled={action.busy}
          onClick={async () => recordReceipt(await action.recheck())}
        >
          Check transaction again
        </V3Button>
      )}
    </V3Fields>
  )
}
