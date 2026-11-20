import { claimPeriodMessage, isV3ClaimExpired } from './presentation'

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
