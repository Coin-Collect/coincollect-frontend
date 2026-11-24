import { createWalletClient, custom, toFunctionSelector, toHex, zeroAddress, zeroHash } from 'viem'
import { assertLocalFork, describeV3Error, withV3GasHeadroom } from './transactions'
import type { V3Client } from './runtime'

const sharedHash = toHex(1, { size: 32 })
const nextHash = toHex(2, { size: 32 })

function forkRead(head: number, headHash: `0x${string}`, latestOnApp?: { number: bigint; hash: `0x${string}` }) {
  const wallet = createWalletClient({
    transport: custom({
      async request({ params }) {
        if (params?.[0] === 'latest') return { number: toHex(head), hash: headHash, transactions: [] }
        return { number: '0xed', hash: sharedHash, transactions: [] }
      },
    }),
  })
  const appGetBlock = jest.fn(async (options?: { blockNumber?: bigint }) => {
    if (options?.blockNumber !== undefined) {
      if (latestOnApp?.number === options.blockNumber) return latestOnApp
      throw new Error('Block not found')
    }
    return { number: BigInt(237), hash: sharedHash }
  })
  return { wallet, client: { getBlock: appGetBlock } as unknown as V3Client, appGetBlock }
}

it('rejects a wallet fork that shares the preview head but has mined its own blocks', async () => {
  const { wallet, client, appGetBlock } = forkRead(272, nextHash)
  await expect(assertLocalFork(wallet, client)).rejects.toThrow('Wallet block 272 is not part of this preview’s chain.')
  expect(appGetBlock).toHaveBeenCalledWith({ blockNumber: BigInt(272) })
})

it('accepts a wallet when the preview recognizes a block mined concurrently', async () => {
  const { wallet, client } = forkRead(238, nextHash, { number: BigInt(238), hash: nextHash })
  await expect(assertLocalFork(wallet, client)).resolves.toBeUndefined()
})

it.each([
  [236, sharedHash, 'Your wallet reports block 236'],
  [237, zeroHash, 'Wallet block 237 is not part of this preview’s chain.'],
] as const)('rejects an out-of-sync head at block %s', async (head, hash, message) => {
  const { wallet, client } = forkRead(head, hash)
  await expect(assertLocalFork(wallet, client)).rejects.toThrow(message)
})

it('accepts a wallet reporting the same current preview block', async () => {
  const { wallet, client } = forkRead(237, sharedHash)
  await expect(assertLocalFork(wallet, client)).resolves.toBeUndefined()
})

it.each([
  new Error('The requested method and/or account has not been authorized by the user.'),
  { shortMessage: 'The requested account and/or method has not been authorized by the user.' },
])('explains wallet permission failures with an actionable recovery', (error) => {
  expect(describeV3Error(error)).toBe(
    'Your wallet has not authorized this account or network for CoinCollect. Review the site permissions in your wallet, then retry.',
  )
})

it('keeps room for a ledger exit to start paying between simulation and execution', () => {
  const address = '0x0000000000000000000000000000000000000001'
  const estimate = BigInt(88_722)
  const data = toFunctionSelector('exit(uint256,uint256,address,uint256)')
  expect(withV3GasHeadroom(estimate, { ledger: address, call: { to: address, data } })).toBe(BigInt(281_466))
  expect(withV3GasHeadroom(estimate, { ledger: address, call: { to: zeroAddress, data } })).toBe(BigInt(131_466))
  expect(withV3GasHeadroom(estimate)).toBe(BigInt(131_466))
})
