import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Contract } from '@ethersproject/contracts'
import { formatBaseUnits, formatBaseUnitsExact, calculatePoolEconomics, parseUnitsExact } from '../economics'
import { getNftQuoteState } from '../quotes'
import { createNftRewardQuoteProvider } from '../quotes'
import {
  validateNftCollectionAddress,
  validateRewardTokenAddress,
  validateNftPoolDraft,
  buildNftPoolDeploymentPlan,
} from '../validation'
import { createEmptyNftPoolDraft, createNftPoolCloneDraft, findNftCollection, nftCollectionId } from '../registry'
import { useNftPoolRegistry } from '../hooks'
import { loadNftPoolDraft, loadNftPoolDraftForSourcePool, saveNftPoolDraft } from '../storage'
import { createNftPoolLaunchSession, findActiveNftPoolLaunchSession, saveNftPoolLaunchSession } from '../launch/storage'
import { runNftPoolPreflight } from '../launch/preflight'
import type { NftPreflightResult } from '../launch/types'
import { NftCollection, NftPoolDraft as NftPoolDraftModel, NftPoolDraftReward } from '../types'
import { simplePolygonRpcProvider } from 'utils/providers'
import { mainnetTokens } from 'config/constants/tokens'
import erc20Abi from 'config/abi/erc20.json'
import useWeb3React from 'hooks/useWeb3React'
import AdminShell from 'features/poolManager/components/AdminShell'
import {
  ActionButton,
  ButtonRow,
  Field,
  FormGrid,
  Input,
  LinkText,
  Muted,
  Notice,
  Panel,
  PanelTitle,
  Select,
  StatusPill,
} from 'features/poolManager/components/styles'
import {
  AssetRow,
  BuilderContent,
  BuilderShell,
  DraftCollectionRow,
  PreviewBody,
  PreviewCard,
  PreviewImage,
  Readiness,
  SmallAction,
  StepButton,
  StepNav,
  TokenChip,
  TokenDot,
} from './styles'
import NftPoolCardStudio from './studio/NftPoolCardStudio'

const steps = ['NFTs', 'Rewards', 'Budget', 'Duration', 'Appearance', 'Review']
const EMPTY_COLLECTIONS: NftCollection[] = []
const knownRewards = Array.from(
  new Map(
    (Object.values(mainnetTokens) as any[])
      .filter((token) => token?.chainId === 137 && token?.address)
      .map((token) => [token.address.toLowerCase(), token]),
  ).values(),
)

function rewardFromToken(token: any): NftPoolDraftReward {
  return { address: token.address, symbol: token.symbol, name: token.name || token.symbol, decimals: token.decimals }
}

function short(address: string): string {
  return address.length > 16 ? `${address.slice(0, 8)}…${address.slice(-6)}` : address
}

function withAllocation(draft: NftPoolDraftModel, rewards: NftPoolDraftReward[]): NftPoolDraftModel['economics'] {
  const allocationBps = { ...draft.economics.allocationBps }
  rewards.forEach((reward, index) => {
    if (allocationBps[reward.address.toLowerCase()] === undefined)
      allocationBps[reward.address.toLowerCase()] = index === 0 ? '10000' : '0'
  })
  return { ...draft.economics, allocationBps }
}

