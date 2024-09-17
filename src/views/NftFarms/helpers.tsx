import memoize from "lodash/memoize"

export const getNftFarmBlockInfo = memoize(
  (startTimestamp: number, endTimestamp: number, isFinished: boolean, currentBlock: number) => {
    const shouldShowBlockCountdown = Boolean(!isFinished && startTimestamp && endTimestamp)
    const now = Math.floor(Date.now() / 1000)
    const timeUntilStart = Math.max((startTimestamp || 0) - now, 0)
    const timeRemaining = Math.max((endTimestamp || 0) - now, 0)
    const hasPoolStarted = timeUntilStart <= 0 && timeRemaining > 0
    const timeToDisplay = hasPoolStarted ? timeRemaining : timeUntilStart
    return { shouldShowBlockCountdown, timeUntilStart, timeRemaining, hasPoolStarted, timeToDisplay, currentBlock }
  },
  (startTimestamp, endTimestamp, isFinished, currentBlock) => `${startTimestamp}#${endTimestamp}#${isFinished}#${currentBlock}`,
)