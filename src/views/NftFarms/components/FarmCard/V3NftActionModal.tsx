import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import { Button, Flex, Text } from '@pancakeswap/uikit'
import styled from 'styled-components'
import { useAccount, useSwitchChain } from 'wagmi'
import { isAddressEqual, type Address } from 'viem'
import { useTranslation } from 'contexts/Localization'
import { readNftMetadataFromUri, type V2NftMetadata } from 'features/nftPoolManager/user/nftDiscovery'
import { useV3Query, type useV3Action } from 'features/universalRewards/hooks'
import { shortAmount, sourceName } from 'features/universalRewards/presentation'
import {
  MAX_V3_PAGE,
  nftRefKey,
  readV3CardPosition,
  readV3Nft,
  readV3NftUri,
  type NftRef,
  type V3PoolSnapshot,
} from 'features/universalRewards/reader'
import type { V3Client, V3Deployment } from 'features/universalRewards/runtime'
import { manageV3Position, manageV3Positions } from 'features/universalRewards/transactions'
import NftSelectionModal from '../NftSelectionModal'
import V3StakeSelection from './V3StakeSelection'

const POLYGON = BigInt(137)
const PAGE = BigInt(MAX_V3_PAGE)
const ZERO = BigInt(0)

const Dialog = styled.dialog`
  max-width: 100%;
  max-height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  overscroll-behavior: contain;

  &::backdrop {
    background: ${({ theme }) => `${theme.colors.text}99`};
    overflow: hidden;
    overscroll-behavior: contain;
  }
`

export type V3NftActionMode = 'stake' | 'unstake'

type Collection = { name: string; image?: string }
type Choice = { ref: NftRef; name: string; image?: string; weight: number; claimable: readonly bigint[] }

