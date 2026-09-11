import { readIndexedArrayUntilRevert } from '../chainReads'

describe('bounded indexed chain reads', () => {
  it('stops at the first reverted getter', async () => {
    const contract = {
      callStatic: {
        communityCollections: jest.fn((index: number) =>
          index < 2 ? `0x${index}` : Promise.reject(new Error('revert')),
        ),
      },
    } as any
    const result = await readIndexedArrayUntilRevert<string>(contract, 'communityCollections', {
      hardCap: 8,
      timeoutMs: 100,
    })
    expect(result.values).toEqual(['0x0', '0x1'])
    expect(result.stoppedBy).toBe('revert')
  })

  it('does not wait forever on a broken getter', async () => {
    const contract = { callStatic: { sideRewardTokens: jest.fn(() => new Promise(() => undefined)) } } as any
    const result = await readIndexedArrayUntilRevert<string>(contract, 'sideRewardTokens', { hardCap: 8, timeoutMs: 5 })
    expect(result.stoppedBy).toBe('timeout')
    expect(result.values).toHaveLength(0)
  })
})
