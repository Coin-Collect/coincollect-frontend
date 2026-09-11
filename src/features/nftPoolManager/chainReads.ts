import { Contract } from '@ethersproject/contracts'

export type IndexedArrayStopReason = 'revert' | 'timeout' | 'hard-cap'

export interface IndexedArrayResult<T> {
  values: T[]
  stoppedBy: IndexedArrayStopReason
  error?: string
}

/**
 * Reads a Solidity public array through its indexed getter. There is no
 * length getter on the deployed NFT pool, so a revert is the only safe end
 * marker. A hard cap and per-item timeout keep one bad pool isolated.
 */
export async function readIndexedArrayUntilRevert<T>(
  contract: Contract,
  method: string,
  options: { hardCap?: number; timeoutMs?: number } = {},
): Promise<IndexedArrayResult<T>> {
  const hardCap = options.hardCap || 32
  const timeoutMs = options.timeoutMs || 10_000
  const values: T[] = []
  for (let index = 0; index < hardCap; index += 1) {
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      const call = Promise.resolve(contract.callStatic[method](index) as Promise<T>)
      const timeoutCall = new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`Indexed ${method}[${index}] timed out.`)), timeoutMs)
      })
      values.push(await Promise.race([call, timeoutCall]))
    } catch (error) {
      const message = error instanceof Error ? error.message : `Indexed ${method}[${index}] reverted.`
      return {
        values,
        stoppedBy: message.includes('timed out') ? 'timeout' : 'revert',
        error: message,
      }
    } finally {
      if (timeout) clearTimeout(timeout)
    }
  }
  return { values, stoppedBy: 'hard-cap', error: `Indexed ${method} reached the ${hardCap} item safety cap.` }
}
