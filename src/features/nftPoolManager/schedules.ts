import { Interface } from '@ethersproject/abi'
import { Contract } from '@ethersproject/contracts'
import type { Provider } from '@ethersproject/providers'
import chunk from 'lodash/chunk'
import { polygon } from 'viem/chains'

const scheduleAbi = new Interface([
  'function startBlock() view returns (uint256)',
  'function bonusEndBlock() view returns (uint256)',
])
const scheduleMethods = ['startBlock', 'bonusEndBlock'] as const
const multicallAbi = [
  'function aggregate3((address target, bool allowFailure, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[])',
]

export type NftPoolSchedule = { startBlock?: number; endBlock?: number }

export async function readNftPoolSchedules(provider: Provider, addresses: string[], blockTag: number) {
  const multicall = new Contract(polygon.contracts.multicall3.address, multicallAbi, provider)
  const schedules = new Map<string, NftPoolSchedule>()
  const callData = scheduleMethods.map((method) => scheduleAbi.encodeFunctionData(method))
  await Promise.all(
    chunk(addresses, 20).map(async (batch) => {
      try {
        const calls = batch.flatMap((target) => callData.map((data) => [target, true, data]))
        const results: Array<[boolean, string]> = await multicall.callStatic.aggregate3(calls, { blockTag })
        if (results.length !== calls.length) return
        batch.forEach((address, index) => {
          const [startBlock, endBlock] = scheduleMethods.map((method, offset) => {
            const [success, data] = results[index * scheduleMethods.length + offset]
            if (!success) return undefined
            try {
              const value = Number(scheduleAbi.decodeFunctionResult(method, data)[0].toString())
              return Number.isSafeInteger(value) && value > 0 ? value : undefined
            } catch {
              return undefined
            }
          })
          schedules.set(address.toLowerCase(), { startBlock, endBlock })
        })
      } catch {
        // An unreadable batch provides no schedule evidence for its pools.
      }
    }),
  )
  return schedules
}
