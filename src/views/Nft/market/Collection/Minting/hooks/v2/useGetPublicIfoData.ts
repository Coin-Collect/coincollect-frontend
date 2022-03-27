import BigNumber from 'bignumber.js'
import { useState, useCallback } from 'react'
import { BSC_BLOCK_TIME } from 'config'
import ifoV2Abi from 'config/abi/ifoV2.json'
import coinCollectAbi from 'config/abi/coinCollectNft.json'
import tokens from 'config/constants/tokens'
import { Ifo, IfoStatus } from 'config/constants/types'
import { FixedNumber } from '@ethersproject/bignumber'

import { useLpTokenPrice, usePriceCakeBusd } from 'state/farms/hooks'
import { BIG_ZERO } from 'utils/bigNumber'
import { multicallPolygonv1, multicallv2 } from 'utils/multicall'
import { PublicIfoData } from '../../types'
import { getStatus } from '../helpers'
import { useWeb3React } from '@web3-react/core'

// https://github.com/pancakeswap/pancake-contracts/blob/master/projects/ifo/contracts/IFOV2.sol#L431
// 1,000,000,000 / 100
const TAX_PRECISION = FixedNumber.from(10000000000)

const formatPool = (pool) => ({
  raisingAmountPool: pool ? new BigNumber(pool[0].toString()) : BIG_ZERO,
  offeringAmountPool: pool ? new BigNumber(pool[1].toString()) : BIG_ZERO,
  limitPerUserInLP: pool ? new BigNumber(pool[2].toString()) : BIG_ZERO,
  hasTax: pool ? pool[3] : false,
  totalAmountPool: pool ? new BigNumber(pool[4].toString()) : BIG_ZERO,
  sumTaxesOverflow: pool ? new BigNumber(pool[5].toString()) : BIG_ZERO,
})

/**
 * Gets all public data of an IFO
 */
const useGetPublicIfoData = (ifo: Ifo): PublicIfoData => {
  const { address, releaseBlockNumber, version } = ifo
  const cakePriceUsd = usePriceCakeBusd()
  const lpTokenPriceInUsd = useLpTokenPrice(ifo.currency.symbol)
  const currencyPriceInUSD = ifo.currency === tokens.cake ? cakePriceUsd : lpTokenPriceInUsd
  const { account } = useWeb3React()

  const [state, setState] = useState({
    isInitialized: false,
    status: 'idle' as IfoStatus,
    blocksRemaining: 0,
    secondsUntilStart: 0,
    progress: 5,
    secondsUntilEnd: 0,
    poolBasic: {
      raisingAmountPool: BIG_ZERO,
      offeringAmountPool: BIG_ZERO,
      limitPerUserInLP: BIG_ZERO,
      taxRate: 0,
      totalAmountPool: BIG_ZERO,
      sumTaxesOverflow: BIG_ZERO,
      pointThreshold: 0,
      admissionProfile: undefined,
    },
    poolUnlimited: {
      raisingAmountPool: BIG_ZERO,
      offeringAmountPool: BIG_ZERO,
      limitPerUserInLP: BIG_ZERO,
      taxRate: 0,
      totalAmountPool: BIG_ZERO,
      sumTaxesOverflow: BIG_ZERO,
    },
    thresholdPoints: undefined,
    startBlockNum: 0,
    endBlockNum: 0,
    numberPoints: 0,
  })

  const abi = coinCollectAbi

  const fetchIfoData = useCallback(
    async (currentBlock: number) => {
  
      const [
        totalSupply,
        isSaleActive,
        cost,
        balance
      ] = await multicallPolygonv1(
        abi,
        [
          {
            address,
            name: 'totalSupply',
          },
          {
            address,
            name: 'isSaleActive',
          },
          {
            address,
            name: 'cost',
          },
          {
            address,
            name: 'balanceOf',
            params: [account ? account : '0x514910771af9ca656af840dff83e8264ecf986ca']
          },
        ],
      )

      
      const totalSupplyFormatted =  totalSupply ? totalSupply[0].toNumber() : 0
      const costFormatted =  cost ? cost[0].toNumber() : 0
      const balanceFormatted = balance ? balance[0].toNumber() : 0
      const status = 'live'


      setState((prev) => ({
        ...prev,
        isInitialized: true,
        totalSupply: totalSupplyFormatted,
        isSaleActive,
        cost: costFormatted,
        balance: balanceFormatted,
      }))
    },
    [releaseBlockNumber, address, version, abi],
  )

  return { ...state, currencyPriceInUSD, fetchIfoData }
}

export default useGetPublicIfoData
