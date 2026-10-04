import { useEffect, useMemo, useRef, useState } from 'react'
import { AutoRenewIcon, Button, Flex, Modal, Text } from '@pancakeswap/uikit'
import { BigNumber } from '@ethersproject/bignumber'
import { formatUnits } from '@ethersproject/units'
import { Contract } from '@ethersproject/contracts'
import type { Provider } from '@ethersproject/providers'
import styled from 'styled-components'
import useWeb3React from 'hooks/useWeb3React'
import { useTranslation } from 'contexts/Localization'
import type { PublicV2Pool } from '../../publication'
import { readV2NftMetadata, readV2OwnedNfts } from '../nftDiscovery'
import { usePublishedV2UserPosition } from '../hooks'
import {
  ConfirmedV2WriteVerificationError,
  emergencyWithdrawV2Position,
  approveV2PoolCollection,
  stakeV2Nfts,
  unstakeV2Nfts,
} from '../transactions'
import { notifyV2UserPositionChanged } from '../hooks'
import type { V2NftTuple, V2UserCollection, V2UserPosition } from '../types'

export type V2PoolActionMode = 'stake' | 'unstake' | 'emergency'

interface V2PoolActionModalProps {
  pool: PublicV2Pool
  mode: V2PoolActionMode
  onSuccess: () => Promise<void>
}

const ModalContent = styled.div`
  width: min(100%, 560px);
  max-height: min(78vh, 760px);
  overflow-y: auto;
`

const CollectionBlock = styled.div`
  padding: 14px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 14px;
  margin-top: 12px;
  background: ${({ theme }) => theme.colors.background};
`

const NftRow = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 6px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.cardBorder};
  cursor: pointer;
