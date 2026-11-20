import { useCallback, useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react'
import { Button, Flex, Text } from '@pancakeswap/uikit'
import styled from 'styled-components'
import { useAccount, useSwitchChain } from 'wagmi'
import { isAddressEqual, type Address } from 'viem'
import { useTranslation } from 'contexts/Localization'
import { readNftMetadataFromUri, type V2NftMetadata } from 'features/nftPoolManager/user/nftDiscovery'
import { useV3Query, type useV3Action } from 'features/universalRewards/hooks'
import { poolTiming, positionDailyEstimate, shortAmount, sourceName } from 'features/universalRewards/presentation'
import {
  discoverV3Nfts,
  MAX_V3_PAGE,
  nftRefKey,
  readV3CardPosition,
  readV3Nft,
  readV3NftUri,
  type NftRef,
  type V3PoolSnapshot,
} from 'features/universalRewards/reader'
import type { V3Client, V3Deployment } from 'features/universalRewards/runtime'
import { joinV3, manageV3Position } from 'features/universalRewards/transactions'
import { UINT256_MAX } from 'features/universalRewards/units'
import { walletOfOwnerApi } from 'state/nftMarket/helpers'
import NftSelectionModal, { NftSelectionLimit } from '../NftSelectionModal'

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

const Field = styled.label`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 4px;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 14px;

  input,
  select {
    min-width: 0;
    min-height: 42px;
    padding: 0 12px;
    border: 1px solid ${({ theme }) => theme.colors.cardBorder};
    border-radius: 10px;
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.input};
    font-size: 16px;
  }
`

export type V3NftActionMode = 'stake' | 'unstake' | 'harvest'

type Collection = { name: string; image?: string }
type Choice = { ref: NftRef; name: string; image?: string; weight: number }

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

export default function V3NftActionModal({
  mode,
  client,
  deployment,
  pool,
  collections,
  account,
  action,
  onSuccess,
  onDismiss,
}: {
  mode: V3NftActionMode
  client: V3Client
  deployment: V3Deployment
  pool: V3PoolSnapshot
  collections: Collection[]
  account: Address
  action: ReturnType<typeof useV3Action>
  onSuccess: () => void
  onDismiss: () => void
}) {
  const { t } = useTranslation()
  const { chainId } = useAccount()
  const { switchChain, isPending: switching, error: switchError } = useSwitchChain()
  const title = t(
    mode === 'stake' ? 'Select NFTs to Stake' : mode === 'unstake' ? 'Select NFTs to UnStake' : 'Select NFT to Harvest',
  )
  const dialog = useRef<HTMLDialogElement>(null)
  const pressedBackdrop = useRef(false)
  const [collectionIndex, setCollectionIndex] = useState(0)
  const [offset, setOffset] = useState(ZERO)
  const [manualIds, setManualIds] = useState<bigint[]>([])
  const [typedId, setTypedId] = useState('')
  const [inputError, setInputError] = useState('')
  const [selected, setSelected] = useState<Record<string, Choice>>({})
  const [attempted, setAttempted] = useState(false)
  const rule = pool.collections[collectionIndex]
  const wrongChain = chainId !== deployment.chainId
  const pending = action.busy || switching
  const selectedNfts = Object.values(selected)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  const loadChoices = useCallback(async () => {
    const wallet = await readV3CardPosition(client, deployment, pool, account)
    const snapshot = { ...pool, blockNumber: wallet.blockNumber, timestamp: wallet.timestamp }
    const positions = mode === 'unstake' ? wallet.seatedNfts : wallet.claimableNfts
    let total = BigInt(positions.length)
    let needsId = false
    let refs = positions.slice(Number(offset), Number(offset + PAGE))
    if (mode === 'stake' && rule) {
      const inventory =
        rule.sourceChainId === POLYGON
          ? await discoverV3Nfts(client, snapshot, account, rule.collection, offset)
          : { enumerable: false, total: ZERO, tokenIds: [] as bigint[] }
      let { tokenIds } = inventory
      total = inventory.total
      needsId = !inventory.enumerable
      if (needsId && rule.sourceChainId === POLYGON && deployment.chainId === Number(POLYGON)) {
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
        tokenIds = ids.slice(Number(offset), Number(offset + PAGE))
      }
      const ids = Array.from(new Set([...tokenIds, ...manualIds]))
      refs = ids.map((tokenId) => ({ sourceChainId: rule.sourceChainId, collection: rule.collection, tokenId }))
    }
    const choices = await Promise.all(
      refs.map(async (ref): Promise<Choice | undefined> => {
        const collectionIndex = pool.collections.findIndex(
          (candidate) =>
            candidate.sourceChainId === ref.sourceChainId && isAddressEqual(candidate.collection, ref.collection),
        )
        if (collectionIndex === -1) return undefined
        const position = await readV3Nft(client, deployment, snapshot, account, ref)
        if (!position.eligible || (mode === 'stake' && position.seated)) return undefined
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
          name: metadata.name || collection?.name || sourceName(ref.sourceChainId),
          image: metadata.image || collection?.image,
        }
      }),
    )
    return {
      choices: choices.filter((choice): choice is Choice => Boolean(choice)),
      count: wallet.count,
      total,
      needsId,
    }
  }, [account, client, collections, deployment, manualIds, mode, offset, pool, rule])

  const options = useV3Query(`${mode}:${account}:${collectionIndex}:${offset}`, loadChoices)
  const max = pool.config.maxNftsPerWallet
  const currentCount = options.data?.count ?? 0
  const overLimit = mode === 'stake' && currentCount + selectedNfts.length > max
  const addToken = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!/^\d{1,78}$/.test(typedId) || BigInt(typedId) > UINT256_MAX) {
      setInputError(t('Enter a valid NFT token ID.'))
      return
    }
    const tokenId = BigInt(typedId)
    if (manualIds.includes(tokenId)) return
    if (manualIds.length === MAX_V3_PAGE) {
      setInputError(t('Check up to %count% NFT IDs at a time.', { count: MAX_V3_PAGE }))
      return
    }
    setManualIds((previous) => [...previous, tokenId])
    setTypedId('')
    setInputError('')
  }

  const dismiss = () => {
    if (!pending) dialog.current?.close()
  }

  const done = () => {
    onSuccess()
    dialog.current?.close()
  }

  const confirm = async (leave = false) => {
    if (wrongChain) {
      switchChain({ chainId: deployment.chainId })
      return
    }
    if (pending || options.loading || options.error || !selectedNfts.length || overLimit || action.unconfirmed) return
    if (mode === 'stake' && poolTiming(pool) !== 'Live') return
    setAttempted(true)
    const call =
      mode === 'stake'
        ? joinV3(
            deployment,
            pool.poolId,
            selectedNfts.map(({ ref }) => ref),
          )
        : manageV3Position(
            deployment,
            pool.poolId,
            selectedNfts[0].ref,
            mode === 'harvest' ? 'claim' : leave ? 'leave' : 'exit',
          )
    if (await action.run(call)) done()
  }

  return (
    <Dialog
      ref={dialog}
      aria-label={title}
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
      <NftSelectionModal
        title={title}
        initialFocus
        options={(options.data?.choices ?? []).map((choice) => {
          const key = nftRefKey(choice.ref)
          const label = `${choice.name} #${choice.ref.tokenId}`
          return {
            key,
            label,
            image: choice.image,
            selected: Boolean(selected[key]),
            onSelect: () =>
              setSelected((previous) => {
                if (previous[key]) {
                  const next = { ...previous }
                  delete next[key]
                  return next
                }
                return mode === 'stake' ? { ...previous, [key]: choice } : { [key]: choice }
              }),
          }
        })}
        loading={options.loading}
        error={Boolean(options.error)}
        onRetry={options.refresh}
        onDismiss={dismiss}
        onConfirm={() => void confirm()}
        pending={pending}
        disabled={
          !wrongChain &&
          (options.loading ||
            Boolean(options.error) ||
            !selectedNfts.length ||
            overLimit ||
            action.unconfirmed ||
            (mode === 'stake' && poolTiming(pool) !== 'Live'))
        }
        confirmLabel={wrongChain ? t('Switch network') : undefined}
        before={
          mode === 'stake' && (
            <>
              <NftSelectionLimit current={currentCount + selectedNfts.length} max={max} />
              {pool.collections.length > 1 && (
                <Field>
                  {t('Collection')}
                  <select
                    value={collectionIndex}
                    onChange={(event) => {
                      setCollectionIndex(Number(event.target.value))
                      setOffset(ZERO)
                      setTypedId('')
                      setInputError('')
                      setManualIds([])
                    }}
                  >
                    {pool.collections.map((item, index) => (
                      <option key={`${item.sourceChainId}:${item.collection}`} value={index}>
                        {collections[index]?.name ?? sourceName(item.sourceChainId)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </>
          )
        }
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
            {mode === 'stake' && options.data && (
              <>
                {options.data.needsId && (
                  <form aria-label={t('Check NFT token ID')} onSubmit={addToken}>
                    <Flex alignItems="flex-end" style={{ gap: 8 }}>
                      <Field>
                        {t('NFT token ID')}
                        <input
                          name="token-id"
                          value={typedId}
                          onChange={(event) => {
                            setTypedId(event.target.value)
                            setInputError('')
                          }}
                          inputMode="numeric"
                          maxLength={78}
                          autoComplete="off"
                          required
                        />
                      </Field>
                      <Button type="submit" variant="secondary" disabled={pending}>
                        {t('Check NFT')}
                      </Button>
                    </Flex>
                    {inputError && (
                      <Text small color="failure" role="alert">
                        {inputError}
                      </Text>
                    )}
                    {manualIds.length > 0 &&
                      !options.loading &&
                      !options.data.choices.some(({ ref }) => manualIds.includes(ref.tokenId)) && (
                        <Text small color="textSubtle">
                          {t('No eligible NFT was found for the checked IDs.')}
                        </Text>
                      )}
                  </form>
                )}
                {selectedNfts.length > 0 && (
                  <Text small color="textSubtle">
                    {t('Estimated next 24 hours')}:{' '}
                    {pool.rewards
                      .map(
                        (reward) =>
                          `${shortAmount(
                            positionDailyEstimate(
                              pool,
                              reward,
                              selectedNfts.reduce((sum, choice) => sum + choice.weight, 0),
                              currentCount > 0,
                            ),
                            reward.decimals,
                          )} ${reward.symbol}`,
                      )
                      .join(' · ')}
                  </Text>
                )}
                <Text small color="textSubtle">
                  {t('Your NFTs stay in your wallet. Confirm participation in your wallet.')}
                </Text>
              </>
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
            {mode === 'unstake' && selectedNfts.length === 1 && !wrongChain && (
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
                  if (await action.recheck()) done()
                }}
              >
                {t('Retry on-chain verification')}
              </Button>
            )}
          </Flex>
        }
      />
    </Dialog>
  )
}
