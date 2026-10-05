/** @jest-environment jsdom */
import React from 'react'
import { act } from 'react-dom/test-utils'
import { createRoot, type Root } from 'react-dom/client'
import {
  getV2FullPositionReadPolicy,
  isV2PositionInvalidationFor,
  mergeVerifiedPositionSummaryReads,
  notifyV2UserPositionChanged,
  readVerifiedPositionSummariesWithConcurrency,
  usePublishedV2UserPosition,
  verifiedPositionSummaryKey,
  v2UserPositionKey,
  v2UserRecoveryPositionKey,
  V2_POSITION_CHANGED_EVENT,
} from '../hooks'
import type { VerifiedNftPool } from '../../publication'
import type { V2UserPositionSummary } from '../types'

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(() => ({ data: undefined, error: undefined, isValidating: false, mutate: jest.fn() })),
  mutate: jest.fn(),
}))

const mockUseSWR = (jest.requireMock('swr') as { default: jest.Mock }).default

beforeEach(() => {
  jest.clearAllMocks()
  mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isValidating: false, mutate: jest.fn() })
})

const account = '0x0000000000000000000000000000000000000003'
const factoryAddress = '0x00000000000000000000000000000000000000fa'

type FullPositionProbeProps = {
  pool: any
  enabled: boolean
  refreshIntervalMs: number
  revalidateOnFocus: boolean
}

function FullPositionProbe({ pool, enabled, refreshIntervalMs, revalidateOnFocus }: FullPositionProbeProps) {
  usePublishedV2UserPosition(pool, account, 137, {} as any, enabled, refreshIntervalMs, revalidateOnFocus)
  return null
}

function renderFullPositionProbe(root: Root, props: FullPositionProbeProps) {
  act(() => root.render(React.createElement(FullPositionProbe, props)))
}

function poolAt(index: number, publicReady = true): VerifiedNftPool {
  return {
    id: `137:pool-${index}`,
    chainId: 137,
    address: `0x${index.toString(16).padStart(40, '0')}`,
    factoryAddress,
    verified: true,
    publicReady,
    readinessReasons: [],
    metadata: { name: `Pool ${index}`, collections: [] },
    pool: {} as any,
  }
}

function summaryFor(pool: VerifiedNftPool, state: 'positive' | 'zero', blockNumber: number): V2UserPositionSummary {
  return {
    state,
    poolAddress: pool.address,
    account,
    count: state === 'positive' ? '1' : '0',
    power: state === 'positive' ? '17' : '0',
    blockNumber,
  }
}

describe('verified recovery-universe summary refresh', () => {
  const pool = poolAt(161, false)
  const positive = summaryFor(pool, 'positive', 200)

  it('keeps a verified positive position visible through readiness regression and transient reads', () => {
    const initial = mergeVerifiedPositionSummaryReads([pool], [{ status: 'fulfilled', value: positive }], account)
    pool.publicReady = true
    pool.publicReady = false
    const failed = mergeVerifiedPositionSummaryReads(
      [pool],
      [{ status: 'rejected', reason: new Error('RPC unavailable') }],
      account,
    )

    expect(initial.positions[pool.address.toLowerCase()].state).toBe('positive')
    expect(failed.positions[pool.address.toLowerCase()]).toMatchObject({
      state: 'positive',
      stale: true,
      error: 'RPC unavailable',
      count: '1',
      power: '17',
    })
  })

  it('removes a recovery position only after a fresh consistent zero summary', () => {
    const zero = summaryFor(pool, 'zero', 201)
    const result = mergeVerifiedPositionSummaryReads([pool], [{ status: 'fulfilled', value: zero }], account)
    expect(result.positions[pool.address.toLowerCase()]).toEqual(zero)

    const laterFailure = mergeVerifiedPositionSummaryReads(
      [pool],
      [{ status: 'rejected', reason: new Error('RPC unavailable') }],
      account,
    )
    expect(laterFailure.positions[pool.address.toLowerCase()].state).toBe('unknown')
  })

  it('keeps failed reads unknown when no verified positive snapshot exists', () => {
    const unknownPool = poolAt(162)
    const result = mergeVerifiedPositionSummaryReads(
      [unknownPool],
      [{ status: 'rejected', reason: new Error('wrong network') }],
      account,
    )
    expect(result.positions[unknownPool.address.toLowerCase()]).toMatchObject({
      state: 'unknown',
      error: 'wrong network',
    })
  })

  it('keeps summary identity stable across readiness, catalogue ordering and filters', () => {
    const first = poolAt(163, false)
    const second = poolAt(164, true)
    const initialKey = verifiedPositionSummaryKey([first, second], account, 137)
    first.publicReady = true
    second.publicReady = false

    expect(verifiedPositionSummaryKey([second, first], account, 137)).toBe(initialKey)
    expect(verifiedPositionSummaryKey([first], account, 137)).not.toBe(initialKey)
  })
})

