import { mergeV2UserPositionReads } from '../hooks'
import type { PublicV2Pool } from '../../publication'
import type { V2UserPosition } from '../types'

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
