import { useCallback } from 'react'
import { MaxUint256 } from '@ethersproject/constants'
import { Ifo, Minting } from 'config/constants/types'
import { useCallWithGasPrice } from 'hooks/useCallWithGasPrice'
import { useERC20 } from 'hooks/useContract'

const useIfoApprove = (ifo: Minting, spenderAddress: string) => {
  const raisingTokenContract = useERC20(ifo.currency.address)
  const { callWithGasPrice } = useCallWithGasPrice()
  const onApprove = useCallback(async () => {
    return callWithGasPrice(raisingTokenContract, 'approve', [spenderAddress, MaxUint256])
  }, [spenderAddress, raisingTokenContract, callWithGasPrice])

  return onApprove
}

export default useIfoApprove