function isBackdrop(event: PointerEvent<HTMLDialogElement>) {
  if (event.target !== event.currentTarget) return false
  const bounds = event.currentTarget.getBoundingClientRect()
  return (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
}

type ModalProps = {
  mode: V3NftActionMode
  client: V3Client
  deployment: V3Deployment
  pool: V3PoolSnapshot
  collections: Collection[]
  account: Address
  action: ReturnType<typeof useV3Action>
  onSuccess: () => void
  onDismiss: () => void
  onManageCollections?: () => void
}

export default function V3NftActionModal({ mode, action, onDismiss, onSuccess, ...props }: ModalProps) {
  const { t } = useTranslation()
  const title = t(mode === 'stake' ? 'Select NFTs to Stake' : 'Select NFTs to UnStake')
  const description = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const pressedBackdrop = useRef(false)
  const [busy, setBusy] = useState(false)
  const pending = action.busy || busy

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  const dismiss = () => {
    if (!pending) dialog.current?.close()
  }
  const done = (close = true) => {
    onSuccess()
    if (close) dialog.current?.close()
  }

  return (
    <Dialog
      ref={dialog}
      aria-label={title}
      aria-describedby={mode === 'unstake' ? description : undefined}
      onClose={onDismiss}
      onCancel={(event) => {
        if (pending) event.preventDefault()
      }}
      onPointerDown={(event) => {
        pressedBackdrop.current = isBackdrop(event)
      }}
      onPointerUp={(event) => {
        if (pressedBackdrop.current && isBackdrop(event)) dismiss()
        pressedBackdrop.current = false
      }}
      onPointerCancel={() => {
        pressedBackdrop.current = false
      }}
    >
      {mode === 'stake' ? (
        <V3StakeSelection
          {...props}
          title={title}
          action={action}
          onBusyChange={setBusy}
          onSuccess={done}
          onDismiss={dismiss}
        />
      ) : (
        <V3UnstakeSelection
          {...props}
          title={title}
          description={description}
          action={action}
          onBusyChange={setBusy}
          onSuccess={done}
          onDismiss={dismiss}
        />
      )}
    </Dialog>
  )
}

function V3UnstakeSelection({
  title,
  description,
  client,
  deployment,
  pool,
  collections,
  account,
  action,
  onSuccess,
  onDismiss,
  onManageCollections,
  onBusyChange,
}: Omit<ModalProps, 'mode'> & {
  title: string
  description: string
  onSuccess: (close?: boolean) => void
  onBusyChange: (busy: boolean) => void
}) {
  const { t } = useTranslation()
  const { chainId } = useAccount()
  const { switchChain, isPending: switching, error: switchError } = useSwitchChain()
  const [offset, setOffset] = useState(ZERO)
  const [selected, setSelected] = useState<Record<string, Choice>>({})
  const [attempted, setAttempted] = useState(false)
  const wrongChain = chainId !== deployment.chainId
  const pending = action.busy || switching
  const selectedNfts = Object.values(selected)
  const batchExit = pool.batchLimit > 0

  useEffect(() => onBusyChange(switching), [onBusyChange, switching])

  const loadChoices = useCallback(async () => {
    const indexed = pool.capacity > 32
    const wallet = await readV3CardPosition(client, deployment, pool, account, indexed ? offset : ZERO)
    const snapshot = { ...pool, blockNumber: wallet.blockNumber, timestamp: wallet.timestamp }
    const positions = wallet.seatedNfts.filter((ref) =>
      pool.collections.some(
        (collection) =>
          !collection.managed &&
          collection.sourceChainId === ref.sourceChainId &&
          isAddressEqual(collection.collection, ref.collection),
      ),
    )
    const total = indexed ? wallet.total : BigInt(positions.length)
    const refs = indexed ? positions : positions.slice(Number(offset), Number(offset + PAGE))
    const choices = await Promise.all(
      refs.map(async (ref): Promise<Choice | undefined> => {
        const collectionIndex = pool.collections.findIndex(
          (candidate) =>
            candidate.sourceChainId === ref.sourceChainId && isAddressEqual(candidate.collection, ref.collection),
        )
        if (collectionIndex === -1) return undefined
        const position = await readV3Nft(client, deployment, snapshot, account, ref)
        if (!position.eligible) return undefined
        const metadata: V2NftMetadata =
          ref.sourceChainId === POLYGON
            ? await readV3NftUri(client, ref, snapshot.blockNumber)
                .then(readNftMetadataFromUri)
                .catch(() => ({}))
            : {}
        const collection = collections[collectionIndex]
        return {
          ref,
          weight: position.weight,
          claimable: position.claimable,
          name: metadata.name || collection?.name || sourceName(ref.sourceChainId),
          image: metadata.image || collection?.image,
        }
      }),
    )
    return {
      choices: choices.filter((choice): choice is Choice => Boolean(choice)),
      total,
    }
  }, [account, client, collections, deployment, offset, pool])

  const options = useV3Query(`unstake:${account}:${offset}`, loadChoices)
  const selectionLimit = batchExit ? pool.batchLimit : 32
  const unstakeChoices = options.data?.choices ?? []
  const unselectedChoices = unstakeChoices.filter(({ ref }) => !selected[nftRefKey(ref)])
  const canSelectVisible =
    batchExit && unselectedChoices.length > 0 && selectedNfts.length + unselectedChoices.length <= selectionLimit

  const confirm = async (leave = false) => {
    if (wrongChain) {
      switchChain({ chainId: deployment.chainId })
      return
    }
    if (
      pending ||
      options.loading ||
      options.error ||
      !selectedNfts.length ||
      selectedNfts.length > selectionLimit ||
      action.unconfirmed
    )
      return
    setAttempted(true)
    const receipt = await action.runMany(async () => {
      const block = await client.getBlock()
      const snapshot = { ...pool, blockNumber: block.number, timestamp: block.timestamp }
      const checks = await Promise.all(
        selectedNfts.map(({ ref }) => readV3Nft(client, deployment, snapshot, account, ref)),
      )
      if (checks.some(({ eligible, seated }) => !eligible || !seated)) {
        throw new Error(t('One or more selected NFTs are no longer in your pool position. Review your selection.'))
      }
      if (batchExit && !leave) {
        const rewards = pool.rewards
          .filter((_, index) => checks.some(({ claimable }) => claimable[index] > ZERO))
          .map(({ symbol }) => symbol)
        return [
          {
            ...manageV3Positions(
              deployment,
              pool.poolId,
              selectedNfts.map(({ ref }) => ref),
              'exitBatch',
            ),
            confirmationLabel: [
              t('Unstake & Harvest'),
              t('%count% NFT positions', { count: selectedNfts.length }),
              ...rewards,
            ].join(' · '),
          },
        ]
      }
      return selectedNfts.map(({ name, ref }, index) => {
        const operation = leave ? t('Leave and keep claims') : t('Unstake & Harvest')
        const rewardSymbols = leave
          ? []
          : pool.rewards
              .filter((_, rewardIndex) => checks[index].claimable[rewardIndex] > ZERO)
              .map(({ symbol }) => symbol)
        return {
          ...manageV3Position(deployment, pool.poolId, ref, leave ? 'leave' : 'exit'),
          confirmationLabel: [operation, `${name} #${ref.tokenId}`, ...rewardSymbols].join(' · '),
          onConfirmed: () =>
            setSelected((previous) => {
              const next = { ...previous }
              delete next[nftRefKey(ref)]
              return next
            }),
        }
      })
    })
    if (receipt) onSuccess()
    else {
      onSuccess(false)
      options.refresh()
    }
  }

  return (
    <NftSelectionModal
      title={title}
      initialFocus
      minWidth="min(346px, 100%)"
      options={(options.data?.choices ?? []).map((choice) => {
        const key = nftRefKey(choice.ref)
        const label = `${choice.name} #${choice.ref.tokenId} · ${choice.weight} power`
        return {
          key,
          label: `#${choice.ref.tokenId} · ${choice.name}`,
          accessibleLabel: label,
          supportingText: `${choice.weight} power`,
          image: choice.image,
          selected: Boolean(selected[key]),
          onSelect: () =>
            setSelected((previous) => {
              if (previous[key]) {
                const next = { ...previous }
                delete next[key]
                return next
              }
              return { ...previous, [key]: choice }
            }),
        }
      })}
      loading={options.loading}
      error={Boolean(options.error)}
      onRetry={options.refresh}
      onDismiss={onDismiss}
      onConfirm={() => void confirm()}
      pending={pending}
      disabled={
        !wrongChain &&
        (options.loading ||
          Boolean(options.error) ||
          !selectedNfts.length ||
          selectedNfts.length > selectionLimit ||
          action.unconfirmed)
      }
      confirmLabel={wrongChain ? t('Switch network') : t('Unstake & Harvest')}
      after={
        <Flex flexDirection="column" mt="8px" style={{ gap: 8 }}>
          {options.data && (offset > ZERO || offset + PAGE < options.data.total) && (
            <Flex justifyContent="space-between">
              <Button
                scale="sm"
                variant="text"
                disabled={pending || offset === ZERO}
                onClick={() => setOffset(offset - PAGE)}
              >
                {t('Previous')}
              </Button>
              <Button
                scale="sm"
                variant="text"
                disabled={pending || offset + PAGE >= options.data.total}
                onClick={() => setOffset(offset + PAGE)}
              >
                {t('Next')}
              </Button>
            </Flex>
          )}
          {onManageCollections && (
            <Button
              type="button"
              variant="secondary"
              scale="sm"
              disabled={pending || action.unconfirmed}
              onClick={() => {
                onDismiss()
                onManageCollections()
              }}
            >
              {t('Manage ERC-1155 NFTs')}
            </Button>
          )}
          {batchExit && unstakeChoices.length > 1 && (
            <Flex flexWrap="wrap" style={{ gap: 8 }}>
              <Button
                type="button"
                scale="sm"
                variant="secondary"
                disabled={!canSelectVisible || pending || options.loading || action.unconfirmed}
                onClick={() =>
                  setSelected((previous) => ({
                    ...previous,
                    ...Object.fromEntries(unstakeChoices.map((choice) => [nftRefKey(choice.ref), choice])),
                  }))
                }
              >
                {t(options.data?.total === BigInt(unstakeChoices.length) ? 'Select all NFTs' : 'Select this page')}
              </Button>
              {selectedNfts.length > 0 && (
                <Button
                  type="button"
                  scale="sm"
                  variant="text"
                  disabled={pending || action.unconfirmed}
                  onClick={() => setSelected({})}
                >
                  {t('Clear selection')}
                </Button>
              )}
            </Flex>
          )}
          {selectedNfts.length > selectionLimit && (
            <Text small color="failure" role="alert">
              {t('Select up to %count% NFTs per batch.', { count: selectionLimit })}
            </Text>
          )}
          <Text id={description} small color="textSubtle">
            {t('You receive the available rewards for the NFTs you select. These NFTs stop earning in this pool.')}
          </Text>
          <Text small role="status">
            {selectedNfts.length > 0 && (
              <>
                {t('%count% NFTs selected', { count: selectedNfts.length })} ·{' '}
                {pool.rewards
                  .map((reward, index) => {
                    const amount = selectedNfts.reduce((sum, choice) => sum + choice.claimable[index], ZERO)
                    return `${shortAmount(amount, reward.decimals)} ${reward.symbol}`
                  })
                  .join(' · ')}
              </>
            )}
          </Text>
          {selectedNfts.length > 1 && (
            <Text small color="textSubtle">
              {batchExit
                ? t('One wallet confirmation covers the selected NFTs and their available rewards.')
                : t('%count% wallet confirmations, one per NFT. Each includes all available rewards for that NFT.', {
                    count: selectedNfts.length,
                  })}
            </Text>
          )}
          {wrongChain && switchError && (
            <Text small color="failure" role="alert">
              {t('Switch to the settlement network in your wallet and try again.')}
            </Text>
          )}
          {(attempted || action.unconfirmed) && action.error && (
            <Text small color="failure" role="alert">
              {action.error}
            </Text>
          )}
          {(attempted || action.unconfirmed) && action.message && (
            <Text small role="status">
              {action.message}
            </Text>
          )}
          {selectedNfts.length === 1 && !wrongChain && (
            <Button
              scale="sm"
              variant="text"
              disabled={pending || options.loading || Boolean(options.error) || action.unconfirmed}
              onClick={() => void confirm(true)}
            >
              {t('Leave and keep claims')}
            </Button>
          )}
          {action.unconfirmed && (
            <Button
              variant="secondary"
              disabled={pending}
              onClick={async () => {
                if (await action.recheck()) {
                  if (batchExit || selectedNfts.length <= 1) onSuccess()
                  else {
                    onSuccess()
                    options.refresh()
                  }
                }
              }}
            >
              {t('Retry on-chain verification')}
            </Button>
          )}
        </Flex>
      }
    />
  )
}
