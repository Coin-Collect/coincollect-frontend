import { Contract } from '@ethersproject/contracts'
import type { Provider } from '@ethersproject/providers'
import { BigNumber } from '@ethersproject/bignumber'
import routerAbi from 'config/abi/IPancakeRouter02.json'
import { ROUTER_ADDRESS } from 'config/constants'
import { mainnetTokens } from 'config/constants/tokens'
import { getAddress } from '@ethersproject/address'
import { NftPoolDraftQuote, NftQuoteState } from './types'

const QUOTE_FRESHNESS_SECONDS = 30
const QUOTE_EXPIRY_SECONDS = 120

export interface NftRewardQuote {
  budgetTokenAddress: string
  rewardTokenAddress: string
  inputAmountBaseUnits: BigNumber
  outputAmountBaseUnits: BigNumber
  path: string[]
  source: 'router' | 'identity'
  sourceLabel: string
  quotedAt: number
  freshnessSeconds: number
  expirySeconds: number
}

export interface NftRewardQuoteProvider {
  quote(input: {
    budgetTokenAddress: string
    rewardTokenAddress: string
    amountBaseUnits: BigNumber
  }): Promise<NftRewardQuote>
}

function canonicalAddress(input: string): string | undefined {
  try {
    return getAddress(input.trim())
  } catch {
    return undefined
  }
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

/** A quote is dynamic data: never let old data silently look current. */
export function getNftQuoteState(quote: NftPoolDraftQuote, now = Date.now()): NftQuoteState {
  const ageSeconds = Math.max(0, (now - quote.quotedAt) / 1000)
  if (ageSeconds <= quote.freshnessSeconds) return 'FRESH'
  if (ageSeconds <= quote.expirySeconds) return 'STALE'
  return 'EXPIRED'
}

export function quoteMatchesInputs(
  quote: NftPoolDraftQuote,
  input: {
    budgetTokenAddress: string
    rewardTokenAddress: string
    totalBudget: string
    allocationBps: string
    allocatedBudget: BigNumber
    budgetDecimals: number
  },
): boolean {
  const budget = canonicalAddress(input.budgetTokenAddress)
  const reward = canonicalAddress(input.rewardTokenAddress)
  if (!budget || !reward) return false
  if (quote.budgetTokenAddress.toLowerCase() !== budget.toLowerCase()) return false
  if (quote.rewardTokenAddress.toLowerCase() !== reward.toLowerCase()) return false
  if (quote.source === 'identity' && budget.toLowerCase() !== reward.toLowerCase()) return false
  if (quote.source === 'identity' && quote.path.length !== 0) return false
  if (quote.totalBudget !== input.totalBudget || quote.allocationBps !== input.allocationBps) return false
  if (typeof quote.inputAmount !== 'string') return false
  try {
    const scale = BigNumber.from(10).pow(input.budgetDecimals)
    const [whole, fraction = ''] = quote.inputAmount.trim().split('.')
    if (!/^\d+$/.test(whole || '') || !/^\d*$/.test(fraction) || fraction.length > input.budgetDecimals) return false
    const inputBaseUnits = BigNumber.from(whole)
      .mul(scale)
      .add(fraction.padEnd(input.budgetDecimals, '0') ? BigNumber.from(fraction.padEnd(input.budgetDecimals, '0')) : 0)
    return inputBaseUnits.eq(input.allocatedBudget)
  } catch {
    return false
  }
}

/** Read-only adapter over the project's configured Polygon router. */
export function createNftRewardQuoteProvider(
  provider: Provider,
  routerAddress = ROUTER_ADDRESS,
): NftRewardQuoteProvider {
  const canonicalRouterAddress = canonicalAddress(routerAddress)
  if (!canonicalRouterAddress) throw new Error('The configured Polygon router address is invalid.')
  const router = new Contract(canonicalRouterAddress, routerAbi, provider)
  return {
    async quote({ budgetTokenAddress, rewardTokenAddress, amountBaseUnits }) {
      const input = canonicalAddress(budgetTokenAddress)
      const output = canonicalAddress(rewardTokenAddress)
      if (!input || !output || amountBaseUnits.lte(0)) throw new Error('Quote input is incomplete.')
      const quotedAt = Date.now()

      if (input.toLowerCase() === output.toLowerCase()) {
        return {
          budgetTokenAddress: input,
          rewardTokenAddress: output,
          inputAmountBaseUnits: amountBaseUnits,
          outputAmountBaseUnits: amountBaseUnits,
          path: [],
          source: 'identity',
          sourceLabel: 'Identity quote',
          quotedAt,
          freshnessSeconds: QUOTE_FRESHNESS_SECONDS,
          expirySeconds: QUOTE_EXPIRY_SECONDS,
        }
      }

      let lastError: unknown
      for (const path of routerPaths(input, output)) {
        try {
          const amounts = await router.getAmountsOut(amountBaseUnits, path)
          const outputAmountBaseUnits = BigNumber.from(amounts[amounts.length - 1])
          if (outputAmountBaseUnits.lte(0)) {
            lastError = new Error('The configured router returned zero output.')
            continue
          }
          return {
            budgetTokenAddress: input,
            rewardTokenAddress: output,
            inputAmountBaseUnits: amountBaseUnits,
            outputAmountBaseUnits,
            path,
            source: 'router',
            sourceLabel: `Configured Polygon V2 router ${canonicalRouterAddress}`,
            quotedAt,
            freshnessSeconds: QUOTE_FRESHNESS_SECONDS,
            expirySeconds: QUOTE_EXPIRY_SECONDS,
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

export { QUOTE_EXPIRY_SECONDS, QUOTE_FRESHNESS_SECONDS }
