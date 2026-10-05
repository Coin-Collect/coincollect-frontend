/** @jest-environment jsdom */
import { act, screen } from '@testing-library/react'
import { createRoot } from 'react-dom/client'
import type { ReactElement } from 'react'
import type { NftPool } from '../types'
import { usePublishedNftPools } from '../usePublishedNftPools'
import { getNftPoolRegistry } from '../discovery'
import { localPublicationStore, toPublicV2Pool, toVerifiedNftPool } from '../publication'
import { loadNftPoolPresentations } from '../presentationMetadata'

jest.mock('utils/providers', () => ({ nftPoolRegistryRpcProvider: {} }))
jest.mock('config/localFork', () => ({
  getLocalForkStorageKey: (key: string) => key,
  isLocalForkMode: false,
}))
jest.mock('../discovery', () => ({ getNftPoolRegistry: jest.fn() }))
jest.mock('../presentationMetadata', () => ({ loadNftPoolPresentations: jest.fn() }))
jest.mock('../publication', () => ({
  localPublicationStore: { read: jest.fn() },
  toVerifiedNftPool: jest.fn((pool: NftPool) => ({
    id: pool.canonicalId,
    address: pool.address,
    chainId: pool.chainId,
    factoryAddress: pool.onChain.factoryAddress,
    verified: pool.verified,
    publicReady: pool.publicReadiness?.ready === true,
    readinessStale: pool.publicReadiness?.stale === true,
    readinessReasons: pool.publicReadiness?.reasons || [],
    metadata: pool.metadata,
    pool,
  })),
  toPublicV2Pool: jest.fn((pool: any) =>
    pool.publicReady
      ? {
          id: pool.id,
          address: pool.address,
          verified: true,
          publicReady: true,
          metadata: pool.metadata,
        }
      : undefined,
  ),
}))

const readyAddress = '0x1111111111111111111111111111111111111111'
const unreadyAddress = '0x2222222222222222222222222222222222222222'
const discoveredAddress = '0x3333333333333333333333333333333333333333'
const mounted = new Set<() => void>()
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

function makePool(address: string, verified: boolean, ready: boolean): NftPool {
  return {
    id: `137:${address.toLowerCase()}`,
    canonicalId: `137:${address.toLowerCase()}`,
    chainId: 137,
    address,
    deployment: { factoryAddress: '0x4444444444444444444444444444444444444444' },
    onChain: { factoryAddress: '0x4444444444444444444444444444444444444444' },
    protocolVersion: 'NftStakeV2',
    source: 'nft-factory',
    discoveryStatus: verified ? 'verified' : 'discovered',
    verified,
    publicReadiness: { ready, checkedAtBlock: 100, reasons: ready ? [] : ['Missing collection weight.'] },
    metadata: { name: `Pool ${address.slice(0, 6)}`, isCommunity: true },
    collections: [],
    rewards: { primary: {}, side: [] },
  } as unknown as NftPool
}

const registryPools = [
  makePool(readyAddress, true, true),
  makePool(unreadyAddress, true, false),
  makePool(discoveredAddress, false, false),
]

async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

function render(element: ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  const unmount = () => {
    act(() => root.unmount())
    container.remove()
    mounted.delete(unmount)
  }
  mounted.add(unmount)
  return { unmount }
}

function Reader() {
  const value = usePublishedNftPools()
  return <output data-testid="read-model">{JSON.stringify(value)}</output>
}

function readValue() {
  return JSON.parse(screen.getByTestId('read-model').textContent!)
}

beforeEach(() => {
  jest.clearAllMocks()
  registryPools[0].metadata.name = 'Chain fallback'
  ;(getNftPoolRegistry as jest.Mock).mockResolvedValue({
    pools: registryPools,
    secondsPerBlock: 2,
    coverage: { fromBlock: 1, throughBlock: 100, backfillComplete: true },
  })
  ;(loadNftPoolPresentations as jest.Mock).mockResolvedValue({
    pools: [
      {
        id: `137:${readyAddress.toLowerCase()}`,
        name: 'Remote presentation',
        category: 'PARTNER',
      },
    ],
  })
})

afterEach(() => {
  mounted.forEach((unmount) => unmount())
})

it('admits only verified and public-ready pools while retaining verified recovery identities', async () => {
  render(<Reader />)
  await flush()

  expect(readValue().loading).toBe(false)
  expect(readValue().pools.map((pool: any) => pool.address)).toEqual([readyAddress])
  expect(readValue().verifiedPools.map((pool: any) => pool.address)).toEqual([readyAddress, unreadyAddress])
  expect(readValue().verifiedPools[1].publicReady).toBe(false)
  expect(toVerifiedNftPool).toHaveBeenCalledTimes(2)
  expect(toPublicV2Pool).toHaveBeenCalledTimes(1)
  expect(readValue().pools[0].metadata.name).toBe('Remote presentation')
  expect(readValue().pools[0].metadata.isCommunity).toBe(false)
  expect(localPublicationStore.read).not.toHaveBeenCalled()
})

it('refreshes discovery on the operator event and does not depend on publication or COMPLETE session events', async () => {
  render(<Reader />)
  await flush()
  expect(getNftPoolRegistry).toHaveBeenCalledTimes(1)

  act(() => window.dispatchEvent(new Event('coincollect:nft-pool-publication')))
  await flush()
  expect(getNftPoolRegistry).toHaveBeenCalledTimes(1)

  act(() => window.dispatchEvent(new Event('coincollect:nft-pool-discovery-refresh')))
  await flush()
  expect(getNftPoolRegistry).toHaveBeenCalledTimes(2)
  expect(getNftPoolRegistry).toHaveBeenLastCalledWith({}, true)
  expect(localPublicationStore.read).not.toHaveBeenCalled()
})

it('retains the last verified registry when a refresh fails', async () => {
  const { unmount } = render(<Reader />)
  await flush()
  ;(getNftPoolRegistry as jest.Mock).mockRejectedValueOnce(new Error('RPC unavailable'))
  act(() => window.dispatchEvent(new Event('coincollect:nft-pool-discovery-refresh')))
  await flush()

  expect(readValue().verifiedPools.map((pool: any) => pool.address)).toEqual([readyAddress, unreadyAddress])
  expect(readValue().pools.map((pool: any) => pool.address)).toEqual([readyAddress])
  expect(readValue().errors['*']).toBe('RPC unavailable')
  unmount()
})
