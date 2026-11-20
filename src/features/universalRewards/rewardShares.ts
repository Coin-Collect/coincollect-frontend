const FULL_SHARE = 10_000

export function equalRewardShares(count: number) {
  if (!count) return []
  const whole = Math.floor(FULL_SHARE / count)
  return Array.from({ length: count }, (_, index) => whole + Number(index < FULL_SHARE % count))
}

/** Keep one basis point for each reward and carry rounding into the final lane. */
export function adjustRewardShare(shares: number[], index: number, basisPoints: number) {
  if (shares.length === 1) return [FULL_SHARE]
  const otherCount = shares.length - 1
  const selected = Math.max(1, Math.min(Math.round(basisPoints), FULL_SHARE - otherCount))
  const remainder = FULL_SHARE - selected - otherCount
  const otherWeight = shares.reduce((sum, value, position) => sum + (index === position ? 0 : value), 0)
  let rest = remainder
  let lanesLeft = otherCount
  return shares.map((value, position) => {
    if (position === index) return selected
    lanesLeft -= 1
    const portion = lanesLeft ? Math.floor((remainder * value) / otherWeight) : rest
    rest -= portion
    return 1 + portion
  })
}