describe('lazy full-position read budget', () => {
  it('does not schedule full polling for 100 offscreen cards and prioritizes known positive positions', () => {
    const pools = Array.from({ length: 100 }, (_, index) => poolAt(index + 1))
    const visible = new Set([0, 1, 2, 3])
    const positive = new Set([95])
    const policies = pools.map((pool, index) =>
      getV2FullPositionReadPolicy(
        visible.has(index),
        positive.has(index) ? summaryFor(pool, 'positive', 300) : undefined,
      ),
    )

    expect(policies.filter((policy) => policy.enabled)).toHaveLength(5)
    expect(policies.filter((policy) => policy.refreshIntervalMs > 0)).toHaveLength(4)
    expect(policies[95].enabled).toBe(true)
    expect(policies[95].refreshIntervalMs).toBe(0)
    expect(getV2FullPositionReadPolicy(false, summaryFor(pools[96], 'zero', 300)).enabled).toBe(false)
  })

  it('scans all 100 verified pools with a maximum of four concurrent summary reads', async () => {
    const pools = Array.from({ length: 100 }, (_, index) => poolAt(index + 1, index < 80))
    let active = 0
    let maximumActive = 0
    let calls = 0
    const results = await readVerifiedPositionSummariesWithConcurrency(pools, {} as any, account, async (pool) => {
      calls += 1
      active += 1
      maximumActive = Math.max(maximumActive, active)
      await Promise.resolve()
      active -= 1
      return summaryFor(pool, pool.address === pools[98].address ? 'positive' : 'zero', 400)
    })
    const positions = mergeVerifiedPositionSummaryReads(pools, results, account).positions

    expect(calls).toBe(100)
    expect(maximumActive).toBe(4)
    expect(results).toHaveLength(100)
    expect(results.every((result) => result.status === 'fulfilled')).toBe(true)
    expect(positions[pools[98].address.toLowerCase()].state).toBe('positive')
    expect(pools[98].publicReady).toBe(false)
  })

  it('leaves the full SWR reader disabled offscreen, polls visible cards at 30s and lets detail read at 15s', () => {
    ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    const pool = poolAt(165) as any
    const offscreen = getV2FullPositionReadPolicy(false)
    renderFullPositionProbe(root, {
      pool,
      enabled: offscreen.enabled,
      refreshIntervalMs: offscreen.refreshIntervalMs,
      revalidateOnFocus: offscreen.revalidateOnFocus,
    })
    expect(mockUseSWR).toHaveBeenLastCalledWith(
      null,
      expect.any(Function),
      expect.objectContaining({ refreshInterval: 0, revalidateOnFocus: false }),
    )

    const visible = getV2FullPositionReadPolicy(true)
    renderFullPositionProbe(root, {
      pool,
      enabled: visible.enabled,
      refreshIntervalMs: visible.refreshIntervalMs,
      revalidateOnFocus: visible.revalidateOnFocus,
    })
    expect(mockUseSWR).toHaveBeenLastCalledWith(
      v2UserPositionKey(pool, account, 137),
      expect.any(Function),
      expect.objectContaining({ refreshInterval: 30_000, revalidateOnFocus: true, refreshWhenHidden: false }),
    )

    renderFullPositionProbe(root, { pool, enabled: true, refreshIntervalMs: 15_000, revalidateOnFocus: true })
    expect(mockUseSWR).toHaveBeenLastCalledWith(
      v2UserPositionKey(pool, account, 137),
      expect.any(Function),
      expect.objectContaining({ refreshInterval: 15_000 }),
    )

    renderFullPositionProbe(root, { pool, enabled: true, refreshIntervalMs: 0, revalidateOnFocus: false })
    expect(mockUseSWR).toHaveBeenLastCalledWith(
      v2UserPositionKey(pool, account, 137),
      expect.any(Function),
      expect.objectContaining({ refreshInterval: 0, revalidateOnFocus: false }),
    )
    act(() => root.unmount())
    container.remove()
  })
})

describe('targeted position invalidation', () => {
  it('invalidates only the changed pool/account full and recovery cache keys', () => {
    const poolA = poolAt(170)
    const poolB = poolAt(171)
    const invalidation = {
      chainId: 137,
      poolAddress: poolA.address,
      factoryAddress: poolA.factoryAddress,
      account,
    }
    const changed = jest.fn()
    window.addEventListener(V2_POSITION_CHANGED_EVENT, changed)

    notifyV2UserPositionChanged(invalidation)

    const { mutate } = jest.requireMock('swr') as { mutate: jest.Mock }
    expect(mutate).toHaveBeenCalledTimes(2)
    expect(mutate).toHaveBeenNthCalledWith(1, v2UserPositionKey(poolA, account, 137))
    expect(mutate).toHaveBeenNthCalledWith(2, v2UserRecoveryPositionKey(poolA, account, 137))
    expect(mutate).not.toHaveBeenCalledWith(v2UserPositionKey(poolB, account, 137))
    expect(changed).toHaveBeenCalledTimes(1)
    expect((changed.mock.calls[0][0] as CustomEvent).detail).toEqual(invalidation)
    expect(isV2PositionInvalidationFor(invalidation, poolA, account, 137)).toBe(true)
    expect(isV2PositionInvalidationFor(invalidation, poolB, account, 137)).toBe(false)
    expect(isV2PositionInvalidationFor({ ...invalidation, account: poolB.address }, poolA, account, 137)).toBe(false)

    window.removeEventListener(V2_POSITION_CHANGED_EVENT, changed)
  })
})
