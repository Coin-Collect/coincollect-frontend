/** @jest-environment jsdom */
import { BigNumber } from '@ethersproject/bignumber'
import { Interface } from '@ethersproject/abi'
import factoryAbi from 'config/abi/nftSmartChefFactory.json'
import {
  createNftPoolLaunchSession,
  hashNftPoolDeploymentPlan,
  loadNftPoolLaunchSession,
  saveNftPoolLaunchSession,
} from '../launch/storage'
import { readNftPoolByAddress } from '../discovery'
import {
  capturePublicationMetadata,
  hydratePublishedPool,
  localPublicationStore,
  PUBLICATION_EVENT,
  PUBLICATION_STORAGE_KEY,
  publishCompletedNftPool,
  selectPublishedNftPools,
} from '../publication'
import type { NftPool, NftPoolDeploymentPlan } from '../types'
import { createEmptyNftPoolDraft } from '../registry'

jest.mock('../discovery', () => ({ readNftPoolByAddress: jest.fn() }))

const factory = '0x1111111111111111111111111111111111111111'
const address = '0x2222222222222222222222222222222222222222'
const nft = '0x3333333333333333333333333333333333333333'
const token = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
const hash = `0x${'a'.repeat(64)}`
const plan = {
  draftId: 'draft',
  chainId: 137,
  factoryAddress: factory,
  factoryParameters: { intendedAdmin: factory },
  collectionConfiguration: { collectionWeightConfigurationRequired: true },
  postDeploy: {},
} as NftPoolDeploymentPlan
const checked = { passed: true, checks: [], checkedAt: 100, checkedAtBlock: 101 }

function session() {
  return {
    ...createNftPoolLaunchSession(plan),
    currentStage: 'COMPLETE' as const,
    poolAddress: address,
    schedule: { startBlock: 200, endBlock: 300 } as any,
    transactionHashes: { deploy: hash, sideFunding: {} },
    verification: { deployment: checked, weights: checked, funding: checked, final: checked },
  }
}
function pool(): NftPool {
  return {
    address,
    status: 'UPCOMING',
    metadata: { name: 'Fallback title' },
    onChain: {
      factoryAddress: factory,
      codeFound: true,
      abiCompatible: true,
      currentBlock: 101,
      startBlock: 200,
      endBlock: 300,
      participantThreshold: BigNumber.from(1),
      rewardPerBlock: BigNumber.from(100),
      rewardBalance: BigNumber.from(10000),
    },
    collections: [{ collection: { address: nft, displayName: 'KEY' }, weight: BigNumber.from(30) }],
    rewards: { primary: { token: { address: token, symbol: 'POL', name: 'Matic', decimals: 18 } }, side: [] },
  } as unknown as NftPool
}
const logs = new Interface(factoryAbi).encodeEventLog(new Interface(factoryAbi).getEvent('NewSmartChefContract'), [
  address,
])
const provider = {
  getNetwork: jest.fn().mockResolvedValue({ chainId: 137 }),
  getTransactionReceipt: jest.fn().mockResolvedValue({
    to: factory,
    status: 1,
    transactionHash: hash,
    blockNumber: 100,
    logs: [{ address: factory, ...logs }],
  }),
} as any

beforeEach(() => {
  window.localStorage.clear()
  jest.clearAllMocks()
  ;(readNftPoolByAddress as jest.Mock).mockResolvedValue(pool())
})

it('captures metadata separately, retains plan hash and survives session reload', () => {
  const draft = createEmptyNftPoolDraft()
  draft.name = 'KEY Rewards'
  draft.banner = '/images/poolBanners/nfts/key.webp'
  const value = { ...session(), publicationMetadata: capturePublicationMetadata(draft) }
  saveNftPoolLaunchSession(value)
  expect(loadNftPoolLaunchSession(value.sessionId)?.publicationMetadata?.name).toBe('KEY Rewards')
  expect(value.planHash).toBe(hashNftPoolDeploymentPlan(plan))
})

it('publishes exactly one address-native card and notifies the current tab', async () => {
  const listener = jest.fn()
  window.addEventListener(PUBLICATION_EVENT, listener)
  const value = { ...session(), publicationMetadata: { name: 'KEY Rewards', collections: [] } }
  await publishCompletedNftPool(value, provider)
  await publishCompletedNftPool(value, provider)
  const records = localPublicationStore.read()
  expect(records).toHaveLength(1)
  expect(records[0].metadata.name).toBe('KEY Rewards')
  expect(records[0].snapshot.rewards[0].symbol).toBe('WPOL')
  expect(records[0]).not.toHaveProperty('pid')
  expect(listener).toHaveBeenCalledTimes(2)
  window.removeEventListener(PUBLICATION_EVENT, listener)
})

