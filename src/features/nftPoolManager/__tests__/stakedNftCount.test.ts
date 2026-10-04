import { BigNumber } from '@ethersproject/bignumber'
import { readPoolStakedNftCount } from '../discovery'

it('counts NFTs held by a V2 pool across each configured collection exactly once', async () => {
  const balances: Record<string, string> = {
    '0x1111111111111111111111111111111111111111': '2',
    '0x2222222222222222222222222222222222222222': '3',
  }
  const readCollectionBalance = jest.fn(async (address: string) => BigNumber.from(balances[address.toLowerCase()]))

  const result = await readPoolStakedNftCount(
    [
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      '0x1111111111111111111111111111111111111111',
    ],
    readCollectionBalance,
  )

  expect(result.toString()).toBe('5')
  expect(readCollectionBalance).toHaveBeenCalledTimes(2)
})

it('reports zero when no configured collection holds an NFT in the pool', async () => {
  const readCollectionBalance = jest.fn(async () => BigNumber.from(0))

  const result = await readPoolStakedNftCount(['0x1111111111111111111111111111111111111111'], readCollectionBalance)

  expect(result.toString()).toBe('0')
})