export default function PoolBuilder() {
  const router = useRouter()
  const cloneId = typeof router.query.clone === 'string' ? router.query.clone : ''
  const savedDraftId = typeof router.query.draft === 'string' ? router.query.draft : ''
  const { data, loading, error } = useNftPoolRegistry()
  const [draft, setDraft] = useState<NftPoolDraftModel>(() => createEmptyNftPoolDraft())
  const [mode, setMode] = useState<'card' | 'advanced'>('card')
  const [step, setStep] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const [draftTouched, setDraftTouched] = useState(false)
  const [message, setMessage] = useState('')
  const [collectionAddress, setCollectionAddress] = useState('')
  const [rewardAddress, setRewardAddress] = useState('')
  const [sideRewardAddress, setSideRewardAddress] = useState('')
  const [validationMessage, setValidationMessage] = useState('')
  const [validating, setValidating] = useState(false)
  const [quoteBusy, setQuoteBusy] = useState(false)
  const [walletBalanceBusy, setWalletBalanceBusy] = useState(false)
  const [walletBalances, setWalletBalances] = useState<Record<string, string>>({})
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewResult, setReviewResult] = useState<NftPreflightResult | null>(null)
  const { account, library } = useWeb3React()

  const sourcePool = useMemo(
    () =>
      data?.pools.find(
        (pool) =>
          pool.id.toLowerCase() === cloneId.toLowerCase() ||
          pool.canonicalId.toLowerCase() === cloneId.toLowerCase() ||
          pool.address.toLowerCase() === cloneId.toLowerCase(),
      ),
    [cloneId, data?.pools],
  )
  const validation = useMemo(
    () =>
      validateNftPoolDraft(draft, data?.secondsPerBlock || 2.2, false, {
        factoryAddress: data?.factoryAddress,
        intendedAdmin: account || draft.intendedAdmin,
      }),
    [account, data?.factoryAddress, data?.secondsPerBlock, draft],
  )
  const economics =
    validation.economics ||
    (draft.rewards.primary ? calculatePoolEconomics(draft, data?.secondsPerBlock || 2.2) : undefined)
  const budgetPreview = useMemo(
    () => calculatePoolEconomics(draft, data?.secondsPerBlock || 2.2),
    [data?.secondsPerBlock, draft],
  )
  const plan = economics
    ? buildNftPoolDeploymentPlan(draft, economics, data?.factoryAddress, account || draft.intendedAdmin, validation)
    : null
  const knownCollections = data?.collections ?? EMPTY_COLLECTIONS
  const rewards = [draft.rewards.primary, ...draft.rewards.side].filter(Boolean) as NftPoolDraftReward[]
  const rewardAddresses = rewards.map((reward) => reward.address.toLowerCase()).join('|')
  const allocationKey = JSON.stringify(draft.economics.allocationBps)

  useEffect(() => {
    if (!account || draft.intendedAdmin?.toLowerCase() === account.toLowerCase()) return
    setDraft((current) => ({ ...current, intendedAdmin: account, updatedAt: Date.now() }))
  }, [account, draft.intendedAdmin])

  useEffect(() => {
    if (!router.isReady) return
    if (savedDraftId) {
      setMode('card')
      const saved = loadNftPoolDraft(savedDraftId)
      if (saved && saved.id !== draft.id) {
        setDraft(saved)
        setDraftTouched(false)
      }
      setHydrated(true)
      return
    }
    if (cloneId) {
      setMode('card')
      const savedClone = loadNftPoolDraftForSourcePool(sourcePool?.id || cloneId)
      if (savedClone && savedClone.id !== draft.id) {
        setDraft(savedClone)
        setDraftTouched(false)
        setHydrated(true)
      } else if (sourcePool && draft.sourcePoolId !== sourcePool.id) {
        setDraft(createNftPoolCloneDraft(sourcePool, data?.secondsPerBlock || 2.2))
        setDraftTouched(false)
        setHydrated(true)
      } else if (!loading) {
        setHydrated(true)
      }
      return
    }
    setHydrated(true)
  }, [cloneId, data?.secondsPerBlock, draft.id, draft.sourcePoolId, loading, router.isReady, savedDraftId, sourcePool])

  useEffect(() => {
    if (!hydrated || !draftTouched) return undefined
    const timeout = setTimeout(() => saveNftPoolDraft({ ...draft, readiness: validation.readiness }), 450)
    return () => clearTimeout(timeout)
  }, [draft, draftTouched, hydrated, validation.readiness])

  const updateDraft = (patch: Partial<NftPoolDraftModel>) => {
    setDraftTouched(true)
    setDraft((current) => ({ ...current, ...patch, updatedAt: Date.now() }))
    setReviewResult(null)
    setMessage('')
  }

  const updateEconomics = (patch: Partial<NftPoolDraftModel['economics']>) => {
    const quoteInputChanged = ['budgetTokenAddress', 'budgetDecimals', 'totalBudget', 'allocationBps'].some(
      (key) => key in patch,
    )
    const quoteResultPatch = 'quotes' in patch || 'quoteErrors' in patch
    updateDraft({
      economics: {
        ...draft.economics,
        ...patch,
        ...(quoteInputChanged && !quoteResultPatch ? { quotes: {}, quoteErrors: {} } : {}),
      },
    })
  }

  const addCollection = (collection: NftCollection) => {
    if (draft.collections.some((item) => item.address.toLowerCase() === collection.address.toLowerCase())) return
    const next = [
      ...draft.collections,
      {
        chainId: 137,
        address: collection.address,
        collectionId: collection.id,
        name: collection.displayName || collection.name,
        weight: '1',
        primary: draft.collections.length === 0,
      },
    ]
    updateDraft({
      collections: next,
      name: draft.name.trim() ? draft.name : `${collection.displayName || collection.name} Rewards`,
    })
  }

  const addCustomCollection = async (input = collectionAddress) => {
    setValidating(true)
    setValidationMessage('Checking collection…')
    try {
      const result = await validateNftCollectionAddress(simplePolygonRpcProvider, input)
      if (!result.valid) {
        setValidationMessage(result.reason || 'Collection validation failed.')
        return
      }
      addCollection({
        id: nftCollectionId(137, result.address),
        chainId: 137,
        address: result.address,
        name: result.name || 'NFT collection',
        symbol: result.symbol || 'NFT',
        displayName: result.name || result.symbol || 'NFT collection',
        source: 'on-chain',
        verification: 'VERIFIED',
      })
      setCollectionAddress('')
      setValidationMessage('Collection added.')
    } catch (collectionError) {
      setValidationMessage(collectionError instanceof Error ? collectionError.message : 'Collection validation failed.')
    } finally {
      setValidating(false)
    }
  }

  const setPrimary = (address: string) =>
    updateDraft({ collections: draft.collections.map((item) => ({ ...item, primary: item.address === address })) })

  const removeCollection = (address: string) => {
    const next = draft.collections.filter((item) => item.address !== address)
    if (next.length && !next.some((item) => item.primary)) next[0] = { ...next[0], primary: true }
    updateDraft({ collections: next })
  }

  const moveCollection = (address: string, direction: -1 | 1) => {
    const index = draft.collections.findIndex((item) => item.address === address)
    const target = index + direction
    if (index < 0 || target < 0 || target >= draft.collections.length) return
    const next = [...draft.collections]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    updateDraft({ collections: next })
  }

  const setPrimaryRewardAsset = (primary: NftPoolDraftReward | null) => {
    const nextRewards = [primary, ...draft.rewards.side].filter(Boolean) as NftPoolDraftReward[]
    updateDraft({
      rewards: { ...draft.rewards, primary },
      economics: { ...withAllocation(draft, nextRewards), quotes: {}, quoteErrors: {} },
    })
  }

  const setPrimaryReward = (address: string) => {
    const token = knownRewards.find((item: any) => item.address.toLowerCase() === address.toLowerCase())
    setPrimaryRewardAsset(token ? rewardFromToken(token) : null)
  }

  const addSideReward = (reward: NftPoolDraftReward) => {
    if (!draft.rewards.primary || reward.address.toLowerCase() === draft.rewards.primary.address.toLowerCase()) return
    if (draft.rewards.side.some((item) => item.address.toLowerCase() === reward.address.toLowerCase())) return
    const side = [...draft.rewards.side, reward]
    const nextRewards = [draft.rewards.primary, ...side] as NftPoolDraftReward[]
    updateDraft({
      rewards: { ...draft.rewards, side },
      economics: { ...withAllocation(draft, nextRewards), quotes: {}, quoteErrors: {} },
    })
  }

  const addCustomReward = async (side: boolean, input = side ? sideRewardAddress : rewardAddress) => {
    setValidating(true)
    setValidationMessage('Checking reward token…')
    try {
      const result = await validateRewardTokenAddress(simplePolygonRpcProvider, input)
      if (!result.valid) {
        setValidationMessage(result.reason || 'Token validation failed.')
        return
      }
      const reward = {
        address: result.address,
        symbol: result.symbol || 'TOKEN',
        name: result.name || 'Token',
        decimals: result.decimals,
      }
      if (side) addSideReward(reward)
      else setPrimaryRewardAsset(reward)
      if (side) setSideRewardAddress('')
      else setRewardAddress('')
      setValidationMessage('Reward token added.')
    } catch (rewardError) {
      setValidationMessage(rewardError instanceof Error ? rewardError.message : 'Token validation failed.')
    } finally {
      setValidating(false)
    }
  }

  const removeSideReward = (address: string) => {
    const side = draft.rewards.side.filter((reward) => reward.address !== address)
    const allocationBps = { ...draft.economics.allocationBps }
    delete allocationBps[address.toLowerCase()]
    updateDraft({
      rewards: { ...draft.rewards, side },
      economics: { ...draft.economics, allocationBps, quotes: {}, quoteErrors: {} },
    })
  }

  const updateCollectionWeight = (address: string, weight: string) => {
    updateDraft({
      collections: draft.collections.map((item) =>
        item.address.toLowerCase() === address.toLowerCase() ? { ...item, weight } : item,
      ),
    })
  }

  const updateAllocation = (address: string, bps: string) => {
    updateEconomics({
      allocationBps: { ...draft.economics.allocationBps, [address.toLowerCase()]: bps },
    })
  }

  const refreshQuotes = async () => {
    if (
      !draft.economics.budgetTokenAddress ||
      !draft.economics.totalBudget ||
      draft.economics.budgetDecimals === undefined
    )
      return
    setQuoteBusy(true)
    setValidationMessage('Reading router quotes…')
    try {
      const inputBaseUnits = parseUnitsExact(draft.economics.totalBudget, draft.economics.budgetDecimals)
      if (!inputBaseUnits) throw new Error('Enter a valid total budget first.')
      const provider = createNftRewardQuoteProvider(simplePolygonRpcProvider)
      const quoteEconomics = calculatePoolEconomics(draft, data?.secondsPerBlock || 2.2)
      const quotes = { ...draft.economics.quotes }
      const quoteErrors = { ...draft.economics.quoteErrors }
      const results = await Promise.allSettled(
        rewards.map(async (reward) => {
          const allocation = quoteEconomics.budgetAllocations.find(
            (item) => item.tokenAddress.toLowerCase() === reward.address.toLowerCase(),
          )
          if (!allocation || allocation.allocatedBudget.isZero()) throw new Error('Reward allocation must be positive.')
          const quote = await provider.quote({
            budgetTokenAddress: draft.economics.budgetTokenAddress!,
            rewardTokenAddress: reward.address,
            amountBaseUnits: allocation.allocatedBudget,
          })
          return {
            key: reward.address.toLowerCase(),
            quote: {
              budgetTokenAddress: quote.budgetTokenAddress,
              rewardTokenAddress: quote.rewardTokenAddress,
              inputAmount: formatBaseUnitsExact(quote.inputAmountBaseUnits, draft.economics.budgetDecimals),
              outputAmount: formatBaseUnitsExact(quote.outputAmountBaseUnits, reward.decimals),
              source: quote.source,
              sourceLabel: quote.sourceLabel,
              path: quote.path,
              allocationBps: allocation.allocationBps.toString(),
              totalBudget: draft.economics.totalBudget || '',
              quotedAt: quote.quotedAt,
              freshnessSeconds: quote.freshnessSeconds,
              expirySeconds: quote.expirySeconds,
            },
          }
        }),
      )
      const failed: string[] = []
      results.forEach((result, index) => {
        const reward = rewards[index]
        const key = reward.address.toLowerCase()
        if (result.status === 'fulfilled') {
          quotes[key] = result.value.quote
          delete quoteErrors[key]
        } else {
          delete quotes[key]
          const reason = result.reason instanceof Error ? result.reason.message : 'Quote unavailable.'
          quoteErrors[key] = reason
          failed.push(`${reward.symbol}: ${reason}`)
        }
      })
      updateEconomics({ quotes, quoteErrors })
      setValidationMessage(
        failed.length
          ? `Some quotes need manual amounts. ${failed.join(' · ')}`
          : 'Quotes updated. They are read-only and expire quickly.',
      )
    } catch (quoteError) {
      setValidationMessage(
        quoteError instanceof Error ? quoteError.message : 'No read-only quote was found. Add exact manual amounts.',
      )
    } finally {
      setQuoteBusy(false)
    }
  }

  useEffect(() => {
    if (mode === 'advanced' || !hydrated || !draft.rewards.primary || !draft.economics.totalBudget) return undefined
    if (
      !draft.economics.budgetDecimals ||
      !parseUnitsExact(draft.economics.totalBudget, draft.economics.budgetDecimals)
    )
      return undefined
    const timeout = setTimeout(() => void refreshQuotes(), 700)
    return () => clearTimeout(timeout)
    // refreshQuotes intentionally follows the Card Studio input dependencies;
    // its quote result must not retrigger the debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocationKey, draft.economics.budgetDecimals, draft.economics.totalBudget, hydrated, mode, rewardAddresses])

  const readWalletBalances = async () => {
    if (!account) return
    setWalletBalanceBusy(true)
    try {
      const balances: Record<string, string> = {}
      await Promise.all(
        rewards.map(async (reward) => {
          const value = await new Contract(reward.address, erc20Abi, simplePolygonRpcProvider).balanceOf(account)
          balances[reward.address.toLowerCase()] = formatBaseUnits(value, reward.decimals)
        }),
      )
      setWalletBalances(balances)
    } catch {
      setValidationMessage('Wallet balances could not be read from the Polygon RPC.')
    } finally {
      setWalletBalanceBusy(false)
    }
  }

  const save = () => {
    saveNftPoolDraft({ ...draft, intendedAdmin: account || draft.intendedAdmin, readiness: validation.readiness })
    setMessage('Draft saved locally. No blockchain transaction was sent.')
  }

  const startPreflight = () => {
    if (!plan || validation.readiness !== 'READY_FOR_DRY_RUN' || !account) {
      setMessage('Complete the blocking review items and connect the intended admin wallet first.')
      return
    }
    const existing = findActiveNftPoolLaunchSession(draft.id)
    if (existing) {
      router.push(`/admin/nft-pools/launch/${existing.sessionId}`)
      return
    }
    saveNftPoolDraft({ ...draft, intendedAdmin: account, readiness: validation.readiness })
    const session = createNftPoolLaunchSession(plan, 137, plan.factoryAddress, account)
    saveNftPoolLaunchSession(session)
    router.push(`/admin/nft-pools/launch/${session.sessionId}`)
  }

  const reviewPool = async () => {
    if (!plan || validation.blockers.length || !account || !library) {
      setMessage('Complete the blocking card items and connect the intended Polygon admin wallet first.')
      return
    }
    setReviewBusy(true)
    setReviewResult(null)
    setMessage('Checking Polygon setup, balances, gas and the launch simulation…')
    try {
      const network = await library.getNetwork()
      const result = await runNftPoolPreflight({
        provider: simplePolygonRpcProvider,
        signer: library.getSigner(),
        plan,
        account,
        walletChainId: network.chainId,
      })
      setReviewResult(result)
      setMessage(
        result.ok
          ? 'Review passed. No transaction was sent; Create Pool will open the wallet launch flow.'
          : 'Review found blockers. Resolve them and run the checks again.',
      )
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Pool review could not be completed.')
    } finally {
      setReviewBusy(false)
    }
  }

  const createReviewedPool = () => {
    if (!reviewResult?.ok || !plan || !account) return
    const existing = findActiveNftPoolLaunchSession(draft.id)
    if (existing) {
      router.push(`/admin/nft-pools/launch/${existing.sessionId}`)
      return
    }
    const reviewedDraft = { ...draft, intendedAdmin: account, readiness: validation.readiness }
    saveNftPoolDraft(reviewedDraft)
    const session = createNftPoolLaunchSession(plan, 137, plan.factoryAddress, account)
    saveNftPoolLaunchSession({
      ...session,
      preflight: reviewResult,
      schedule: reviewResult.schedule,
      currentStage: 'PREFLIGHT_READY',
    })
    router.push(`/admin/nft-pools/launch/${session.sessionId}`)
  }

  const renderStep = () => {
    if (step === 0)
      return (
        <Panel>
          <PanelTitle>Choose staking NFTs</PanelTitle>
          <Muted>
            Select an existing registry entry or validate any ERC-721 deployed on Polygon. One primary collection is
            required.
          </Muted>
          <FormGrid style={{ marginTop: 16 }}>
            <Field>
              Existing Polygon collection
              <Select
                value=""
                onChange={(event) => {
                  const selected = findNftCollection(knownCollections, 137, event.target.value)
                  if (selected) addCollection(selected)
                }}
              >
                <option value="">Add a collection…</option>
                {knownCollections.map((collection) => (
                  <option value={collection.address} key={collection.id}>
                    {collection.displayName} · {short(collection.address)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Any ERC-721 address
              <Input
                value={collectionAddress}
                onChange={(event) => setCollectionAddress(event.target.value)}
                placeholder="0x…"
              />
            </Field>
          </FormGrid>
          <ButtonRow>
            <ActionButton onClick={() => void addCustomCollection()} disabled={validating || !collectionAddress}>
              Validate and add
            </ActionButton>
          </ButtonRow>
          {draft.collections.map((collection) => (
            <DraftCollectionRow key={collection.collectionId}>
              <div>
                <strong>{collection.name}</strong>
                <Muted style={{ display: 'block', fontSize: 12 }}>
                  {collection.primary ? 'Primary collection' : 'Community collection'} · {short(collection.address)}
                </Muted>
              </div>
              <Field>
                Power
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={collection.weight}
                  onChange={(event) =>
                    updateDraft({
                      collections: draft.collections.map((item) =>
                        item.address === collection.address ? { ...item, weight: event.target.value } : item,
                      ),
                    })
                  }
                />
              </Field>
              <ButtonRow style={{ marginTop: 0 }}>
                <SmallAction onClick={() => moveCollection(collection.address, -1)}>Up</SmallAction>
                <SmallAction onClick={() => moveCollection(collection.address, 1)}>Down</SmallAction>
                <SmallAction onClick={() => setPrimary(collection.address)}>
                  {collection.primary ? 'Primary' : 'Make primary'}
                </SmallAction>
                <SmallAction onClick={() => removeCollection(collection.address)}>Remove</SmallAction>
              </ButtonRow>
            </DraftCollectionRow>
          ))}
        </Panel>
      )
    if (step === 1)
      return (
        <Panel>
          <PanelTitle>Choose rewards</PanelTitle>
          <Muted>
            Primary reward is required. Side rewards are optional and are associated by canonical token address.
          </Muted>
          <Field style={{ marginTop: 16 }}>
            Primary reward
            <Select
              value={draft.rewards.primary?.address || ''}
              onChange={(event) => setPrimaryReward(event.target.value)}
            >
              <option value="">Choose a primary reward…</option>
              {knownRewards.map((token: any) => (
                <option key={token.address} value={token.address}>
                  {token.symbol} · {short(token.address)}
                </option>
              ))}
            </Select>
          </Field>
          <FormGrid style={{ marginTop: 12 }}>
            <Field>
              Custom primary ERC-20
              <Input
                value={rewardAddress}
                onChange={(event) => setRewardAddress(event.target.value)}
                placeholder="0x…"
              />
            </Field>
            <ButtonRow style={{ marginTop: 0 }}>
              <ActionButton onClick={() => addCustomReward(false)} disabled={validating || !rewardAddress}>
                Validate primary
              </ActionButton>
            </ButtonRow>
          </FormGrid>
          <Panel style={{ marginTop: 16, padding: 14 }}>
            <PanelTitle>Side rewards</PanelTitle>
            {draft.rewards.side.map((reward) => (
              <AssetRow key={reward.address}>
                <TokenChip>
                  <TokenDot>{reward.symbol.slice(0, 3)}</TokenDot>
                  <span>
                    {reward.symbol}
                    <Muted style={{ display: 'block', fontSize: 11 }}>
                      {short(reward.address)} · {reward.decimals ?? '?'} decimals
                    </Muted>
                  </span>
                </TokenChip>
                <SmallAction onClick={() => removeSideReward(reward.address)}>Remove</SmallAction>
              </AssetRow>
            ))}
            <FormGrid style={{ marginTop: 12 }}>
              <Field>
                Add known side reward
                <Select
                  value=""
                  onChange={(event) => {
                    const token = knownRewards.find(
                      (item: any) => item.address.toLowerCase() === event.target.value.toLowerCase(),
                    )
                    if (token) addSideReward(rewardFromToken(token))
                  }}
                >
                  <option value="">Choose token…</option>
                  {knownRewards.map((token: any) => (
                    <option key={token.address} value={token.address}>
                      {token.symbol}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                Custom side ERC-20
                <Input
                  value={sideRewardAddress}
                  onChange={(event) => setSideRewardAddress(event.target.value)}
                  placeholder="0x…"
                />
              </Field>
            </FormGrid>
            <ButtonRow>
              <ActionButton
                $secondary
                onClick={() => addCustomReward(true)}
                disabled={validating || !sideRewardAddress}
              >
                Validate and add side reward
              </ActionButton>
            </ButtonRow>
          </Panel>
        </Panel>
      )
    if (step === 2)
      return (
        <Panel>
          <PanelTitle>Set budget and allocations</PanelTitle>
          <Muted>
            Budget is denominated in USDT. It is separate from the reward tokens and never triggers a swap here.
          </Muted>
          <FormGrid style={{ marginTop: 16 }}>
            <Field>
              Budget denomination
              <Input value="USDT · Polygon" readOnly />
            </Field>
            <Field>
              Total budget
              <Input
                inputMode="decimal"
                value={draft.economics.totalBudget || ''}
                onChange={(event) => updateEconomics({ totalBudget: event.target.value })}
                placeholder="1000.00"
              />
            </Field>
          </FormGrid>
          <ButtonRow>
            <ActionButton $secondary onClick={refreshQuotes} disabled={quoteBusy || !rewards.length}>
              {quoteBusy ? 'Reading quotes…' : 'Refresh quotes'}
            </ActionButton>
          </ButtonRow>
          <Panel style={{ marginTop: 16, padding: 14 }}>
            <PanelTitle>Reward allocation</PanelTitle>
            <Muted>Basis points are exact: the total must be 10,000.</Muted>
            {rewards.map((reward) => {
              const key = reward.address.toLowerCase()
              const quote = draft.economics.quotes[key]
              const allocation = budgetPreview.budgetAllocations.find((item) => item.tokenAddress.toLowerCase() === key)
              const quoteState = quote ? getNftQuoteState(quote) : undefined
              return (
                <AssetRow key={reward.address}>
                  <TokenChip>
                    <TokenDot>{reward.symbol.slice(0, 3)}</TokenDot>
                    <span>
                      {reward.symbol}
                      <Muted style={{ display: 'block', fontSize: 11 }}>
                        Budget input {formatBaseUnitsExact(allocation?.allocatedBudget, draft.economics.budgetDecimals)}{' '}
                        · {quote ? `${quote.sourceLabel} · ${quoteState}` : 'No quote yet'}
                      </Muted>
                    </span>
                  </TokenChip>
                  <Field>
                    BPS
                    <Input
                      type="number"
                      min="0"
                      max="10000"
                      value={draft.economics.allocationBps[key] || '0'}
                      onChange={(event) =>
                        updateEconomics({
                          allocationBps: { ...draft.economics.allocationBps, [key]: event.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field>
                    Exact amount
                    <Input
                      inputMode="decimal"
                      value={draft.economics.manualAmounts[key] || ''}
                      onChange={(event) =>
                        updateEconomics({
                          manualAmounts: { ...draft.economics.manualAmounts, [key]: event.target.value },
                        })
                      }
                      placeholder="Manual fallback"
                    />
                    <Muted style={{ display: 'block', fontSize: 11 }}>
                      Exact token amount; valuation is not verified.
                    </Muted>
                  </Field>
                </AssetRow>
              )
            })}
          </Panel>
        </Panel>
      )
    if (step === 3)
      return (
        <Panel>
          <PanelTitle>Choose duration</PanelTitle>
          <Muted>
            Block estimates use the latest measured Polygon block time from the read-only provider (
            {(data?.secondsPerBlock || 2.2).toFixed(2)} seconds/block).
          </Muted>
          <Field style={{ marginTop: 16 }}>
            Duration preset
            <Select
              value={draft.economics.durationPreset}
              onChange={(event) => updateEconomics({ durationPreset: event.target.value as any })}
            >
              <option>1 month</option>
              <option>3 months</option>
              <option>6 months</option>
              <option>1 year</option>
              <option>custom</option>
            </Select>
          </Field>
          {draft.economics.durationPreset === 'custom' ? (
            <Field style={{ marginTop: 12 }}>
              Custom days
              <Input
                type="number"
                min="1"
                value={draft.economics.customDurationDays || ''}
                onChange={(event) => updateEconomics({ customDurationDays: event.target.value })}
              />
            </Field>
          ) : null}
          <Panel style={{ marginTop: 16, padding: 14 }}>
            <PanelTitle>Pool rules</PanelTitle>
            <FormGrid>
              <Field>
                Minimum effective staking power
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={draft.constraints.participantThreshold}
                  onChange={(event) =>
                    updateDraft({ constraints: { ...draft.constraints, participantThreshold: event.target.value } })
                  }
                  placeholder="e.g. 300"
                />
              </Field>
              <Field>
                Original configured capacity
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={draft.constraints.poolCapacity}
                  onChange={(event) =>
                    updateDraft({ constraints: { ...draft.constraints, poolCapacity: event.target.value } })
                  }
                  placeholder="e.g. 500"
                />
              </Field>
              <Field>
                Per-wallet limit
                <Select
                  value={draft.constraints.userLimitEnabled ? 'yes' : 'no'}
                  onChange={(event) =>
                    updateDraft({
                      constraints: { ...draft.constraints, userLimitEnabled: event.target.value === 'yes' },
                    })
                  }
                >
                  <option value="no">No per-user limit</option>
                  <option value="yes">Limit per user</option>
                </Select>
              </Field>
              {draft.constraints.userLimitEnabled ? (
                <>
                  <Field>
                    Maximum NFTs per wallet
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={draft.constraints.poolLimitPerUser}
                      onChange={(event) =>
                        updateDraft({ constraints: { ...draft.constraints, poolLimitPerUser: event.target.value } })
                      }
                    />
                  </Field>
                  <Field>
                    Limit duration (advanced blocks)
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={draft.constraints.numberBlocksForUserLimit}
                      onChange={(event) =>
                        updateDraft({
                          constraints: { ...draft.constraints, numberBlocksForUserLimit: event.target.value },
                        })
                      }
                    />
                    <Muted style={{ display: 'block', fontSize: 11 }}>
                      ≈{' '}
                      {draft.constraints.numberBlocksForUserLimit &&
                      Number(draft.constraints.numberBlocksForUserLimit) > 0
                        ? `${Math.round(
                            (Number(draft.constraints.numberBlocksForUserLimit) * (data?.secondsPerBlock || 2.2)) /
                              86400,
                          )} days at the current estimate`
                        : 'Human duration appears after a block value is entered.'}
                    </Muted>
                  </Field>
                </>
              ) : null}
              <Field>
                Post-deploy performance fee (wei, optional)
                <Input
                  inputMode="decimal"
                  value={draft.constraints.performanceFee}
                  onChange={(event) =>
                    updateDraft({ constraints: { ...draft.constraints, performanceFee: event.target.value } })
                  }
                  placeholder="Optional; not a factory input"
                />
              </Field>
              <Field>
                Performance fee recipient
                <Input
                  value={draft.constraints.performanceFeeRecipient}
                  onChange={(event) =>
                    updateDraft({
                      constraints: { ...draft.constraints, performanceFeeRecipient: event.target.value },
                    })
                  }
                  placeholder="0x… (required when fee is set)"
                />
              </Field>
            </FormGrid>
            <Muted style={{ display: 'block', marginTop: 12 }}>
              Performance fee is an optional post-deploy setting. A clone never copies the live fee automatically.
            </Muted>
          </Panel>
          <Notice style={{ marginTop: 16 }}>
            The source schedule is shown for comparison only. A clone never copies the old start or end block. Exact
            blocks are prepared during the final preflight.
          </Notice>
        </Panel>
      )
    if (step === 4)
      return (
        <Panel>
          <PanelTitle>Appearance</PanelTitle>
          <Muted>Use a public URL or a local preview. This phase does not upload or permanently store files.</Muted>
          <FormGrid style={{ marginTop: 16 }}>
            <Field>
              Pool name
              <Input
                value={draft.name}
                onChange={(event) => updateDraft({ name: event.target.value })}
                placeholder="e.g. CoinCollect rewards"
              />
            </Field>
            <Field>
              Project URL
              <Input
                value={draft.projectUrl || ''}
                onChange={(event) => updateDraft({ projectUrl: event.target.value })}
                placeholder="https://…"
              />
            </Field>
            <Field>
              Banner URL or local preview
              <Input
                value={draft.banner || ''}
                onChange={(event) => updateDraft({ banner: event.target.value })}
                placeholder="https://…"
              />
            </Field>
            <Field>
              Avatar URL
              <Input
                value={draft.avatar || ''}
                onChange={(event) => updateDraft({ avatar: event.target.value })}
                placeholder="https://…"
              />
            </Field>
          </FormGrid>
          <PreviewCard style={{ marginTop: 18 }}>
            <PreviewImage $src={draft.banner} />
            <PreviewBody>
              <StatusPill $status="ACTIVE">NFT POOL</StatusPill>
              <h3 style={{ margin: '10px 0 5px' }}>{draft.name || 'Untitled pool'}</h3>
              <Muted>
                {draft.rewards.primary?.symbol || 'No reward selected'} · {draft.collections.length} collection
                {draft.collections.length === 1 ? '' : 's'}
              </Muted>
            </PreviewBody>
          </PreviewCard>
        </Panel>
      )
    return (
      <>
        {sourcePool ? (
          <Panel>
            <PanelTitle>Source economics</PanelTitle>
            <Muted>Reference only. These values describe the old pool and are not new deployment inputs.</Muted>
            <FormGrid style={{ marginTop: 12 }}>
              <div>
                <Muted>Original reward / block</Muted>
                <div>
                  {formatBaseUnits(
                    sourcePool.sourceEconomics.originalRewardPerBlock,
                    sourcePool.rewards.primary.token.decimals,
                  )}
                </div>
              </div>
              <div>
                <Muted>Original schedule</Muted>
                <div>
                  {sourcePool.sourceEconomics.originalStartBlock?.toLocaleString() || 'Unavailable'} →{' '}
                  {sourcePool.sourceEconomics.originalEndBlock?.toLocaleString() || 'Unavailable'}
                </div>
              </div>
              <div>
                <Muted>Initial capacity</Muted>
                <div>{sourcePool.sourceEconomics.originalInitialPoolCapacity?.toString() || 'Unavailable'}</div>
              </div>
              <div>
                <Muted>Current remaining capacity</Muted>
                <div>{sourcePool.sourceEconomics.currentRemainingCapacity?.toString() || 'Unavailable'}</div>
              </div>
              <div>
                <Muted>Previous performance fee</Muted>
                <div>{sourcePool.sourceEconomics.originalPerformanceFee?.toString() || '0'}</div>
              </div>
              <div>
                <Muted>Original user-limit source</Muted>
                <div>{sourcePool.sourceEconomics.userLimitSource || 'Unavailable'}</div>
              </div>
            </FormGrid>
          </Panel>
        ) : null}
        <Panel>
          <PanelTitle>Deployment review</PanelTitle>
          <Readiness
            $tone={validation.readiness === 'READY_FOR_DRY_RUN' ? 'good' : validation.blockers.length ? 'bad' : 'warn'}
          >
            {validation.readiness === 'READY_FOR_DRY_RUN' ? 'Ready to create' : validation.readiness.replace(/_/g, ' ')}
          </Readiness>
          {validation.blockers.length ? (
            <Notice $error style={{ marginTop: 12 }}>
              <strong>Blocking items</strong>
              <ul>
                {validation.blockers.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Notice>
          ) : null}
          {validation.warnings.length ? (
            <Notice style={{ marginTop: 12 }}>
              <strong>Review items</strong>
              <ul>
                {validation.warnings.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Notice>
          ) : null}
          {validation.information.length ? (
            <Notice style={{ marginTop: 12 }}>
              <strong>Planning notes</strong>
              <ul>
                {validation.information.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Notice>
          ) : null}
          <FormGrid style={{ marginTop: 16 }}>
            <div>
              <Muted>Pool</Muted>
              <div>{draft.name || 'Untitled draft'}</div>
            </div>
            <div>
              <Muted>Rewards</Muted>
              <div>{rewards.map((reward) => reward.symbol).join(' + ') || 'None selected'}</div>
            </div>
            <div>
              <Muted>Estimated blocks</Muted>
              <div>{economics?.blocks?.toLocaleString() || '—'}</div>
            </div>
            <div>
              <Muted>Primary reward / block</Muted>
              <div>{formatBaseUnits(economics?.primary.rewardPerBlock, draft.rewards.primary?.decimals)}</div>
            </div>
          </FormGrid>
          {economics ? (
            <Panel style={{ marginTop: 16, padding: 14 }}>
              <PanelTitle>Funding preview</PanelTitle>
              <Muted>
                Budget {draft.economics.totalBudget || '—'} {draft.economics.budgetDenomination || 'USDT'} · budget
                rounding remainder {formatBaseUnits(economics.budgetRoundingRemainder, draft.economics.budgetDecimals)}
              </Muted>
              <ButtonRow style={{ marginTop: 0 }}>
                <ActionButton $secondary onClick={readWalletBalances} disabled={walletBalanceBusy || !account}>
                  {walletBalanceBusy ? 'Reading wallet…' : 'Read wallet balances'}
                </ActionButton>
                <Muted>Optional, read-only</Muted>
              </ButtonRow>
              <div style={{ marginTop: 12 }}>
                <Muted>Primary maximum scheduled funding</Muted>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '8px 0',
                    borderBottom: '1px solid currentColor',
                    borderColor: 'inherit',
                  }}
                >
                  <span>
                    {draft.rewards.primary?.symbol || short(economics.primary.tokenAddress)}
                    <Muted style={{ display: 'block', fontSize: 11 }}>
                      Desired {formatBaseUnits(economics.primary.desiredAmount, economics.primary.decimals)} ·{' '}
                      {economics.primary.source} · residual{' '}
                      {formatBaseUnits(economics.primary.residual, economics.primary.decimals)}
                      {walletBalances[economics.primary.tokenAddress.toLowerCase()]
                        ? ` · wallet ${walletBalances[economics.primary.tokenAddress.toLowerCase()]}`
                        : ''}
                    </Muted>
                  </span>
                  <strong>
                    {formatBaseUnits(economics.primary.maximumScheduledFunding, economics.primary.decimals)}
                  </strong>
                </div>
              </div>
              {economics.side.map((item) => (
                <div key={`side-${item.tokenAddress}`} style={{ marginTop: 9, fontSize: 12 }}>
                  <strong>
                    {rewards.find((reward) => reward.address.toLowerCase() === item.tokenAddress.toLowerCase())
                      ?.symbol || short(item.tokenAddress)}{' '}
                    maximum implied side funding:{' '}
                    {formatBaseUnits(
                      item.maximumImpliedSideFunding,
                      draft.rewards.side.find(
                        (reward) => reward.address.toLowerCase() === item.tokenAddress.toLowerCase(),
                      )?.decimals,
                    )}
                  </strong>
                  <br />
                  <Muted>
                    Desired{' '}
                    {formatBaseUnits(
                      item.desiredSideAmount,
                      draft.rewards.side.find(
                        (reward) => reward.address.toLowerCase() === item.tokenAddress.toLowerCase(),
                      )?.decimals,
                    )}{' '}
                    · encoded ratio {item.encodedPercentage.toString()}% · deviation{' '}
                    {formatBaseUnits(
                      item.deviationFromDesired,
                      draft.rewards.side.find(
                        (reward) => reward.address.toLowerCase() === item.tokenAddress.toLowerCase(),
                      )?.decimals,
                    )}{' '}
                    ({item.deviationBps.toString()} bps) · {item.representability}
                  </Muted>
                </div>
              ))}
              <Muted style={{ display: 'block', marginTop: 12 }}>
                Actual side payouts may be lower because the contract calculates side rewards when primary rewards are
                claimed.
              </Muted>
            </Panel>
          ) : null}
          <Panel style={{ marginTop: 16, padding: 14 }}>
            <PanelTitle>Launch checklist</PanelTitle>
            <ul>
              <li>Refresh the Polygon block, authority, balances, gas and quotes immediately before signing.</li>
              <li>Configure collection powers before the pool is considered launch-complete.</li>
              <li>Simulate, approve and fund only the final verified plan.</li>
            </ul>
          </Panel>
          <details style={{ marginTop: 16 }}>
            <summary>Advanced exact parameters</summary>
            <pre style={{ overflowX: 'auto', fontSize: 11, lineHeight: 1.5 }}>
              {plan ? JSON.stringify(plan, null, 2) : 'Complete the required fields to review the deployment plan.'}
            </pre>
          </details>
          <ButtonRow>
            <ActionButton onClick={save}>Save draft</ActionButton>
            <ActionButton
              onClick={startPreflight}
              disabled={!plan || validation.readiness !== 'READY_FOR_DRY_RUN' || !account}
            >
              Create Pool
            </ActionButton>
          </ButtonRow>
        </Panel>
      </>
    )
  }

  return (
    <AdminShell
      title={sourcePool ? (sourcePool.status === 'FINISHED' ? 'Renew NFT pool' : 'Duplicate NFT pool') : 'New NFT pool'}
      subtitle="Edit the NFT staking card your community will eventually see."
      authorityScope="nft"
    >
      {error ? <Notice $error>{error}</Notice> : null}
      {loading ? (
        <Notice>
          Registry details are loading in the background. Configured collections and rewards are available now.
        </Notice>
      ) : null}
      {cloneId && !loading && !sourcePool ? (
        <Notice $error>Clone source was not found in the current registry.</Notice>
      ) : null}
      {sourcePool ? (
        <Notice>
          {sourcePool.status === 'FINISHED' ? 'Renewing' : 'Duplicating'} <strong>{sourcePool.metadata.name}</strong>.
          Safe metadata and editable configuration were copied; address, old schedule, runtime balances and liabilities
          were not.
        </Notice>
      ) : null}
      {validationMessage ? <Notice>{validationMessage}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      <ButtonRow style={{ marginTop: 0, marginBottom: 14 }}>
        <ActionButton $secondary={mode !== 'card'} onClick={() => setMode('card')}>
          Card Studio
        </ActionButton>
        <ActionButton $secondary={mode !== 'advanced'} onClick={() => setMode('advanced')}>
          Advanced details
        </ActionButton>
        <Muted>
          {mode === 'card' ? 'Edit the pool users will see' : 'Protocol controls for experienced operators'}
        </Muted>
      </ButtonRow>
      {mode === 'card' ? (
        <NftPoolCardStudio
          draft={draft}
          knownCollections={knownCollections}
          knownRewards={knownRewards as NftPoolDraftReward[]}
          economics={economics}
          validation={validation}
          secondsPerBlock={data?.secondsPerBlock || 2.2}
          sourcePool={sourcePool}
          quoteBusy={quoteBusy}
          walletBalanceBusy={walletBalanceBusy}
          walletBalances={walletBalances}
          account={account || undefined}
          reviewBusy={reviewBusy}
          reviewResult={reviewResult}
          onUpdateDraft={updateDraft}
          onUpdateEconomics={updateEconomics}
          onAddCollection={addCollection}
          onRemoveCollection={removeCollection}
          onUpdateCollectionWeight={updateCollectionWeight}
          onAddCustomCollection={(address) => addCustomCollection(address)}
          onSetPrimaryReward={setPrimaryRewardAsset}
          onAddSideReward={addSideReward}
          onRemoveSideReward={removeSideReward}
          onAddCustomReward={(side, address) => addCustomReward(side, address)}
          onUpdateAllocation={updateAllocation}
          onRefreshQuotes={() => void refreshQuotes()}
          onReadWalletBalances={() => void readWalletBalances()}
          onSave={save}
          onReview={() => void reviewPool()}
          onCreatePool={createReviewedPool}
          onOpenAdvanced={() => setMode('advanced')}
        />
      ) : (
        <BuilderShell>
          <StepNav aria-label="Advanced pool configuration steps">
            {steps.map((label, index) => (
              <StepButton
                type="button"
                key={label}
                $active={step === index}
                $complete={index < step}
                onClick={() => setStep(index)}
              >
                {label}
              </StepButton>
            ))}
          </StepNav>
          <BuilderContent>
            {renderStep()}
            <ButtonRow style={{ justifyContent: 'space-between' }}>
              <ActionButton $secondary onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
                Back
              </ActionButton>
              <Muted>
                Step {step + 1} of {steps.length} · Autosaves locally
              </Muted>
              {step < steps.length - 1 ? (
                <ActionButton onClick={() => setStep(Math.min(steps.length - 1, step + 1))}>Continue</ActionButton>
              ) : null}
            </ButtonRow>
          </BuilderContent>
        </BuilderShell>
      )}
      <p style={{ marginTop: 18 }}>
        <Link href="/admin/nft-pools">Back to NFT pools</Link>
        {' · '}
        <LinkText href="/docs/nft-pool-manager">Read the architecture notes</LinkText>
      </p>
    </AdminShell>
  )
}
