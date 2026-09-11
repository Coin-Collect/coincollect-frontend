import { validateNftCollectionAddress } from '../validation'

const mockSupportsInterface = jest.fn()
const mockName = jest.fn()
const mockSymbol = jest.fn()
const mockBalanceOf = jest.fn()
const mockOwnerOf = jest.fn()

jest.mock('@ethersproject/contracts', () => ({
  Contract: jest.fn((_address: string, abi: any[]) => {
    const definitions = abi.map((item) => String(item))
    if (definitions.some((item) => item.includes('supportsInterface')))
      return { supportsInterface: mockSupportsInterface }
    return {
      callStatic: {
        name: mockName,
        symbol: mockSymbol,
        balanceOf: mockBalanceOf,
        ownerOf: mockOwnerOf,
      },
    }
  }),
}))

const address = '0x1111111111111111111111111111111111111111'
const zeroAddress = '0x0000000000000000000000000000000000000000'
const nonZeroProbe = '0x0000000000000000000000000000000000000001'

function provider(code = '0x6000') {
  return { getCode: jest.fn().mockResolvedValue(code) } as any
}

describe('safe ERC-721 validation', () => {
  beforeEach(() => {
    mockSupportsInterface.mockReset()
    mockName.mockReset()
    mockSymbol.mockReset()
    mockBalanceOf.mockReset()
    mockOwnerOf.mockReset()
    mockName.mockResolvedValue('Collection')
    mockSymbol.mockResolvedValue('NFT')
  })

  it('accepts ERC165-confirmed ERC721 without metadata extensions', async () => {
    mockSupportsInterface.mockResolvedValue(true)
    mockName.mockRejectedValue(new Error('optional'))
    mockSymbol.mockRejectedValue(new Error('optional'))
    const result = await validateNftCollectionAddress(provider(), address)
    expect(result.valid).toBe(true)
    expect(result.certainty).toBe('VERIFIED_ERC721')
    expect(mockBalanceOf).not.toHaveBeenCalled()
  })

  it('does not probe balanceOf with zero address', async () => {
    mockSupportsInterface.mockRejectedValue(new Error('ERC165 unavailable'))
    mockBalanceOf.mockResolvedValue(0)
    mockOwnerOf.mockRejectedValue(new Error('token 0 is unminted'))
    const result = await validateNftCollectionAddress(provider('0x6352211e23b872dd'), address)
    expect(result.valid).toBe(true)
    expect(result.certainty).toBe('COMPATIBLE')
    expect(mockBalanceOf).toHaveBeenCalledWith(nonZeroProbe)
    expect(mockBalanceOf).not.toHaveBeenCalledWith(zeroAddress)
  })

  it('accepts a legacy compatible fallback when ownerOf is readable', async () => {
    mockSupportsInterface.mockRejectedValue(new Error('unavailable'))
    mockBalanceOf.mockResolvedValue(1)
    mockOwnerOf.mockResolvedValue(address)
    const result = await validateNftCollectionAddress(provider(), address)
    expect(result.valid).toBe(true)
    expect(result.certainty).toBe('COMPATIBLE')
  })

  it('rejects no-code and an explicit ERC165 false response', async () => {
    expect((await validateNftCollectionAddress(provider('0x'), address)).valid).toBe(false)
    mockSupportsInterface.mockResolvedValue(false)
    const result = await validateNftCollectionAddress(provider(), address)
    expect(result.valid).toBe(false)
    expect(result.certainty).toBe('INVALID')
  })
})
