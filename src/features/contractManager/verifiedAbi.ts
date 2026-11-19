import { Interface } from '@ethersproject/abi'

const SOURCIFY = 'https://sourcify.dev/server/v2/contract'
const MAX_RESPONSE_BYTES = 1_500_000

export async function loadVerifiedAbi(chainId: number, address: string, code: string): Promise<Interface | undefined> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4_500)
  try {
    const response = await fetch(`${SOURCIFY}/${chainId}/${address}?fields=abi,runtimeBytecode.onchainBytecode`, {
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'error',
    })
    if (!response.ok || !response.body) return undefined
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let body = ''
    let size = 0
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > MAX_RESPONSE_BYTES) return undefined
        body += decoder.decode(value, { stream: true })
      }
      body += decoder.decode()
    } finally {
      // Cancel partial reads, including oversized responses.
      void reader.cancel().catch(() => undefined)
    }
    const result = JSON.parse(body)
    if (
      String(result.chainId) !== String(chainId) ||
      result.address?.toLowerCase() !== address.toLowerCase() ||
      !['exact_match', 'match'].includes(result.runtimeMatch) ||
      result.runtimeBytecode?.onchainBytecode?.toLowerCase() !== code.toLowerCase() ||
      !Array.isArray(result.abi) ||
      result.abi.length > 512
    )
      return undefined
    return new Interface(result.abi)
  } catch {
    return undefined
  } finally {
    clearTimeout(timeout)
  }
}
