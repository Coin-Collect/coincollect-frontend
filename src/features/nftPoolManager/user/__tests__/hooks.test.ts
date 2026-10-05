import { mergeV2UserPositionReads, mergeVerifiedPositionSummaryReads } from '../hooks'
import type { PublicV2Pool, VerifiedNftPool } from '../../publication'
import type { V2UserPosition, V2UserPositionSummary } from '../types'

const firstPool = { address: '0x0000000000000000000000000000000000000001' } as PublicV2Pool
const secondPool = { address: '0x0000000000000000000000000000000000000002' } as PublicV2Pool
const stalePosition = {
  poolAddress: firstPool.address,
  account: '0x0000000000000000000000000000000000000003',
  nftCount: '2',
  power: '31',
  blockNumber: 100,
} as V2UserPosition
const freshPosition = {
  poolAddress: secondPool.address,
  account: '0x0000000000000000000000000000000000000003',
  nftCount: '1',
  power: '5',
  blockNumber: 110,
} as V2UserPosition

describe('address-native position list refresh', () => {
  it('retains the last verified position on an RPC failure and labels it as stale', () => {
    const result = mergeV2UserPositionReads(
      [firstPool, secondPool],
      [
        { status: 'rejected', reason: new Error('RPC unavailable') },
        { status: 'fulfilled', value: freshPosition },
      ],
      { [firstPool.address.toLowerCase()]: stalePosition },
    )

    expect(result.positions[firstPool.address.toLowerCase()]).toBe(stalePosition)
    expect(result.positions[secondPool.address.toLowerCase()]).toBe(freshPosition)
    expect(result.errors[firstPool.address.toLowerCase()]).toBe('RPC unavailable')
  })

  it('does not invent an empty position when no verified snapshot exists', () => {
    const result = mergeV2UserPositionReads(
      [firstPool],
      [{ status: 'rejected', reason: new Error('Wrong wallet network') }],
      {},
    )

    expect(result.positions[firstPool.address.toLowerCase()]).toBeUndefined()
    expect(result.errors[firstPool.address.toLowerCase()]).toBe('Wrong wallet network')
  })
})

describe('verified recovery-universe summary refresh', () => {
  const account = '0x0000000000000000000000000000000000000003'
  const pool = {
    address: '0x00000000000000000000000000000000000000a1',
    factoryAddress: '0x00000000000000000000000000000000000000a2',
    verified: true,
    publicReady: false,
  } as VerifiedNftPool
  const positive: V2UserPositionSummary = {
    state: 'positive',
    poolAddress: pool.address,
    account,
    count: '1',
    power: '17',
    blockNumber: 200,
  }

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
    const zero: V2UserPositionSummary = {
      state: 'zero',
      poolAddress: pool.address,
      account,
      count: '0',
      power: '0',
      blockNumber: 201,
    }
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
    const result = mergeVerifiedPositionSummaryReads(
      [{ ...pool, address: '0x00000000000000000000000000000000000000a3' }],
      [{ status: 'rejected', reason: new Error('wrong network') }],
      account,
    )
    expect(result.positions['0x00000000000000000000000000000000000000a3']).toMatchObject({
      state: 'unknown',
      error: 'wrong network',
    })
  })
})
