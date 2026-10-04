import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AutoRenewIcon,
  Button,
  Flex,
  Modal,
  ModalBody,
  Text,
  LightningIcon,
  WarningIcon,
  CheckmarkCircleFillIcon,
  InfoIcon,
  Link,
} from '@pancakeswap/uikit'
import { BigNumber } from '@ethersproject/bignumber'
import { formatUnits } from '@ethersproject/units'
import { Contract } from '@ethersproject/contracts'
import type { Provider } from '@ethersproject/providers'
import styled from 'styled-components'
import useTheme from 'hooks/useTheme'
import { ModalActions } from 'components/Modal'
import CircleLoader from 'components/Loader/CircleLoader'
import NoNftsImage from 'views/Nft/market/components/Activity/NoNftsImage'
import {
  NftBox,
  SelectedNftBox,
  NftOption,
  Wrapper,
  SelectionInfo,
  SelectionCountChip,
} from 'views/NftFarms/components/DepositModal'
import { Title, Wrapper as CollectionWrapper } from 'components/CollectionSelectModal/CollectionSelectModal'
import {
  MenuItem,
  CollectionAvatar,
  ContentColumn,
  CollectionTitleRow,
  CollectionTitleText,
  PowerText,
} from 'components/CollectionSelectModal/CollectionList'
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
  width: 572px;
  max-width: calc(100vw - 72px);
  max-height: 70vh;
  overflow-y: auto;
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

const ActionFeedbackCard = styled.div<{ $kind: 'cancelled' | 'error' }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 12px;
  padding: 12px 14px;
  border: 1px solid ${({ theme, $kind }) => ($kind === 'cancelled' ? theme.colors.primary : theme.colors.failure)};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
