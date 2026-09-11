import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import { fundNftPoolTokenIfNeeded, primaryFundingAmount, sideFundingAmount } from '../funding'
import { NftPoolDeploymentPlan } from '../../types'

jest.mock('@ethersproject/contracts', () => ({ Contract: jest.fn() }))

const plan = {
  fundingRequirements: {
    primary: { tokenAddress: '0x1111111111111111111111111111111111111111', maximumScheduledFunding: '1000' },
    side: [{ tokenAddress: '0x2222222222222222222222222222222222222222', maximumImpliedSideFunding: '250' }],
  },
} as NftPoolDeploymentPlan

describe('NFT launch funding amounts', () => {
  it('funds from maximum scheduled/implied requirements, not desired or budget amounts', () => {
    expect(primaryFundingAmount(plan)).toEqual(BigNumber.from(1000))
    expect(sideFundingAmount(plan, plan.fundingRequirements.side[0].tokenAddress)).toEqual(BigNumber.from(250))
  })

  it('rejects a token that is not in the frozen plan', () => {
    expect(() => sideFundingAmount(plan, '0x3333333333333333333333333333333333333333')).toThrow('frozen launch plan')
  })

  it('transfers only the missing amount and skips an already-funded pool', async () => {
    const poolAddress = '0x3333333333333333333333333333333333333333'
    let poolBalance = BigNumber.from(300)
    const transfer = jest.fn().mockImplementation((_pool: string, amount: BigNumber) => {
      poolBalance = poolBalance.add(amount)
      return { hash: '0xfund', wait: jest.fn().mockResolvedValue({ status: 1, transactionHash: '0xfund' }) }
    })
    const token = {
      balanceOf: jest
        .fn()
        .mockImplementation((address: string) =>
          Promise.resolve(address.toLowerCase() === poolAddress ? poolBalance : BigNumber.from(1000)),
        ),
      callStatic: { transfer: jest.fn().mockResolvedValue(true) },
      estimateGas: { transfer: jest.fn().mockResolvedValue(BigNumber.from(50000)) },
      transfer,
    }
    ;(Contract as unknown as jest.Mock).mockImplementation(() => token)
    const signer: any = {
      provider: {},
      getAddress: jest.fn().mockResolvedValue('0x4444444444444444444444444444444444444444'),
    }
    const first = await fundNftPoolTokenIfNeeded(
      signer,
      poolAddress,
      plan.fundingRequirements.primary.tokenAddress,
      BigNumber.from(1000),
    )
    expect(first.status).toBe('VERIFIED')
    expect(transfer).toHaveBeenCalledWith(poolAddress, BigNumber.from(700), expect.anything())
    const second = await fundNftPoolTokenIfNeeded(
      signer,
      poolAddress,
      plan.fundingRequirements.primary.tokenAddress,
      BigNumber.from(1000),
    )
    expect(second.status).toBe('SKIPPED')
    expect(transfer).toHaveBeenCalledTimes(1)
  })

  it('fails verification for a fee-on-transfer token instead of claiming funding success', async () => {
    const poolAddress = '0x3333333333333333333333333333333333333333'
    let poolBalance = BigNumber.from(0)
    const token = {
      balanceOf: jest
        .fn()
        .mockImplementation((address: string) =>
          Promise.resolve(address.toLowerCase() === poolAddress ? poolBalance : BigNumber.from(1000)),
        ),
      callStatic: { transfer: jest.fn().mockResolvedValue(true) },
      estimateGas: { transfer: jest.fn().mockResolvedValue(BigNumber.from(50000)) },
      transfer: jest.fn().mockImplementation(() => ({
        hash: '0xfee',
        wait: jest.fn().mockImplementation(async () => {
          poolBalance = BigNumber.from(500)
          return { status: 1, transactionHash: '0xfee' }
        }),
      })),
    }
    ;(Contract as unknown as jest.Mock).mockImplementation(() => token)
    const signer: any = {
      provider: {},
      getAddress: jest.fn().mockResolvedValue('0x4444444444444444444444444444444444444444'),
    }
    await expect(
      fundNftPoolTokenIfNeeded(
        signer,
        poolAddress,
        plan.fundingRequirements.primary.tokenAddress,
        BigNumber.from(1000),
      ),
    ).rejects.toThrow('Funding verification failed')
  })
})