`

const TokenIdInput = styled.input`
  min-width: 0;
  height: 42px;
  flex: 1;
  padding: 0 12px;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.input};
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 10px;
`

type SelectedNft = { collectionAddress: string; tokenId: string; weight: string; name: string; image?: string }

function nftKey(nft: Pick<SelectedNft, 'collectionAddress' | 'tokenId'>) {
  return `${nft.collectionAddress.toLowerCase()}:${BigNumber.from(nft.tokenId).toString()}`
}

function fromStakedNft(nft: V2NftTuple): SelectedNft {
  return {
    collectionAddress: nft.collectionAddress,
    tokenId: nft.tokenId,
    weight: nft.weight,
    name: nft.collectionName,
    image: nft.collectionImage,
  }
}

export default function V2PoolActionModal({
  pool,
  mode,
  onSuccess,
  onDismiss,
}: V2PoolActionModalProps & { onDismiss?: () => void }) {
  const { t } = useTranslation()
  const { account: connectedAccount, chainId, library } = useWeb3React()
  const account = connectedAccount || ''
  const provider = library as Provider | undefined
  const signer = useMemo(() => (account && library ? library.getSigner(account) : undefined), [account, library])
  const {
    position,
    error: positionError,
    loading,
    refresh,
  } = usePublishedV2UserPosition(pool, account, chainId, provider)
  const [inventory, setInventory] = useState<Record<string, string[]>>({})
  const [tokenMetadata, setTokenMetadata] = useState<Record<string, { name?: string; image?: string }>>({})
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [manualIds, setManualIds] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Record<string, SelectedNft>>({})
  const [inventoryErrors, setInventoryErrors] = useState<Record<string, string>>({})
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [pendingVerification, setPendingVerification] = useState<ConfirmedV2WriteVerificationError>()
  const [refreshPending, setRefreshPending] = useState(false)
  const [forfeitConfirmed, setForfeitConfirmed] = useState(false)
  const actionLock = useRef(false)
  const unstakeSelectionInitialized = useRef<string>()
  const inventoryLoadedFor = useRef<{ key: string; provider?: Provider }>()
  const configuredCollections = position?.collections || []
  const configuredCollectionsRef = useRef(configuredCollections)
  configuredCollectionsRef.current = configuredCollections
  const inventoryRequestKey = [
    pool.id,
    account.toLowerCase(),
    chainId || '',
    configuredCollections
      .map((item) => `${item.address.toLowerCase()}:${item.weight}:${item.name}:${item.image || ''}`)
      .join('|'),
  ].join(':')
  const metadataItems = configuredCollections
    .flatMap((collection) =>
      (inventory[collection.address.toLowerCase()] || []).slice(0, 24).map((tokenId) => ({
        address: collection.address,
        tokenId,
        key: `${collection.address.toLowerCase()}:${tokenId}`,
      })),
    )
    .slice(0, 24)
  const metadataRequestKey = [
    pool.id,
    account.toLowerCase(),
    chainId || '',
    metadataItems.map((item) => item.key).join('|'),
  ].join(':')
  const metadataLoadedFor = useRef<{ key: string; provider?: Provider }>()

  useEffect(() => {
    if (mode !== 'stake' || !account || !provider || !position) {
      if (!account || !provider) {
        inventoryLoadedFor.current = undefined
        setInventory({})
        setTokenMetadata({})
        setSelected({})
        setInventoryErrors({})
        setInventoryLoading(false)
      }
      return undefined
    }
    const previouslyLoaded = inventoryLoadedFor.current
    if (previouslyLoaded?.key === inventoryRequestKey && previouslyLoaded.provider === provider) return undefined
    inventoryLoadedFor.current = { key: inventoryRequestKey, provider }
    let active = true
    setInventoryLoading(true)
    setInventory({})
    setTokenMetadata({})
    setSelected({})
    setInventoryErrors({})
    Promise.all(
      configuredCollectionsRef.current
        .map(
          (item) =>
            ({
              address: item.address,
              name: item.name,
              image: item.image,
              weight: item.weight,
            } as V2UserCollection),
        )
        .map(async (collection) => {
          try {
            const result = await readV2OwnedNfts(provider, collection.address, account)
            return [collection.address.toLowerCase(), result] as const
          } catch (cause) {
            return [
              collection.address.toLowerCase(),
              cause instanceof Error ? cause : new Error(String(cause)),
            ] as const
          }
        }),
    ).then((results) => {
      if (!active) return
      const nextInventory: Record<string, string[]> = {}
      const nextErrors: Record<string, string> = {}
      results.forEach(([address, result]) => {
        if (result instanceof Error) nextErrors[address] = result.message
        else {
          nextInventory[address] = result.tokenIds
          if (!result.complete && result.message) nextErrors[address] = result.message
        }
      })
      setInventory(nextInventory)
      setInventoryErrors(nextErrors)
      setInventoryLoading(false)
    })
    return () => {
      active = false
    }
  }, [mode, pool.id, inventoryRequestKey, account, chainId, provider, Boolean(position)])

  useEffect(() => {
    if (mode !== 'stake' || !account || !provider) {
      if (!account || !provider) {
        metadataLoadedFor.current = undefined
        setTokenMetadata({})
      }
      return undefined
    }
    const previous = metadataLoadedFor.current
    if (previous?.key === metadataRequestKey && previous.provider === provider) return undefined
    metadataLoadedFor.current = { key: metadataRequestKey, provider }
    let active = true
    setTokenMetadata({})
    Promise.all(
      metadataItems.map(async (item) => ({
        key: item.key,
        metadata: await readV2NftMetadata(provider, item.address, item.tokenId),
      })),
    ).then((items) => {
      if (active) setTokenMetadata(Object.fromEntries(items.map(({ key, metadata }) => [key, metadata])))
    })
    return () => {
      active = false
    }
  }, [mode, account, provider, metadataRequestKey])

  useEffect(() => {
    if (mode !== 'unstake' || !position) return
    const key = `${pool.id}:${account.toLowerCase()}`
    if (unstakeSelectionInitialized.current === key) return
    unstakeSelectionInitialized.current = key
    setSelected(
      Object.fromEntries(
        position.collections.flatMap((collection) =>
          collection.staked.map((nft) => {
            const selectedNft = fromStakedNft(nft)
            return [nftKey(selectedNft), selectedNft]
          }),
        ),
      ),
    )
  }, [mode, pool.id, account, position])

  const selectedNfts = useMemo(() => {
    const currentWeights = new Map(
      configuredCollections.map((collection) => [collection.address.toLowerCase(), collection.weight]),
    )
    return Object.values(selected).map((nft) => ({
      ...nft,
      weight: currentWeights.get(nft.collectionAddress.toLowerCase()) || nft.weight,
    }))
  }, [selected, configuredCollections])
  const toggle = (nft: SelectedNft) => {
    const key = nftKey(nft)
    setSelected((current) => {
      const next = { ...current }
      if (next[key]) delete next[key]
      else next[key] = nft
      return next
    })
  }

  const readSelectedOwners = async (items: SelectedNft[]) => {
    if (!provider) throw new Error('Connected wallet did not provide a read connection.')
    return Promise.all(
      items.map(
        (item) =>
          new Contract(item.collectionAddress, ['function ownerOf(uint256) view returns (address)'], provider).ownerOf(
            item.tokenId,
          ) as Promise<string>,
      ),
    )
  }

  const addManualIds = async (collection: V2UserCollection) => {
    setError(undefined)
    setInventoryErrors((current) => ({ ...current, [collection.address.toLowerCase()]: '' }))
    try {
      if (!provider || !account) throw new Error('Reconnect the wallet before checking NFT ownership.')
      const result = await readV2OwnedNfts(provider, collection.address, account, {
        manualTokenIds: manualIds[collection.address.toLowerCase()] || '',
      })
      const newItems = result.tokenIds.map((tokenId) => ({
        collectionAddress: collection.address,
        tokenId,
        weight: collection.weight,
        name: collection.name,
        image: collection.image,
      }))
      setInventory((current) => ({
        ...current,
        [collection.address.toLowerCase()]: Array.from(
          new Set([...(current[collection.address.toLowerCase()] || []), ...result.tokenIds]),
        ),
      }))
      setSelected((current) => ({ ...current, ...Object.fromEntries(newItems.map((item) => [nftKey(item), item])) }))
      setManualIds((current) => ({ ...current, [collection.address.toLowerCase()]: '' }))
    } catch (cause) {
      setInventoryErrors((current) => ({
        ...current,
        [collection.address.toLowerCase()]: cause instanceof Error ? cause.message : String(cause),
      }))
    }
  }

  const completeAction = async (operation: () => Promise<{ transactionHash: string }>, successText: string) => {
    if (actionLock.current) return
    actionLock.current = true
    setWorking(true)
    setError(undefined)
    setNotice(undefined)
    try {
      const result = await operation()
      setNotice(`${successText} · ${result.transactionHash.slice(0, 10)}…`)
      try {
        await onSuccess()
        const updated = await refresh()
        if (!updated) throw new Error('Position data is not available yet.')
      } catch {
        setRefreshPending(true)
        setNotice('Transaction confirmed; position refresh is pending. Do not submit this transaction again.')
        return
      }
      if (mode !== 'stake' || successText === 'NFTs staked') onDismiss?.()
    } catch (cause) {
      if (cause instanceof ConfirmedV2WriteVerificationError) {
        setPendingVerification(cause)
        setNotice(`${cause.message} Do not submit this transaction again.`)
        notifyV2UserPositionChanged()
        void onSuccess().catch(() => undefined)
        return
      }
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      actionLock.current = false
      setWorking(false)
    }
  }

  const retryConfirmedVerification = async () => {
    if ((!pendingVerification && !refreshPending) || actionLock.current) return
    actionLock.current = true
    setWorking(true)
    setError(undefined)
    try {
      if (pendingVerification) await pendingVerification.verifyAgain()
      const updated = await refresh()
      if (!updated) throw new Error('Position data is not available yet.')
      setPendingVerification(undefined)
      setRefreshPending(false)
      setNotice(t('Confirmed transaction and on-chain position are now verified.'))
      onDismiss?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      actionLock.current = false
      setWorking(false)
    }
  }

  const onApprove = (collection: V2UserCollection) =>
    completeAction(() => {
      if (!signer || !account) throw new Error('Reconnect the wallet before approving this collection.')
      return approveV2PoolCollection(
        { signer, poolAddress: pool.address, poolRecord: pool, account },
        collection.address,
      )
    }, `${collection.name} approved`)

  const onStake = async () => {
    setError(undefined)
    try {
      if (!signer || !account) throw new Error('Reconnect the wallet before staking.')
      const current = await refresh()
      if (!current) throw new Error('Could not refresh the pool position before staking.')
      const owners = await readSelectedOwners(selectedNfts)
      await completeAction(
        () =>
          stakeV2Nfts(
            { signer, poolAddress: pool.address, poolRecord: pool, account },
            current,
            selectedNfts.map(({ collectionAddress, tokenId }) => ({ collectionAddress, tokenId })),
            owners,
          ),
        'NFTs staked',
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  const onUnstake = () =>
    completeAction(async () => {
      if (!signer || !account) throw new Error('Reconnect the wallet before withdrawing.')
      const current = await refresh()
      if (!current) throw new Error('Could not refresh the pool position before withdrawing.')
      return unstakeV2Nfts(
        { signer, poolAddress: pool.address, poolRecord: pool, account },
        current,
        selectedNfts.map(({ collectionAddress, tokenId }) => ({ collectionAddress, tokenId })),
      )
    }, 'NFTs withdrawn')

  const onEmergency = () =>
    completeAction(async () => {
      if (!signer || !account) throw new Error('Reconnect the wallet before emergency withdrawal.')
      const current = await refresh()
      if (!current) throw new Error('Could not refresh the pool position before emergency withdrawal.')
      return emergencyWithdrawV2Position(
        { signer, poolAddress: pool.address, poolRecord: pool, account },
        current,
        forfeitConfirmed,
      )
    }, 'Emergency withdrawal confirmed')

  const title = mode === 'stake' ? t('Stake NFTs') : mode === 'unstake' ? t('Withdraw NFTs') : t('Emergency withdrawal')
  const actionsBlocked = Boolean(pendingVerification || refreshPending)

  return (
    <Modal
      title={title}
      onDismiss={() => {
        if (!actionsBlocked) onDismiss?.()
      }}
    >
      <ModalContent>
        {!account || !provider ? (
          <Text role="alert" color="failure">
            {t('Wallet disconnected. Reconnect it, then reopen this action.')}
          </Text>
        ) : mode === 'emergency' ? (
          <>
            <Text mb="12px">
              {t('This returns every NFT in your position. Any pending primary and side rewards are forfeited.')}
            </Text>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={forfeitConfirmed}
                disabled={working || actionsBlocked}
                onChange={(event) => setForfeitConfirmed(event.target.checked)}
              />
              <Text small>
                {t('I understand that this emergency withdrawal permanently gives up pending rewards.')}
              </Text>
            </label>
          </>
        ) : loading ? (
          <Flex alignItems="center" justifyContent="center" p="24px">
            <AutoRenewIcon spin />
            <Text ml="8px">{t('Reading position…')}</Text>
          </Flex>
        ) : positionError || !position ? (
          <Text role="alert" color="failure">
            {positionError || t('Could not verify this wallet position.')}
          </Text>
        ) : (
          <>
            <Text small color="textSubtle" mb="12px">
              {mode === 'stake'
                ? t('Choose NFTs you own in this pool. Approvals and staking are separate wallet transactions.')
                : t(
                    'Unstaking claims available rewards as part of the normal withdrawal. Select a subset to withdraw only those NFTs.',
                  )}
            </Text>
            {position.collections.map((collection) => {
              const collectionId = collection.address.toLowerCase()
              const ids =
                mode === 'stake' ? inventory[collectionId] || [] : collection.staked.map((item) => item.tokenId)
              const selectedInCollection = selectedNfts.filter(
                (item) => item.collectionAddress.toLowerCase() === collectionId,
              )
              return (
                <CollectionBlock key={collectionId}>
                  <Flex alignItems="center" justifyContent="space-between" mb="8px">
                    <Flex alignItems="center" minWidth={0}>
                      {collection.image ? (
                        <img
                          src={collection.image}
                          alt=""
                          width="34"
                          height="34"
                          style={{ borderRadius: '50%', objectFit: 'cover', marginRight: 9 }}
                        />
                      ) : null}
                      <div>
                        <Text bold>{collection.name}</Text>
                        <Text small color="textSubtle">
                          {collection.weight}x · {ids.length} {t('NFTs')}
                        </Text>
                      </div>
                    </Flex>
                    {mode === 'stake' && !collection.approved && selectedInCollection.length > 0 ? (
                      <Button scale="sm" disabled={working || actionsBlocked} onClick={() => onApprove(collection)}>
                        {working ? <AutoRenewIcon spin /> : t('Approve collection')}
                      </Button>
                    ) : null}
                  </Flex>
                  {mode === 'stake' && inventoryErrors[collectionId] ? (
                    <Text small color="warning" mb="8px">
                      {inventoryErrors[collectionId]}
                    </Text>
                  ) : null}
                  {ids.map((tokenId) => {
                    const staked = collection.staked.find((item) => item.tokenId === tokenId)
                    const nft: SelectedNft = staked
                      ? fromStakedNft(staked)
                      : {
                          collectionAddress: collection.address,
                          tokenId,
                          weight: collection.weight,
                          name: collection.name,
                          image: collection.image,
                        }
                    const key = nftKey(nft)
                    return (
                      <NftRow key={key}>
                        <input
                          type="checkbox"
                          checked={Boolean(selected[key])}
                          disabled={working || actionsBlocked}
                          onChange={() => toggle(nft)}
                        />
                        {tokenMetadata[key]?.image ? (
                          <img
                            src={tokenMetadata[key].image}
                            alt=""
                            width="28"
                            height="28"
                            style={{ borderRadius: 7, objectFit: 'cover' }}
                          />
                        ) : null}
                        <Text bold>{tokenMetadata[key]?.name || `NFT #${tokenId}`}</Text>
                        <Text small color="textSubtle">
                          {staked?.weight || collection.weight}x
                        </Text>
                      </NftRow>
                    )
                  })}
                  {mode === 'stake' && inventoryLoading ? (
                    <Text small color="textSubtle">
                      {t('Loading wallet NFTs…')}
                    </Text>
                  ) : null}
                  {mode === 'stake' && !inventoryLoading && !ids.length && !inventoryErrors[collectionId] ? (
                    <Text small color="textSubtle">
                      {t('No wallet-owned NFTs found.')}
                    </Text>
                  ) : null}
                  {mode === 'stake' && inventoryErrors[collectionId] ? (
                    <Flex mt="10px" style={{ gap: 8 }}>
                      <TokenIdInput
                        aria-label={`${collection.name} token IDs`}
                        placeholder={t('Enter token IDs, e.g. 1, 2, 300')}
                        value={manualIds[collectionId] || ''}
                        onChange={(event) =>
                          setManualIds((current) => ({ ...current, [collectionId]: event.target.value }))
                        }
                      />
                      <Button
                        scale="sm"
                        variant="secondary"
                        disabled={working || actionsBlocked}
                        onClick={() => addManualIds(collection)}
                      >
                        {t('Verify IDs')}
                      </Button>
                    </Flex>
                  ) : null}
                </CollectionBlock>
              )
            })}
            <Text small color="textSubtle" mt="12px">
              {t('Selected')}: {selectedNfts.length} NFT ·{' '}
              {selectedNfts.reduce((sum, item) => sum.add(item.weight), BigNumber.from(0)).toString()} power
            </Text>
            {mode === 'stake' && selectedNfts.length > 0 ? (
              <Text small color="textSubtle" mt="4px">
                {t('Native POL fee for this stake batch')}: {formatUnits(position.performanceFee, 18)} POL ·{' '}
                {t('POL pays fees and gas; WPOL is a separate ERC-20 reward token.')}
              </Text>
            ) : null}
            {mode === 'stake' ? (
              position.collections.filter(
                (collection) =>
                  selectedNfts.some(
                    (item) => item.collectionAddress.toLowerCase() === collection.address.toLowerCase(),
                  ) && !collection.approved,
              ).length > 0 ? (
                <Text small color="warning" mt="8px">
                  {t('Approve each selected collection separately. After all approvals confirm, press Stake NFTs.')}
                </Text>
              ) : null
            ) : null}
          </>
        )}
        {error ? (
          <Text role="alert" color="failure" mt="12px">
            {error}
          </Text>
        ) : null}
        {notice ? (
          <Text role="status" color="success" mt="12px">
            {notice}
          </Text>
        ) : null}
        {actionsBlocked ? (
          <Button width="100%" variant="secondary" mt="10px" disabled={working} onClick={retryConfirmedVerification}>
            {working ? <AutoRenewIcon spin mr="6px" /> : null}
            {t('Retry on-chain verification — do not resend transaction')}
          </Button>
        ) : null}
        <Flex mt="18px" style={{ gap: 10 }}>
          {mode === 'stake' ? (
            <Button
              width="100%"
              disabled={Boolean(
                working ||
                  actionsBlocked ||
                  loading ||
                  !position ||
                  positionError ||
                  selectedNfts.length === 0 ||
                  position?.collections.some(
                    (collection) =>
                      selectedNfts.some(
                        (item) => item.collectionAddress.toLowerCase() === collection.address.toLowerCase(),
                      ) && !collection.approved,
                  ),
              )}
              onClick={onStake}
            >
              {working ? <AutoRenewIcon spin /> : t('Stake NFTs')}
            </Button>
          ) : mode === 'unstake' ? (
            <Button
              width="100%"
              disabled={Boolean(
                working || actionsBlocked || loading || !position || positionError || selectedNfts.length === 0,
              )}
              onClick={onUnstake}
            >
              {working ? <AutoRenewIcon spin /> : t('Withdraw selected NFTs')}
            </Button>
          ) : (
            <Button
              width="100%"
              variant="danger"
              disabled={Boolean(
                working || actionsBlocked || loading || !position || positionError || !forfeitConfirmed,
              )}
              onClick={onEmergency}
            >
              {working ? <AutoRenewIcon spin /> : t('Emergency withdraw all NFTs')}
            </Button>
          )}
          <Button variant="secondary" onClick={onDismiss} disabled={working || actionsBlocked}>
            {t('Close')}
          </Button>
        </Flex>
      </ModalContent>
    </Modal>
  )
}
