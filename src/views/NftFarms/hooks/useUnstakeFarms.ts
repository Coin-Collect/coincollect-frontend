import { useCallback } from 'react'
import { unstakeNftFarm } from 'utils/calls'
import { useNftFarmActionContract } from 'hooks/useContract'
import { useGasPrice } from 'state/user/hooks'
import { useFarmFromPid } from 'state/nftFarms/hooks'
import { getAddress } from 'utils/addressHelpers'

const useUnstakeFarms = (pid: number) => {
  const farm = useFarmFromPid(pid)
  const isSmartNftPool = farm?.contractAddresses ? getAddress(farm.contractAddresses) : null
  const masterChefContract = useNftFarmActionContract(pid, Boolean(isSmartNftPool))
  const gasPrice = useGasPrice()
  const hasPool = Boolean(farm)

  const handleUnstake = useCallback(
    async (collectionAddresses: string[], tokenIds: string[]) => {
      if (!hasPool || !masterChefContract) throw new Error('NFT pool or wallet is unavailable.')
      return unstakeNftFarm(masterChefContract, pid, collectionAddresses, tokenIds, gasPrice, isSmartNftPool)
    },
    [hasPool, masterChefContract, pid, gasPrice, isSmartNftPool],
  )

  return { onUnstake: handleUnstake }
}

export default useUnstakeFarms
