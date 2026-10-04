import type { NftPoolDraftReward } from './types'

export interface RewardSelection {
  primary: NftPoolDraftReward | null
  side: NftPoolDraftReward[]
}

/** Promote a selected side reward without dropping the previous primary or duplicating tokens. */
export function selectPrimaryReward(
  currentPrimary: NftPoolDraftReward | null,
  currentSide: NftPoolDraftReward[],
  nextPrimary: NftPoolDraftReward | null,
): RewardSelection {
  const nextAddress = nextPrimary?.address.toLowerCase()
  const promoteSelectedSide = Boolean(
    nextAddress && currentSide.some((reward) => reward.address.toLowerCase() === nextAddress),
  )
  const side = currentSide.filter((reward, index, rewards) => {
    const address = reward.address.toLowerCase()
    return (
      address !== nextAddress && rewards.findIndex((candidate) => candidate.address.toLowerCase() === address) === index
    )
  })

  if (
    promoteSelectedSide &&
    currentPrimary &&
    currentPrimary.address.toLowerCase() !== nextAddress &&
    !side.some((reward) => reward.address.toLowerCase() === currentPrimary.address.toLowerCase())
  ) {
    side.unshift(currentPrimary)
  }

  return { primary: nextPrimary, side }
}
