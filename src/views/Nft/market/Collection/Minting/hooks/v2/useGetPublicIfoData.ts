import BigNumber from 'bignumber.js'
import { useState, useCallback } from 'react'
import { BSC_BLOCK_TIME, POLYGON_BLOCK_TIME } from 'config'
import ifoV2Abi from 'config/abi/ifoV2.json'
import coinCollectAbi from 'config/abi/coinCollectNft.json'
import tokens from 'config/constants/tokens'
import { Ifo, IfoStatus, Minting, MintingStatus } from 'config/constants/types'
import { FixedNumber } from '@ethersproject/bignumber'

import { useLpTokenPrice, usePriceCakeBusd } from 'state/farms/hooks'
import { BIG_ZERO } from 'utils/bigNumber'
import { multicallPolygonv1, multicallv2 } from 'utils/multicall'
import { PublicIfoData } from '../../types'
import { getStatus } from '../helpers'
import { useWeb3React } from '@web3-react/core'
import { formatEther } from '@ethersproject/units'

// https://github.com/pancakeswap/pancake-contracts/blob/master/projects/ifo/contracts/IFOV2.sol#L431
// 1,000,000,000 / 100
const TAX_PRECISION = FixedNumber.from(10000000000)

const formatPriceDetails = (details) => ({
  partialMaxSupply: details ? details[0].toNumber() : 0,
  isLastPrice: details ? details[2] : true,
  nextPrice: details ? parseFloat(formatEther(details[3])) : 0,
})

/**
 * Gets all public data of an IFO
 */
const useGetPublicIfoData = (ifo: Minting): PublicIfoData => {
  const { address, releaseBlockNumber, version, lastPrice } = ifo
  const cakePriceUsd = usePriceCakeBusd()
  //const lpTokenPriceInUsd = useLpTokenPrice(ifo.currency.symbol)
  const currencyPriceInUSD = new BigNumber(1)
  const { account } = useWeb3React()

  const [state, setState] = useState({
    isInitialized: false,
    status: 'idle' as MintingStatus,
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
    balance: 0,
    totalSupply: 0,
    cost: 0,
    holderDiscountPercentage: 0,
    partialMaxSupply: 0, 
    isLastPrice: true, 
    nextPrice: 0,
    lastPrice,
  })

  const abi = coinCollectAbi

  const fetchIfoData = useCallback(
    async (currentBlock: number, account: string | undefined) => {
  
      const [
        totalSupply,
        maxSupply,
        isSaleActive,
        cost,
        balance,
        priceDetails,
        startBlock,
        holderDiscountPercentage,
      ] = await multicallPolygonv1(
        abi,
        [
          {
            address,
            name: 'totalSupply',
          },
          {
            address,
            name: 'maxSupply',
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
          version === 3.1 && {
            address,
            name: 'getPriceDetails',
          },
          version === 3.1 && {
            address,
            name: 'startBlock',
          },
          version === 3.1 && {
            address,
            name: 'holderDiscountPercentage',
          },
        ].filter(Boolean),
      )
        
      

      const priceDetailsFormatted = formatPriceDetails(priceDetails)

      const startBlockNum = startBlock ? startBlock[0].toNumber() : 0
      const totalSupplyNum =  totalSupply ? totalSupply[0].toNumber() : 0
      const maxSupplyNum =  maxSupply ? maxSupply[0].toNumber() : 0
      const formattedCost = cost ? parseFloat(formatEther(cost[0])) : 0
      const balanceNum = balance ? balance[0].toNumber() : 0
      const holderDiscountPercentageNum = holderDiscountPercentage ? holderDiscountPercentage[0].toNumber() : 0
      
      const status = getStatus(currentBlock, startBlockNum, totalSupplyNum, maxSupplyNum, isSaleActive)

      const isDynamicPrice = (priceDetailsFormatted.partialMaxSupply && priceDetailsFormatted.nextPrice);

      //Calculate Progress Percantage
      const progress = isDynamicPrice ? (totalSupplyNum * 100) / priceDetailsFormatted.partialMaxSupply
                                      : (totalSupplyNum * 100) / maxSupplyNum


      setState((prev) => ({
        ...prev,
        isInitialized: true,
        secondsUntilStart: (startBlockNum - currentBlock) * POLYGON_BLOCK_TIME,
        totalSupply: totalSupplyNum,
        isSaleActive,
        cost: formattedCost,
        balance: balanceNum,
        holderDiscountPercentage: holderDiscountPercentageNum,
        status,
        progress,
        ...priceDetailsFormatted,
      }))
    },
    [releaseBlockNumber, address, version, abi],
  )

  return { ...state, currencyPriceInUSD, fetchIfoData }
}

export default useGetPublicIfoData
