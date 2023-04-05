import { useCallback } from 'react'
import { MaxUint256 } from '@ethersproject/constants'
import { Contract } from '@ethersproject/contracts'
import { useCoinCollectNftStake } from 'hooks/useContract'
import { useCallWithGasPrice } from 'hooks/useCallWithGasPrice'

const useApproveNftFarm = (nftContract: Contract) => { 
  const masterChefContract = useCoinCollectNftStake() //useMasterchef()
  const { callWithGasPrice } = useCallWithGasPrice()
  const handleApprove = useCallback(async () => {
    return callWithGasPrice(nftContract, 'setApprovalForAll', [masterChefContract.address, MaxUint256])
  }, [nftContract, masterChefContract, callWithGasPrice])

  return { onApprove: handleApprove }
}

export default useApproveNftFarm