it.each(['FUNDING_REQUIRED', 'DEPLOY_SUBMITTED', 'CORRUPTED'])('does not publish stage %s', async (stage) => {
  await expect(publishCompletedNftPool({ ...session(), currentStage: stage as any }, provider)).rejects.toThrow()
  expect(localPublicationStore.read()).toEqual([])
})

it('rejects missing funding read-back and a mismatched factory receipt', async () => {
  await expect(
    publishCompletedNftPool(
      { ...session(), verification: { ...session().verification, funding: { ...checked, passed: false } } },
      provider,
    ),
  ).rejects.toThrow()
  await expect(publishCompletedNftPool({ ...session(), poolAddress: nft }, provider)).rejects.toThrow('does not match')
})

it('publication storage failure leaves launch complete and retry requires no chain write', async () => {
  const value = session()
  const store = {
    read: () => [],
    upsert: jest.fn().mockImplementationOnce(() => {
      throw new Error('quota')
    }),
  }
  await expect(publishCompletedNftPool(value, provider, store)).rejects.toThrow('quota')
  expect(value.currentStage).toBe('COMPLETE')
  await publishCompletedNftPool(value, provider, store)
  expect(store.upsert).toHaveBeenCalledTimes(2)
})

it('recovers completed launches after start without the pre-start gate', async () => {
  ;(readNftPoolByAddress as jest.Mock).mockResolvedValue({
    ...pool(),
    status: 'ACTIVE',
    onChain: { ...pool().onChain, currentBlock: 250 },
  })
  const record = await publishCompletedNftPool(session(), provider)
  expect(record.snapshot.status).toBe('ACTIVE')
})

it('filters history, search, duplicates and staked-only without legacy pids', async () => {
  const record = await publishCompletedNftPool(session(), provider)
  const options = { history: false, archived: false, stakedOnly: false, query: 'KEY', configuredAddresses: [] }
  expect(selectPublishedNftPools([record], options)).toHaveLength(1)
  expect(selectPublishedNftPools([record], { ...options, stakedOnly: true })).toEqual([])
  expect(
    selectPublishedNftPools([record], {
      ...options,
      stakedOnly: true,
      stakedPoolAddresses: [address.toUpperCase()],
    }),
  ).toHaveLength(1)
  expect(selectPublishedNftPools([record], { ...options, configuredAddresses: [address] })).toEqual([])
  expect(selectPublishedNftPools([record], { ...options, history: true })).toEqual([])
  expect(
    selectPublishedNftPools([{ ...record, snapshot: { ...record.snapshot, status: 'FINISHED' } }], {
      ...options,
      history: true,
    }),
  ).toHaveLength(1)
  expect(
    selectPublishedNftPools([{ ...record, snapshot: { ...record.snapshot, status: 'FINISHED' } }], {
      ...options,
      stakedOnly: true,
      stakedPoolAddresses: [address],
    }),
  ).toHaveLength(1)
})

it('hydrates card power from chain and recovers block timing for older publications', async () => {
  const completed = session()
  completed.schedule!.measuredSecondsPerBlock = 3
  saveNftPoolLaunchSession(completed)
  const record = await publishCompletedNftPool(completed, provider)
  expect(record.snapshot.secondsPerBlock).toBe(3)
  const updated = pool()
  updated.onChain.totalShares = BigNumber.from(36)
  updated.onChain.stakedBalance = BigNumber.from(2)
  ;(readNftPoolByAddress as jest.Mock).mockResolvedValue(updated)
  const hydrated = await hydratePublishedPool(
    { ...record, snapshot: { ...record.snapshot, secondsPerBlock: undefined } },
    provider,
  )
  expect(hydrated.snapshot.secondsPerBlock).toBe(3)
  expect(hydrated.snapshot.totalShares).toBe('36')
  expect(hydrated.snapshot.stakedBalance).toBe('2')
  expect(hydrated.snapshot.collections[0].weight).toBe('30')
})

it('ignores malformed storage and retains original snapshot when hydration fails', async () => {
  window.localStorage.setItem(PUBLICATION_STORAGE_KEY, '[{},null]')
  expect(localPublicationStore.read()).toEqual([])
  const record = await publishCompletedNftPool(session(), provider)
  ;(readNftPoolByAddress as jest.Mock).mockRejectedValue(new Error('offline'))
  await expect(hydratePublishedPool(record, provider)).rejects.toThrow('offline')
  expect(localPublicationStore.read()[0].snapshot.currentBlock).toBe(101)
})
