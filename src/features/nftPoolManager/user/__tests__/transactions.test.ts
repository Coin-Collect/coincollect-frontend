import { BigNumber } from '@ethersproject/bignumber'
import { assertV2ConnectedNetwork, assertV2WriteGas, waitForV2Receipt } from '../transactions'

describe('V2 wallet transaction gas safety', () => {
  const provider = {
    getFeeData: jest.fn().mockResolvedValue({ maxFeePerGas: BigNumber.from(2), gasPrice: BigNumber.from(1) }),
    getBalance: jest.fn(),
  } as any
  const signer = { getAddress: jest.fn().mockResolvedValue('0x0000000000000000000000000000000000000001') } as any

  beforeEach(() => jest.clearAllMocks())

  it('includes native pool fee value as well as buffered gas in the required POL balance', async () => {
    provider.getBalance.mockResolvedValue(BigNumber.from(412))
    const result = await assertV2WriteGas(provider, signer, BigNumber.from(100), BigNumber.from(100))
    expect(result.gasLimit.toString()).toBe('125')
    expect(result.requiredBalance.toString()).toBe('412')
  })

  it('blocks when the wallet could pay gas but not gas plus the contract fee', async () => {
    provider.getBalance.mockResolvedValue(BigNumber.from(411))
    await expect(assertV2WriteGas(provider, signer, BigNumber.from(100), BigNumber.from(100))).rejects.toThrow(
      /native POL/,
    )
  })

  it('fails closed when gas pricing cannot be determined', async () => {
    provider.getFeeData.mockResolvedValue({})
    provider.getBalance.mockResolvedValue(BigNumber.from(1_000_000))
    await expect(assertV2WriteGas(provider, signer, BigNumber.from(100), BigNumber.from(0))).rejects.toThrow(
      /gas price is unavailable/,
    )
  })

  it('blocks a wrong chain and an account mismatch before any wallet write', async () => {
    const connectedProvider = { getNetwork: jest.fn().mockResolvedValue({ chainId: 31337 }) } as any
    await expect(
      assertV2ConnectedNetwork(connectedProvider, signer, '0x0000000000000000000000000000000000000001', 137),
    ).rejects.toThrow(/Wrong wallet network/)
    await expect(
      assertV2ConnectedNetwork(connectedProvider, signer, '0x0000000000000000000000000000000000000002', 31337),
    ).rejects.toThrow(/Wallet account changed/)
  })

  it('accepts only an identical replacement, including the native POL value', async () => {
    const receipt = { status: 1, transactionHash: '0xconfirmed' } as any
    const replacement = {
      to: '0x0000000000000000000000000000000000000002',
      data: '0x1234',
      value: BigNumber.from(17),
    }
    const transaction = {
      to: replacement.to,
      data: replacement.data,
      value: replacement.value,
      wait: jest.fn().mockRejectedValue({
        code: 'TRANSACTION_REPLACED',
        cancelled: false,
        replacement,
        receipt,
      }),
    } as any
    await expect(waitForV2Receipt(transaction, replacement.to, replacement.data)).resolves.toBe(receipt)

    const changedValue = {
      ...transaction,
      wait: jest.fn().mockRejectedValue({
        code: 'TRANSACTION_REPLACED',
        cancelled: false,
        replacement: { ...replacement, value: BigNumber.from(16) },
        receipt,
      }),
    }
    await expect(waitForV2Receipt(changedValue, replacement.to, replacement.data)).rejects.toThrow(
      /different transaction replaced/,
    )
  })

  it('surfaces wallet rejection and cancellation as non-retryable transaction outcomes', async () => {
    const cancelled = {
      wait: jest.fn().mockRejectedValue({ code: 'TRANSACTION_REPLACED', cancelled: true }),
    } as any
    await expect(waitForV2Receipt(cancelled, '0x0000000000000000000000000000000000000002', '0x')).rejects.toThrow(
      /cancelled in the wallet/,
    )
    const rejected = { wait: jest.fn().mockRejectedValue({ code: 4001 }) } as any
    await expect(waitForV2Receipt(rejected, '0x0000000000000000000000000000000000000002', '0x')).rejects.toThrow(
      /rejected in the wallet/,
    )
  })
})
