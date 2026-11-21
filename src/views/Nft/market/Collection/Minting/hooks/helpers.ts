import { MintingStatus } from 'config/constants/types'

export const getStatus = (currentBlock: number, startBlock: number, totalSupply: number, maxSupply: number, isSaleActive: boolean): MintingStatus => {
  // Add an extra check to currentBlock because it takes awhile to fetch so the initial value is 0
  // making the UI change to an inaccurate status
  if (currentBlock === 0) {
    return 'idle'
  }

  if (currentBlock < startBlock) {
    return 'coming_soon'
  }

  if (currentBlock >= startBlock && totalSupply < maxSupply && isSaleActive) {
    return 'live'
  }

  if (totalSupply === maxSupply) {
    return 'finished'
  }

  if (!isSaleActive) {
    return 'paused'
  }

  return 'idle'
}

export default null