`

type ActionFeedback = { kind: 'cancelled' | 'error'; title: string; message: string }

function getActionFeedback(cause: unknown): ActionFeedback {
  const value = cause as {
    code?: string | number
    message?: string
    reason?: string
    cancelled?: boolean
    error?: { code?: string | number; message?: string }
  }
  const code = value?.code ?? value?.error?.code
  const rawMessage = value?.reason || value?.error?.message || value?.message || String(cause)
  const walletDeclined =
    code === 4001 ||
    code === 'ACTION_REJECTED' ||
    /user rejected (transaction|request)|user denied (transaction|request)/i.test(rawMessage)

  if (walletDeclined) {
    return {
      kind: 'cancelled',
      title: 'Wallet request declined',
      message: 'No transaction was sent. You can try again whenever you’re ready.',
    }
  }

  if (
    (code === 'TRANSACTION_REPLACED' && value?.cancelled) ||
    /transaction was cancelled in the wallet/i.test(rawMessage)
  ) {
    return {
      kind: 'cancelled',
      title: 'Transaction cancelled',
      message: 'The wallet cancelled or replaced this transaction. Check wallet activity before trying again.',
    }
  }

  const conciseMessage = rawMessage
    .split(/\s+\((?:action|transaction)=/i)[0]
    .split(/\s+,?\s+code=/i)[0]
    .split('\n')[0]
    .trim()
    .slice(0, 240)

  return {
    kind: 'error',
    title: 'Action could not be completed',
    message: conciseMessage || 'Check your wallet and network, then try again.',
  }
}

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
  const { theme } = useTheme()
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
  const [inventoryStatus, setInventoryStatus] = useState<Record<string, 'loading' | 'ready' | 'error'>>({})
  const [tokenMetadata, setTokenMetadata] = useState<Record<string, { name?: string; image?: string }>>({})
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [manualIds, setManualIds] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Record<string, SelectedNft>>({})
  const [inventoryErrors, setInventoryErrors] = useState<Record<string, string>>({})
  const [working, setWorking] = useState(false)
  const [approvingCollection, setApprovingCollection] = useState<string>()
  const [error, setError] = useState<ActionFeedback>()
  const [notice, setNotice] = useState<string>()
  const [pendingVerification, setPendingVerification] = useState<ConfirmedV2WriteVerificationError>()
  const [refreshPending, setRefreshPending] = useState(false)
  const [forfeitConfirmed, setForfeitConfirmed] = useState(false)
  const [activeCollection, setActiveCollection] = useState<string>()
  const [inventoryRevision, setInventoryRevision] = useState(0)
  const actionLock = useRef(false)
  const inventoryLoadedFor = useRef<{ key: string; provider?: Provider }>()
  const configuredCollections = position?.collections || []
  const configuredCollectionsRef = useRef(configuredCollections)
  configuredCollectionsRef.current = configuredCollections
  const inventoryRequestKey = [
    pool.id,
    account.toLowerCase(),
    chainId || '',
    inventoryRevision,
    configuredCollections
      .map((item) => `${item.address.toLowerCase()}:${item.weight}:${item.name}:${item.image || ''}`)
      .join('|'),
  ].join(':')
  const currentInventoryKey = useRef(inventoryRequestKey)
  currentInventoryKey.current = inventoryRequestKey
  const inventoryIsForCurrentWallet =
    inventoryLoadedFor.current?.key === inventoryRequestKey && inventoryLoadedFor.current.provider === provider
  const metadataItems = configuredCollections
    .flatMap((collection) =>
      (mode === 'unstake'
        ? collection.staked.map((nft) => nft.tokenId)
        : inventoryIsForCurrentWallet
        ? inventory[collection.address.toLowerCase()] || []
        : []
      )
        .slice(0, 24)
        .map((tokenId) => ({
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
      inventoryLoadedFor.current = undefined
      setInventoryLoading(false)
      setInventory({})
      setInventoryStatus({})
      setTokenMetadata({})
      setSelected({})
      setInventoryErrors({})
      return undefined
    }
    const previouslyLoaded = inventoryLoadedFor.current
    if (previouslyLoaded?.key === inventoryRequestKey && previouslyLoaded.provider === provider) return undefined
    inventoryLoadedFor.current = { key: inventoryRequestKey, provider }
    let active = true
    const collectionsToRead = configuredCollectionsRef.current.map(
      (item) =>
        ({
          address: item.address,
          name: item.name,
          image: item.image,
          weight: item.weight,
        } as V2UserCollection),
    )
    setInventoryLoading(true)
    setInventory({})
    setInventoryStatus(
      Object.fromEntries(collectionsToRead.map((item) => [item.address.toLowerCase(), 'loading'])) as Record<
        string,
        'loading' | 'ready' | 'error'
      >,
    )
    setTokenMetadata({})
    setSelected({})
    setInventoryErrors({})
    Promise.all(
      collectionsToRead.map(async (collection) => {
        try {
          let timeout: ReturnType<typeof setTimeout> | undefined
          const result = await Promise.race([
            readV2OwnedNfts(provider, collection.address, account),
            new Promise<never>((_, reject) => {
              timeout = setTimeout(() => reject(new Error('NFT read timed out. Retry or enter token IDs.')), 15_000)
            }),
          ]).finally(() => {
            if (timeout !== undefined) clearTimeout(timeout)
          })
          if (active) {
            const address = collection.address.toLowerCase()
            setInventory((current) => ({ ...current, [address]: result.tokenIds }))
            setInventoryStatus((current) => ({ ...current, [address]: result.complete ? 'ready' : 'error' }))
            const message = result.message
            if (!result.complete && message) {
              setInventoryErrors((current) => ({ ...current, [address]: message }))
            }
          }
          return [collection.address.toLowerCase(), result] as const
        } catch (cause) {
          const address = collection.address.toLowerCase()
          const readError = cause instanceof Error ? cause : new Error(String(cause))
          if (active) {
            setInventoryStatus((current) => ({ ...current, [address]: 'error' }))
            setInventoryErrors((current) => ({ ...current, [address]: readError.message }))
          }
          return [address, readError] as const
        }
      }),
    ).then((results) => {
      if (!active) return
      const nextInventory: Record<string, string[]> = {}
      const nextErrors: Record<string, string> = {}
      const nextInventoryStatus: Record<string, 'ready' | 'error'> = {}
      results.forEach(([address, result]) => {
        if (result instanceof Error) {
          nextErrors[address] = result.message
          nextInventoryStatus[address] = 'error'
        } else {
          nextInventory[address] = result.tokenIds
          if (!result.complete) {
            nextInventoryStatus[address] = 'error'
            if (result.message) nextErrors[address] = result.message
          } else {
            nextInventoryStatus[address] = 'ready'
          }
        }
      })
      setInventory(nextInventory)
      setInventoryErrors(nextErrors)
      setInventoryStatus(nextInventoryStatus)
      setInventoryLoading(false)
    })
    return () => {
      active = false
      // A closed/reopened wallet modal gets a fresh read instead of inheriting
      // the old request's "already loaded" marker and waiting forever.
      if (inventoryLoadedFor.current?.key === inventoryRequestKey) inventoryLoadedFor.current = undefined
    }
  }, [mode, pool.id, inventoryRequestKey, account, chainId, provider, Boolean(position)])

  useEffect(() => {
    if (mode === 'emergency' || !account || !provider) {
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
    setSelected({})
    setActiveCollection(undefined)
    setError(undefined)
    setManualIds({})
    setForfeitConfirmed(false)
  }, [pool.id, account, chainId, mode])

  const selectedNfts = useMemo(() => {
    const currentWeights = new Map(
      configuredCollections.map((collection) => [collection.address.toLowerCase(), collection.weight]),
    )
    return Object.values(selected).map((nft) => ({
      ...nft,
      weight: mode === 'stake' ? currentWeights.get(nft.collectionAddress.toLowerCase()) || nft.weight : nft.weight,
    }))
  }, [selected, configuredCollections, mode])
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
    const requestedKey = inventoryRequestKey
    setError(undefined)
    setInventoryErrors((current) => ({ ...current, [collection.address.toLowerCase()]: '' }))
    try {
      if (!provider || !account) throw new Error('Reconnect the wallet before checking NFT ownership.')
      const result = await readV2OwnedNfts(provider, collection.address, account, {
        manualTokenIds: manualIds[collection.address.toLowerCase()] || '',
      })
      if (currentInventoryKey.current !== requestedKey) return
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
      if (currentInventoryKey.current !== requestedKey) return
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
      setError(getActionFeedback(cause))
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
      setError(getActionFeedback(cause))
    } finally {
      actionLock.current = false
      setWorking(false)
    }
  }

  const onApprove = async (collection: V2UserCollection) => {
    const collectionKey = collection.address.toLowerCase()
    setApprovingCollection(collectionKey)
    try {
      await completeAction(() => {
        if (!signer || !account) throw new Error('Reconnect the wallet before approving this collection.')
        return approveV2PoolCollection(
          { signer, poolAddress: pool.address, poolRecord: pool, account },
          collection.address,
        )
      }, `${collection.name} approved`)
    } finally {
      setApprovingCollection((current) => (current === collectionKey ? undefined : current))
    }
  }

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
      setError(getActionFeedback(cause))
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

  const actionsBlocked = Boolean(pendingVerification || refreshPending)
  const pickingCollection = mode === 'stake' && !activeCollection
  const title =
    mode === 'emergency'
      ? t('Emergency withdrawal')
      : pickingCollection
      ? t('Choose an NFT collection')
      : mode === 'stake'
      ? t('Select NFTs to Stake')
      : t('Select NFTs to UnStake')
  const selectedPower = selectedNfts.reduce((sum, item) => sum.add(item.weight), BigNumber.from(0))
  const totalCount = BigNumber.from(position?.nftCount || '0').add(selectedNfts.length)
  const limitReached =
    mode === 'stake' && Boolean(position?.userLimit) && totalCount.gt(position?.poolLimitPerUser || '0')
  const visibleCollections =
    mode === 'stake'
      ? configuredCollections.filter((collection) => collection.address.toLowerCase() === activeCollection)
      : configuredCollections
  const activeCollectionInventoryLoading =
    mode === 'stake' && activeCollection
      ? inventoryIsForCurrentWallet && inventoryStatus[activeCollection] === 'loading'
      : inventoryLoading
  const nftItems = visibleCollections.flatMap((collection) =>
    (mode === 'stake'
      ? inventoryIsForCurrentWallet
        ? inventory[collection.address.toLowerCase()] || []
        : []
      : collection.staked.map((item) => item.tokenId)
    ).map((tokenId) => {
      const staked = collection.staked.find((item) => item.tokenId === tokenId)
      return staked
        ? fromStakedNft(staked)
        : {
            collectionAddress: collection.address,
            tokenId,
            weight: collection.weight,
            name: collection.name,
            image: collection.image,
          }
    }),
  )
  const missingApprovals = configuredCollections.filter(
    (collection) =>
      !collection.approved &&
      selectedNfts.some((nft) => nft.collectionAddress.toLowerCase() === collection.address.toLowerCase()),
  )
  const retryInventory = () => setInventoryRevision((value) => value + 1)

  return (
    <Modal
      minWidth="346px"
      maxWidth="calc(100vw - 24px)"
      bodyPadding="24px 24px 10px 24px"
      title={title}
      headerBackground={theme.colors.gradients.bubblegum}
      onBack={
        mode === 'stake' && activeCollection && !working && !actionsBlocked
          ? () => {
              setActiveCollection(undefined)
              setSelected({})
            }
          : undefined
      }
      onDismiss={() => {
        if (!working && !actionsBlocked) onDismiss?.()
      }}
    >
      <ModalBody maxWidth="620px">
        <ModalContent style={{ width: pickingCollection ? 480 : 572 }}>
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
            <Flex p="24px" flexDirection="column" alignItems="center">
              <CircleLoader size="30px" />
              <Text mt="8px">{t('NFTs will be listed shortly...')}</Text>
            </Flex>
          ) : positionError || !position ? (
            <Flex flexDirection="column">
              <Text role="alert" color="failure">
                {positionError || t('Could not verify this wallet position.')}
              </Text>
              <Button variant="light" mt="12px" onClick={() => refresh()}>
                {t('Retry')}
              </Button>
            </Flex>
          ) : pickingCollection ? (
            <>
              <Text color="textSubtle" small mb="14px">
                {t(
                  'Each collection needs its own wallet approval. Approve grants this pool permission to transfer NFTs from that collection; you choose the NFTs next.',
                )}
              </Text>
              <Title style={{ marginBottom: 2 }}>
                {t('Stake NFTs here to earn by ')}
                <LightningIcon width={15} />
                {t('power. ')}
                <Link
                  display="inline"
                  href="https://docs.coincollect.org/coincollect-nft/nft-powers"
                  target="_blank"
                  color="failure"
                >
                  {t('Learn Power')} »
                </Link>
              </Title>
              <CollectionWrapper flexDirection="column" style={{ maxHeight: 300, overflowY: 'auto' }}>
                {configuredCollections.map((collection) => {
                  const address = collection.address.toLowerCase()
                  const inventoryState = inventoryIsForCurrentWallet ? inventoryStatus[address] || 'loading' : 'loading'
                  const ids = inventoryIsForCurrentWallet ? inventory[address] || [] : []
                  const isApproving = approvingCollection === address
                  let actionLabel = t('Choose')
                  if (inventoryState === 'ready' && ids.length === 0) actionLabel = t('No NFTs')
                  else if (!collection.approved) actionLabel = t('Approve')
                  else if (inventoryState === 'error') actionLabel = t('Enter IDs')
                  return (
                    <MenuItem
                      as="div"
                      key={address}
                      disabled={false}
                      selected={false}
                      width="100%"
                      style={{
                        border: 0,
                        textAlign: 'left',
                        background: 'transparent',
                        gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                        height: 'auto',
                        minHeight: 72,
                        paddingTop: 8,
                        paddingBottom: 8,
                        cursor: 'default',
                      }}
                    >
                      <CollectionAvatar
                        src={collection.image || '/images/nfts/no-profile-md.png'}
                        alt=""
                        onError={(event) => {
                          event.currentTarget.onerror = null
                          event.currentTarget.src = '/images/nfts/no-profile-md.png'
                        }}
                      />
                      <ContentColumn>
                        <CollectionTitleRow>
                          <CollectionTitleText bold fontSize="14px">
                            {collection.name}
                          </CollectionTitleText>
                          <PowerText bold fontSize="14px">
                            <LightningIcon />
                            {collection.weight}
                          </PowerText>
                        </CollectionTitleRow>
                        <Text color="textSubtle" small mt="2px">
                          {collection.approved
                            ? t('Select NFTs you own')
                            : t('Approval needed for this collection')}
                        </Text>
                      </ContentColumn>
                      <Flex flexDirection="column" alignItems="flex-end" style={{ gap: 5 }}>
                        {inventoryState === 'loading' ? (
                          <Flex alignItems="center" style={{ gap: 5 }} role="status" aria-live="polite">
                            <CircleLoader size="14px" />
                            <Text small color="textSubtle">{t('Checking wallet NFTs')}</Text>
                          </Flex>
                        ) : inventoryState === 'error' ? (
                          <Text small color="warning" role="status" aria-live="polite">
                            {t('NFT list unavailable')}
                          </Text>
                        ) : (
                          <Text small color="textSubtle" role="status" aria-live="polite">
                            {t('%count% owned', { count: ids.length })}
                          </Text>
                        )}
                        <Button
                          scale="sm"
                          variant={collection.approved ? 'secondary' : 'primary'}
                          disabled={
                            working ||
                            actionsBlocked ||
                            (collection.approved && inventoryState === 'loading') ||
                            (collection.approved && inventoryState === 'error' && inventoryLoading) ||
                            (inventoryState === 'ready' && ids.length === 0)
                          }
                          aria-label={`${actionLabel} ${collection.name}`}
                          aria-busy={isApproving}
                          onClick={() =>
                            collection.approved ? setActiveCollection(address) : void onApprove(collection)
                          }
                        >
                          {isApproving ? <AutoRenewIcon spin mr="4px" /> : null}
                          {isApproving ? t('Approving') : actionLabel}
                        </Button>
                      </Flex>
                    </MenuItem>
                  )
                })}
              </CollectionWrapper>
              <Text small color="textSubtle" mt="8px">
                {t('Daily rewards use the highest-power NFT in this pool.')}
              </Text>
            </>
          ) : (
            <>
              {mode === 'stake' && position.userLimit && (
                <SelectionInfo $error={limitReached}>
                  <Flex alignItems="center" justifyContent="space-between" flexWrap="wrap" style={{ gap: 12 }}>
                    <Flex alignItems="center" style={{ gap: 8 }}>
                      {limitReached ? (
                        <WarningIcon width="22px" color="failure" />
                      ) : (
                        <CheckmarkCircleFillIcon width="22px" color="success" />
                      )}
                      <Text fontSize="14px" fontWeight={600} color="textSubtle">
                        {t('Selected NFTs')}
                      </Text>
                    </Flex>
                    <SelectionCountChip $error={limitReached}>
                      {totalCount.toString()}/{position.poolLimitPerUser}
                    </SelectionCountChip>
                  </Flex>
                  <Text fontSize="14px" color={limitReached ? 'failure' : 'textSubtle'}>
                    {limitReached
                      ? t('Stake limit reached! Please remove extra NFTs to proceed.')
                      : t('Slots remaining: %remaining%', {
                          remaining: BigNumber.from(position.poolLimitPerUser).sub(totalCount).toString(),
                        })}
                  </Text>
                </SelectionInfo>
              )}
              <Wrapper>
                {nftItems.length ? (
                  <Flex flexWrap="wrap" justifyContent="center" width="100%">
                    {nftItems.map((nft) => {
                      const key = nftKey(nft)
                      const ImageBox = selected[key] ? SelectedNftBox : NftBox
                      const metadata = tokenMetadata[key]
                      return (
                        <NftOption
                          as="button"
                          type="button"
                          key={key}
                          aria-pressed={Boolean(selected[key])}
                          aria-label={nft.name + ' NFT #' + nft.tokenId}
                          disabled={working || actionsBlocked}
                          style={{ border: 0, background: 'transparent', padding: 0 }}
                          onClick={() => toggle(nft)}
                        >
                          <ImageBox
                            src={metadata?.image || nft.image || '/images/nfts/no-profile-md.png'}
                            height={90}
                            width={90}
                            onError={(event) => {
                              event.currentTarget.onerror = null
                              event.currentTarget.src = nft.image || '/images/nfts/no-profile-md.png'
                            }}
                          />
                          <Text
                            fontSize="11px"
                            color="textSubtle"
                            mt="6px"
                            textAlign="center"
                            width="100%"
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={nft.name}
                          >
                            {nft.name}
                          </Text>
                          <Text fontSize="11px" color="textSubtle">
                            #{nft.tokenId} · {nft.weight}x
                          </Text>
                        </NftOption>
                      )
                    })}
                  </Flex>
                ) : activeCollectionInventoryLoading && mode === 'stake' ? (
                  <Flex p="24px" margin="0 auto" flexDirection="column" alignItems="center">
                    <CircleLoader size="30px" />
                    <Text mt="8px">{t('NFTs will be listed shortly...')}</Text>
                  </Flex>
                ) : (
                  <Flex p="24px" flexDirection="column" alignItems="center" width="100%">
                    <NoNftsImage />
                    <Text pt="8px" bold>
                      {mode === 'stake' && activeCollection && inventoryErrors[activeCollection]
                        ? t('Could not list NFTs automatically')
                        : t('No NFTs found')}
                    </Text>
                    {mode === 'stake' && (
                      <Button variant="light" mt="12px" width="100%" onClick={retryInventory}>
                        {t('Retry')}
                      </Button>
                    )}
                  </Flex>
                )}
              </Wrapper>
              {mode === 'stake' &&
                visibleCollections.map((collection) => {
                  const key = collection.address.toLowerCase()
                  return inventoryErrors[key] ? (
                    <div key={key}>
                      <Text small color="warning" mt="8px">
                        {inventoryErrors[key]}
                      </Text>
                      <Text small color="textSubtle" mt="6px">
                        {t('Enter the token IDs you own. Each ID is checked against the connected wallet before it can be staked.')}
                      </Text>
                      <Flex mt="10px" style={{ gap: 8 }}>
                        <TokenIdInput
                          aria-label={collection.name + ' token IDs'}
                          placeholder={t('Enter token IDs, e.g. 1, 2, 300')}
                          value={manualIds[key] || ''}
                          onChange={(event) => setManualIds((current) => ({ ...current, [key]: event.target.value }))}
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
                    </div>
                  ) : null
                })}
              <Text small color="textSubtle" mt="12px">
                {t('Selected')}: {selectedNfts.length} NFT · {selectedPower.toString()} power
              </Text>
              {mode === 'stake' && selectedNfts.length > 0 && BigNumber.from(position.performanceFee).gt(0) && (
                <Text small color="textSubtle" mt="4px">
                  {t('Stake fee')}: {formatUnits(position.performanceFee, 18)} POL
                </Text>
              )}
              {mode === 'stake' &&
                missingApprovals.map((collection) => (
                  <Button
                    key={collection.address}
                    aria-busy={approvingCollection === collection.address.toLowerCase()}
                    width="100%"
                    mt="12px"
                    disabled={working || actionsBlocked}
                    onClick={() => onApprove(collection)}
                  >
                    {approvingCollection === collection.address.toLowerCase() ? (
                      <AutoRenewIcon spin mr="6px" />
                    ) : null}
                    {approvingCollection === collection.address.toLowerCase()
                      ? t('Approving %collection%', { collection: collection.name })
                      : t('Enable %collection%', { collection: collection.name })}
                  </Button>
                ))}
            </>
          )}
          {error && (
            <ActionFeedbackCard
              $kind={error.kind}
              role={error.kind === 'cancelled' ? 'status' : 'alert'}
              aria-live={error.kind === 'cancelled' ? 'polite' : 'assertive'}
            >
              {error.kind === 'cancelled' ? (
                <InfoIcon width="20px" color="primary" mt="1px" />
              ) : (
                <WarningIcon width="20px" color="failure" mt="1px" />
              )}
              <div style={{ minWidth: 0 }}>
                <Text bold color={error.kind === 'cancelled' ? 'primary' : 'failure'}>
                  {t(error.title)}
                </Text>
                <Text small color="textSubtle" mt="3px" style={{ overflowWrap: 'anywhere' }}>
                  {t(error.message)}
                </Text>
              </div>
            </ActionFeedbackCard>
          )}
          {notice && (
            <Text role="status" color="success" mt="12px">
              {notice}
            </Text>
          )}
          {actionsBlocked && (
            <Button width="100%" variant="secondary" mt="10px" disabled={working} onClick={retryConfirmedVerification}>
              {working && <AutoRenewIcon spin mr="6px" />}
              {t('Retry on-chain verification — do not resend transaction')}
            </Button>
          )}
          {!pickingCollection && (
            <ModalActions>
              <Button variant="secondary" onClick={onDismiss} width="100%" disabled={working || actionsBlocked}>
                {t('Cancel')}
              </Button>
              <Button
                width="100%"
                variant={mode === 'emergency' ? 'danger' : 'primary'}
                isLoading={working}
                endIcon={working ? <AutoRenewIcon spin color="currentColor" /> : null}
                disabled={Boolean(
                  working ||
                    actionsBlocked ||
                    loading ||
                    !position ||
                    positionError ||
                    (mode === 'emergency' ? !forfeitConfirmed : selectedNfts.length === 0) ||
                    (mode === 'stake' && (limitReached || missingApprovals.length)),
                )}
                onClick={mode === 'stake' ? onStake : mode === 'unstake' ? onUnstake : onEmergency}
              >
                {working ? t('Confirming') : t('Confirm')}
              </Button>
            </ModalActions>
          )}
        </ModalContent>
      </ModalBody>
    </Modal>
  )
}
