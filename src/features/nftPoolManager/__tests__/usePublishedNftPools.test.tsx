/** @jest-environment jsdom */
import { screen, act } from '@testing-library/react'
import { createRoot } from 'react-dom/client'
import type { ReactElement } from 'react'
import { usePublishedNftPools } from '../usePublishedNftPools'
import {
  hydratePublishedPool,
  localPublicationStore,
  publishCompletedNftPool,
  PUBLICATION_EVENT,
  PUBLICATION_STORAGE_KEY,
  PublicV2Pool,
} from '../publication'
import { loadNftPoolLaunchSessions } from '../launch/storage'

jest.mock('utils/providers', () => ({ nftPoolRegistryRpcProvider: {} }))
jest.mock('../publication', () => ({
  hydratePublishedPool: jest.fn(),
  publishCompletedNftPool: jest.fn(),
  localPublicationStore: { read: jest.fn() },
  PUBLICATION_EVENT: 'coincollect:nft-pool-publication',
  PUBLICATION_STORAGE_KEY: 'coincollect.nft-pool-publications.v1',
}))
jest.mock('../launch/storage', () => ({ loadNftPoolLaunchSessions: jest.fn() }))

let records: PublicV2Pool[]
let serial = 0
const mounted = new Set<() => void>()
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
// These readers resolve in microtasks. Flush the React 18 root explicitly;
// the repository's older testing-library async wrapper uses legacy render.
async function waitFor(assertion: () => void) {
  await act(async () => {
    await Promise.resolve()
  })
  assertion()
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
function value() {
  return JSON.parse(screen.getByTestId('read-model').textContent!)
}
beforeEach(() => {
  jest.clearAllMocks()
  records = [
    {
      id: `137:fixture-${serial++}`,
      address: '0x2222222222222222222222222222222222222222',
      metadata: { name: 'Saved artwork' },
      snapshot: { checkedAt: Date.now(), currentBlock: 100, status: 'UPCOMING' },
    } as PublicV2Pool,
  ]
  ;(localPublicationStore.read as jest.Mock).mockImplementation(() => records)
  ;(loadNftPoolLaunchSessions as jest.Mock).mockReturnValue([])
  ;(hydratePublishedPool as jest.Mock).mockImplementation(async (record) => record)
})
afterEach(() => {
  mounted.forEach((unmount) => unmount())
})

it('hydrates exact records and responds to same-tab and cross-tab publication', async () => {
  render(<Reader />)
  await waitFor(() => expect(value().loading).toBe(false))
  expect(hydratePublishedPool).toHaveBeenCalledTimes(1)
  act(() => window.dispatchEvent(new Event(PUBLICATION_EVENT)))
  await waitFor(() => expect(hydratePublishedPool).toHaveBeenCalledTimes(2))
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: PUBLICATION_STORAGE_KEY })))
  await waitFor(() => expect(hydratePublishedPool).toHaveBeenCalledTimes(3))
})

it('keeps the latest verified cache and labels RPC failure instead of making up balances', async () => {
  ;(hydratePublishedPool as jest.Mock).mockImplementationOnce(async (record) => ({
    ...record,
    snapshot: { ...record.snapshot, currentBlock: 150 },
  }))
  render(<Reader />)
  await waitFor(() => expect(value().loading).toBe(false))
  ;(hydratePublishedPool as jest.Mock).mockRejectedValue(new Error('RPC unavailable'))
  act(() => window.dispatchEvent(new Event(PUBLICATION_EVENT)))
  await waitFor(() => expect(value().errors[records[0].id]).toContain('last verified snapshot'))
  expect(value().pools[0].snapshot.currentBlock).toBe(150)
})

it('recovers interrupted COMPLETE publication from the public page without wallet writes', async () => {
  const session = { currentStage: 'COMPLETE', poolAddress: '0x4444444444444444444444444444444444444444' }
  ;(loadNftPoolLaunchSessions as jest.Mock).mockReturnValue([session, { currentStage: 'FUNDING_REQUIRED' }])
  ;(publishCompletedNftPool as jest.Mock).mockResolvedValue(undefined)
  render(<Reader />)
  await waitFor(() => expect(value().loading).toBe(false))
  expect(publishCompletedNftPool).toHaveBeenCalledTimes(1)
  expect(publishCompletedNftPool).toHaveBeenCalledWith(session, {})
})

it('ignores unrelated storage events and removes subscriptions on unmount', async () => {
  const { unmount } = render(<Reader />)
  await waitFor(() => expect(value().loading).toBe(false))
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' })))
  expect(hydratePublishedPool).toHaveBeenCalledTimes(1)
  unmount()
  act(() => window.dispatchEvent(new Event(PUBLICATION_EVENT)))
  expect(hydratePublishedPool).toHaveBeenCalledTimes(1)
})

it('polls only while visible at the bounded 30 second interval', async () => {
  jest.useFakeTimers()
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
  const { unmount } = render(<Reader />)
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
  act(() => jest.advanceTimersByTime(30_000))
  expect(hydratePublishedPool).toHaveBeenCalledTimes(1)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  await act(async () => {
    jest.advanceTimersByTime(30_000)
    await Promise.resolve()
  })
  expect(hydratePublishedPool).toHaveBeenCalledTimes(2)
  unmount()
  jest.useRealTimers()
})
