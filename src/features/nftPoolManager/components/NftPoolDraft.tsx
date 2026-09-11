import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Contract } from '@ethersproject/contracts'
import { formatBaseUnits, calculatePoolEconomics, parseUnitsExact } from '../economics'
import { createNftRewardQuoteProvider } from '../quotes'
import {
  validateNftCollectionAddress,
  validateRewardTokenAddress,
  validateNftPoolDraft,
  buildNftPoolDeploymentPlan,
} from '../validation'
import { createEmptyNftPoolDraft, createNftPoolCloneDraft, findNftCollection, nftCollectionId } from '../registry'
import { useNftPoolRegistry } from '../hooks'
import { loadNftPoolDraft, saveNftPoolDraft } from '../storage'
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

const steps = ['NFTs', 'Rewards', 'Budget', 'Duration', 'Appearance', 'Review']
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
  const [step, setStep] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const [message, setMessage] = useState('')
  const [collectionAddress, setCollectionAddress] = useState('')
  const [rewardAddress, setRewardAddress] = useState('')
  const [sideRewardAddress, setSideRewardAddress] = useState('')
  const [validationMessage, setValidationMessage] = useState('')
  const [validating, setValidating] = useState(false)
  const [quoteBusy, setQuoteBusy] = useState(false)
  const [walletBalanceBusy, setWalletBalanceBusy] = useState(false)
  const [walletBalances, setWalletBalances] = useState<Record<string, string>>({})
  const { account } = useWeb3React()

  const sourcePool = useMemo(
    () => data?.pools.find((pool) => pool.id === cloneId || pool.address.toLowerCase() === cloneId.toLowerCase()),
    [cloneId, data?.pools],
  )
  const validation = useMemo(
    () => validateNftPoolDraft(draft, data?.secondsPerBlock || 2.2),
    [data?.secondsPerBlock, draft],
  )
  const economics =
    validation.economics ||
    (draft.rewards.primary ? calculatePoolEconomics(draft, data?.secondsPerBlock || 2.2) : undefined)
  const plan = economics ? buildNftPoolDeploymentPlan(draft, economics, data?.factoryAddress) : null
  const knownCollections = data?.collections || []
  const rewards = [draft.rewards.primary, ...draft.rewards.side].filter(Boolean) as NftPoolDraftReward[]

  useEffect(() => {
    if (savedDraftId) {
      const saved = loadNftPoolDraft(savedDraftId)
      if (saved) setDraft(saved)
      setHydrated(true)
      return
    }
    if (cloneId) {
      if (sourcePool) {
        setDraft(createNftPoolCloneDraft(sourcePool, data?.secondsPerBlock || 2.2))
        setHydrated(true)
      } else if (!loading) {
        setHydrated(true)
      }
      return
    }
    setHydrated(true)
  }, [cloneId, data?.secondsPerBlock, loading, savedDraftId, sourcePool])

  useEffect(() => {
    if (!hydrated) return undefined
    const timeout = setTimeout(() => saveNftPoolDraft({ ...draft, readiness: validation.readiness }), 450)
    return () => clearTimeout(timeout)
  }, [draft, hydrated, validation.readiness])

  const updateDraft = (patch: Partial<NftPoolDraftModel>) => {
    setDraft((current) => ({ ...current, ...patch, updatedAt: Date.now() }))
    setMessage('')
  }

  const updateEconomics = (patch: Partial<NftPoolDraftModel['economics']>) =>
    updateDraft({ economics: { ...draft.economics, ...patch } })

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
    updateDraft({ collections: next })
  }

  const addCustomCollection = async () => {
    setValidating(true)
    setValidationMessage('Checking collection…')
    try {
      const result = await validateNftCollectionAddress(simplePolygonRpcProvider, collectionAddress)
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
    updateDraft({ rewards: { ...draft.rewards, primary }, economics: withAllocation(draft, nextRewards) })
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
    updateDraft({ rewards: { ...draft.rewards, side }, economics: withAllocation(draft, nextRewards) })
  }

  const addCustomReward = async (side: boolean) => {
    setValidating(true)
    setValidationMessage('Checking reward token…')
    const input = side ? sideRewardAddress : rewardAddress
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
    updateDraft({ rewards: { ...draft.rewards, side }, economics: { ...draft.economics, allocationBps } })
  }

  const refreshQuotes = async () => {
    if (!draft.economics.budgetTokenAddress || !draft.economics.totalBudget || !draft.economics.budgetDecimals) return
    setQuoteBusy(true)
    setValidationMessage('Reading router quotes…')
    try {
      const inputBaseUnits = parseUnitsExact(draft.economics.totalBudget, draft.economics.budgetDecimals)
      if (!inputBaseUnits) throw new Error('Enter a valid total budget first.')
      const provider = createNftRewardQuoteProvider(simplePolygonRpcProvider)
      const quotes = { ...draft.economics.quotes }
      for (const reward of rewards) {
        const quote = await provider.quote({
          budgetTokenAddress: draft.economics.budgetTokenAddress,
          rewardTokenAddress: reward.address,
          amountBaseUnits: inputBaseUnits,
        })
        quotes[reward.address.toLowerCase()] = {
          budgetTokenAddress: quote.budgetTokenAddress,
          rewardTokenAddress: quote.rewardTokenAddress,
          inputAmount: draft.economics.totalBudget || '',
          outputAmount: formatBaseUnits(quote.outputAmountBaseUnits, reward.decimals),
          source: quote.source,
          quotedAt: quote.quotedAt,
          freshnessSeconds: quote.freshnessSeconds,
        }
      }
      updateEconomics({ quotes })
      setValidationMessage('Quotes updated. They are read-only and expire quickly.')
    } catch (quoteError) {
      setValidationMessage(
        quoteError instanceof Error ? quoteError.message : 'No read-only quote was found. Add exact manual amounts.',
      )
    } finally {
      setQuoteBusy(false)
    }
  }

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
    saveNftPoolDraft({ ...draft, readiness: validation.readiness })
    setMessage('Draft saved locally. No blockchain transaction was sent.')
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
            <ActionButton onClick={addCustomCollection} disabled={validating || !collectionAddress}>
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
              {quoteBusy ? 'Reading quotes…' : 'Refresh read-only quotes'}
            </ActionButton>
          </ButtonRow>
          <Panel style={{ marginTop: 16, padding: 14 }}>
            <PanelTitle>Reward allocation</PanelTitle>
            <Muted>Basis points are exact: the total must be 10,000.</Muted>
            {rewards.map((reward) => {
              const key = reward.address.toLowerCase()
              const quote = draft.economics.quotes[key]
              return (
                <AssetRow key={reward.address}>
                  <TokenChip>
                    <TokenDot>{reward.symbol.slice(0, 3)}</TokenDot>
                    <span>
                      {reward.symbol}
                      <Muted style={{ display: 'block', fontSize: 11 }}>
                        {quote
                          ? `Quote ${quote.outputAmount} · ${Math.max(
                              0,
                              Math.round((Date.now() - quote.quotedAt) / 1000),
                            )}s old`
                          : 'No quote yet'}
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
                User limit enabled
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
                    NFTs per user
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
                    Limit window in blocks
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
                  </Field>
                </>
              ) : null}
            </FormGrid>
            <Muted style={{ display: 'block', marginTop: 12 }}>
              Performance fee is a future post-deploy policy; it is not an input to the NFT factory.
            </Muted>
          </Panel>
          <Notice style={{ marginTop: 16 }}>
            The source schedule is shown for comparison only. A clone never copies the old start or end block. Exact
            blocks are finalized immediately before the future Phase 3 deployment preparation.
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
            </FormGrid>
          </Panel>
        ) : null}
        <Panel>
          <PanelTitle>Deployment review</PanelTitle>
          <Readiness
            $tone={validation.readiness === 'READY_FOR_DRY_RUN' ? 'good' : validation.blockers.length ? 'bad' : 'warn'}
          >
            {validation.readiness === 'READY_FOR_DRY_RUN'
              ? 'Ready for dry-run'
              : validation.readiness.replace(/_/g, ' ')}
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
              <ButtonRow style={{ marginTop: 0 }}>
                <ActionButton $secondary onClick={readWalletBalances} disabled={walletBalanceBusy || !account}>
                  {walletBalanceBusy ? 'Reading wallet…' : 'Read wallet balances'}
                </ActionButton>
                <Muted>Optional, read-only</Muted>
              </ButtonRow>
              {economics.allocations.map((item) => (
                <div
                  key={item.tokenAddress}
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
                    {rewards.find((reward) => reward.address.toLowerCase() === item.tokenAddress.toLowerCase())
                      ?.symbol || short(item.tokenAddress)}
                    <Muted style={{ display: 'block', fontSize: 11 }}>
                      {item.source} · residual {formatBaseUnits(item.residual, item.decimals)}
                      {walletBalances[item.tokenAddress.toLowerCase()]
                        ? ` · wallet ${walletBalances[item.tokenAddress.toLowerCase()]}`
                        : ''}
                    </Muted>
                  </span>
                  <strong>{formatBaseUnits(item.achievable, item.decimals)}</strong>
                </div>
              ))}
              {economics.side.map((item) => (
                <div key={`side-${item.tokenAddress}`} style={{ marginTop: 9, fontSize: 12 }}>
                  <Muted>
                    {rewards.find((reward) => reward.address.toLowerCase() === item.tokenAddress.toLowerCase())
                      ?.symbol || short(item.tokenAddress)}{' '}
                    side percentage:
                  </Muted>{' '}
                  {item.encodedPercentage.toString()} · deviation{' '}
                  {formatBaseUnits(
                    item.deviation,
                    draft.rewards.side.find((reward) => reward.address === item.tokenAddress)?.decimals,
                  )}
                </div>
              ))}
            </Panel>
          ) : null}
          <Panel style={{ marginTop: 16, padding: 14 }}>
            <PanelTitle>Post-deploy checklist</PanelTitle>
            <ul>
              <li>Apply collection weights and verify the primary collection.</li>
              <li>Approve and fund exact primary and side reward amounts.</li>
              <li>Re-read the new pool, schedule, owner, balances and provenance.</li>
            </ul>
          </Panel>
          <details style={{ marginTop: 16 }}>
            <summary>Advanced exact parameters</summary>
            <pre style={{ overflowX: 'auto', fontSize: 11, lineHeight: 1.5 }}>
              {plan ? JSON.stringify(plan, null, 2) : 'Complete the required fields to generate a dry-run plan.'}
            </pre>
          </details>
          <Muted style={{ display: 'block', marginTop: 16 }}>
            Ready for deployment is intentionally unavailable in Phase 2. No start block, transaction object, approval,
            swap, funding, or write is produced.
          </Muted>
          <ButtonRow>
            <ActionButton onClick={save}>Save deployment-ready draft</ActionButton>
            <ActionButton disabled>Continue to deploy</ActionButton>
          </ButtonRow>
        </Panel>
      </>
    )
  }

  return (
    <AdminShell
      title={sourcePool ? 'Clone NFT pool' : 'New NFT pool'}
      subtitle="A safe Polygon pool builder with exact read-only economics and no on-chain writes."
      authorityScope="nft"
    >
      {error ? <Notice $error>{error}</Notice> : null}
      {loading ? <Notice>Reading Polygon registry…</Notice> : null}
      {cloneId && !loading && !sourcePool ? (
        <Notice $error>Clone source was not found in the current registry.</Notice>
      ) : null}
      {sourcePool ? (
        <Notice>
          Cloned from <strong>{sourcePool.metadata.name}</strong>. Safe metadata and editable configuration were copied;
          address, old schedule, runtime balances and liabilities were not.
        </Notice>
      ) : null}
      {validationMessage ? <Notice>{validationMessage}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      <BuilderShell>
        <StepNav aria-label="Pool builder steps">
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
      <p style={{ marginTop: 18 }}>
        <Link href="/admin/nft-pools">Back to NFT pools</Link>
        {' · '}
        <LinkText href="/docs/nft-pool-manager">Read the architecture notes</LinkText>
      </p>
    </AdminShell>
  )
}
