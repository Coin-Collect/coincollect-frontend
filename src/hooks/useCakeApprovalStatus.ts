import { useWeb3React } from '@web3-react/core'
import { useMemo } from 'react'
import { useCoinCollect } from 'hooks/useContract'
import { useSWRContract, UseSWRContractKey } from 'hooks/useSWRContract'
import BigNumber from 'bignumber.js'

export const useCakeApprovalStatus = (spender) => {
  const { account } = useWeb3React()
  const cakeContract = useCoinCollect(false)

  const key = useMemo<UseSWRContractKey>(
    () =>
      account && spender
        ? {
            contract: cakeContract,
            methodName: 'allowance',
            params: [account, spender],
          }
        : null,
    [account, cakeContract, spender],
  )

  const { data, mutate } = useSWRContract(key)

  return {
    isVaultApproved: data ? data.gt(0) : false,
    allowance: new BigNumber(data?.toString()),
    setLastUpdated: mutate,
  }
}

export default useCakeApprovalStatus