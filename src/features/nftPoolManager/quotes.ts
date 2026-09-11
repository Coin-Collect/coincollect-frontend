import { Contract } from '@ethersproject/contracts'
import type { Provider } from '@ethersproject/providers'
import { BigNumber } from '@ethersproject/bignumber'
import routerAbi from 'config/abi/IPancakeRouter02.json'
import { ROUTER_ADDRESS } from 'config/constants'
import { mainnetTokens } from 'config/constants/tokens'
import { normalizeNftAddress } from './registry'

export interface NftRewardQuote {
  budgetTokenAddress: string
  rewardTokenAddress: string
  inputAmountBaseUnits: BigNumber
  outputAmountBaseUnits: BigNumber
  path: string[]
  source: string
  quotedAt: number
  freshnessSeconds: number
}

export interface NftRewardQuoteProvider {
  quote(input: {
    budgetTokenAddress: string
    rewardTokenAddress: string
    amountBaseUnits: BigNumber
  }): Promise<NftRewardQuote>
}

const routerPaths = (input: string, output: string): string[][] => {
  const wmatic = mainnetTokens.wmatic.address
  const collect = mainnetTokens.collect.address
  const candidates = [
    [input, output],
    [input, wmatic, output],
    [input, collect, output],
  ]
  return candidates.filter((path) => new Set(path.map((address) => address.toLowerCase())).size === path.length)
}

/** Read-only quote adapter over the router already used by the swap UI. */
export function createNftRewardQuoteProvider(
  provider: Provider,
  routerAddress = ROUTER_ADDRESS,
): NftRewardQuoteProvider {
  const router = new Contract(routerAddress, routerAbi, provider)
  return {
    async quote({ budgetTokenAddress, rewardTokenAddress, amountBaseUnits }) {
      const input = normalizeNftAddress(budgetTokenAddress)
      const output = normalizeNftAddress(rewardTokenAddress)
      if (!input || !output || amountBaseUnits.lte(0)) throw new Error('Quote input is incomplete.')
      let lastError: unknown
      for (const path of routerPaths(input, output)) {
        try {
          const amounts = await router.getAmountsOut(amountBaseUnits, path)
          const outputAmountBaseUnits = BigNumber.from(amounts[amounts.length - 1])
          return {
            budgetTokenAddress: input,
            rewardTokenAddress: output,
            inputAmountBaseUnits: amountBaseUnits,
            outputAmountBaseUnits,
            path,
            source: `Configured Polygon V2 router ${routerAddress}`,
            quotedAt: Date.now(),
            freshnessSeconds: 30,
          }
        } catch (error) {
          lastError = error
        }
      }
      throw new Error(
        lastError instanceof Error ? lastError.message : 'No read-only route was found for this token pair.',
      )
    },
  }
}
