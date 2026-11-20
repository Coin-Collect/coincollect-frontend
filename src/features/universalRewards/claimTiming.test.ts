import { claimPeriodMessage, interpolateV3Rewards, isV3ClaimExpired } from './presentation'
import { UNIT } from './units'

const day = BigInt(86_400)
const end = day * BigInt(100)
const deadline = end + day * BigInt(30)
const config = { start: end - day, end, threshold: 0, maxWallets: 4, maxNftsPerWallet: 4, metadataURI: '' }
const poolAt = (timestamp: bigint) => ({ config, timestamp, claimDeadline: deadline })

describe('V3 claim timing', () => {
  it('shows the separate claim window after the pool ends', () => {
    expect(claimPeriodMessage(poolAt(end - BigInt(1)))).toBeUndefined()
    expect(claimPeriodMessage(poolAt(end))).toBe('30 days left to claim')
    expect(claimPeriodMessage(poolAt(deadline - day * BigInt(18)))).toBe('18 days left to claim')
  })

  it('keeps the last second open and expires at the exact blockchain deadline', () => {
    const last = poolAt(deadline - BigInt(1))
    expect(isV3ClaimExpired(last)).toBe(false)
    expect(claimPeriodMessage(last)).toBe('Less than 1 minute left to claim')
    expect(isV3ClaimExpired(last, deadline)).toBe(true)
    expect(claimPeriodMessage(poolAt(deadline))).toBe('Claim period ended')
  })

  it('keeps existing ledgers without a deadline compatible', () => {
    const legacy = { ...poolAt(deadline), claimDeadline: undefined }
    expect(isV3ClaimExpired(legacy)).toBe(false)
    expect(claimPeriodMessage(legacy)).toBeUndefined()
  })
})

describe('V3 interpolated rewards', () => {
  it('bounds the last verified snapshot by the participant threshold, reserves, pool end and refresh horizon', () => {
    const pool = { config: { ...config, start: BigInt(0), end: BigInt(100), threshold: 8 } }
    const snapshot = {
      timestamp: BigInt(20),
      amounts: [BigInt(80), BigInt(2)],
      projection: {
        wallets: 4,
        totalWeight: BigInt(8),
        pageWeight: BigInt(2),
        rewards: [
          { cap: BigInt(8_000), inventory: BigInt(10_000), liability: UNIT * BigInt(80) },
          { cap: BigInt(8_000), inventory: BigInt(6), liability: UNIT * BigInt(2) },
        ],
      },
    }

    expect(interpolateV3Rewards(pool, snapshot, 0)).toEqual(snapshot.amounts)
    expect(interpolateV3Rewards(pool, snapshot, 5)).toEqual([BigInt(130), BigInt(3)])
    expect(interpolateV3Rewards(pool, snapshot, 100)).toEqual([BigInt(380), BigInt(3)])
    expect(interpolateV3Rewards(pool, { ...snapshot, timestamp: BigInt(99) }, 5)).toEqual([BigInt(90), BigInt(3)])
  })
})
