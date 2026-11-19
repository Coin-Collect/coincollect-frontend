import { TextDecoder, TextEncoder } from 'util'
import { loadVerifiedAbi } from '../verifiedAbi'

const address = '0x1111111111111111111111111111111111111111'
const runtime = '0x60006000'
const response = {
  chainId: '137',
  address,
  runtimeMatch: 'exact_match',
  runtimeBytecode: { onchainBytecode: runtime },
  abi: [{ type: 'function', name: 'withdrawFunds', stateMutability: 'nonpayable', inputs: [], outputs: [] }],
}

const originalFetch = globalThis.fetch
const originalDecoder = globalThis.TextDecoder

function respond(body: unknown) {
  const reader = {
    read: jest
      .fn()
      .mockResolvedValueOnce({ value: new TextEncoder().encode(JSON.stringify(body)), done: false })
      .mockResolvedValueOnce({ done: true }),
    cancel: jest.fn().mockResolvedValue(undefined),
  }
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, body: { getReader: () => reader } })
  return reader
}

beforeEach(() => {
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder
})

afterEach(() => {
  globalThis.fetch = originalFetch
  globalThis.TextDecoder = originalDecoder
})

it('uses the verified ABI only with matching chain, address and deployed bytes', async () => {
  const reader = respond(response)
  const abi = await loadVerifiedAbi(137, address, runtime)
  expect(abi?.getFunction('withdrawFunds').format()).toBe('withdrawFunds()')
  expect(globalThis.fetch).toHaveBeenCalledWith(
    expect.stringContaining('/137/' + address + '?fields='),
    expect.objectContaining({ credentials: 'omit', redirect: 'error' }),
  )
  expect(reader.cancel).toHaveBeenCalled()
})

it.each([
  { ...response, chainId: '1' },
  { ...response, address: '0x2222222222222222222222222222222222222222' },
  { ...response, runtimeMatch: null },
  { ...response, runtimeBytecode: { onchainBytecode: '0x60016000' } },
])('ignores a lookup without matching proof', async (value) => {
  respond(value)
  await expect(loadVerifiedAbi(137, address, runtime)).resolves.toBeUndefined()
})
