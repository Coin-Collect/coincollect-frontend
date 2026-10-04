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

function fundingFixture() {
  const poolAddress = '0x3333333333333333333333333333333333333333'
  const state = { pool: BigNumber.from(0), wallet: BigNumber.from(1000), native: BigNumber.from('1000000000000000000') }
  const wait = jest.fn()
  const write = {
    callStatic: { transfer: jest.fn().mockResolvedValue(true) },
    estimateGas: { transfer: jest.fn().mockResolvedValue(BigNumber.from(50000)) },
    transfer: jest.fn().mockImplementation((_pool, amount) => {
      wait.mockImplementationOnce(async () => {
        state.pool = state.pool.add(amount)
        return { status: 1, transactionHash: '0xfund' }
      })
      return { hash: '0xfund', wait }
    }),
  }
  const signer = {
    provider: {
      getFeeData: jest.fn().mockResolvedValue({ gasPrice: BigNumber.from(1) }),
      getBalance: jest.fn().mockImplementation(async () => state.native),
    },
    getAddress: jest.fn().mockResolvedValue('0x4444444444444444444444444444444444444444'),
  } as any
  const read = {
    balanceOf: jest.fn().mockImplementation(async (address) => (address === poolAddress ? state.pool : state.wallet)),
  }
  ;(Contract as unknown as jest.Mock).mockImplementation((_address, _abi, connection) =>
    connection === signer ? write : read,
  )
  return { state, write, signer, poolAddress, wait }
}

describe('NFT launch funding amounts', () => {
  it.each(['wallet', 'native'])('does not submit when the %s balance is insufficient', async (balance) => {
    const fixture = fundingFixture()
    fixture.state[balance as 'wallet' | 'native'] = BigNumber.from(0)
    await expect(
      fundNftPoolTokenIfNeeded(
        fixture.signer,
        fixture.poolAddress,
        plan.fundingRequirements.primary.tokenAddress,
        BigNumber.from(1000),
      ),
    ).rejects.toThrow(/Insufficient|POL/)
    expect(fixture.write.transfer).not.toHaveBeenCalled()
  })

  it('funds only the deficit of a partially funded side reward', async () => {
    const fixture = fundingFixture()
    fixture.state.pool = BigNumber.from(200)
    fixture.state.wallet = BigNumber.from(50)
    const side = plan.fundingRequirements.side[0]
    const result = await fundNftPoolTokenIfNeeded(
      fixture.signer,
      fixture.poolAddress,
      side.tokenAddress,
      sideFundingAmount(plan, side.tokenAddress),
    )
    expect(fixture.write.transfer).toHaveBeenCalledWith(fixture.poolAddress, BigNumber.from(50), expect.anything())
    expect(result.afterPoolBalance.toString()).toBe('250')
  })

  it('propagates a rejected wallet confirmation without recording a transaction', async () => {
    const fixture = fundingFixture()
    fixture.write.transfer.mockRejectedValue(Object.assign(new Error('User rejected'), { code: 4001 }))
    const submitted = jest.fn()
    await expect(
      fundNftPoolTokenIfNeeded(
        fixture.signer,
        fixture.poolAddress,
        plan.fundingRequirements.primary.tokenAddress,
        BigNumber.from(1000),
        submitted,
      ),
    ).rejects.toThrow('User rejected')
    expect(submitted).not.toHaveBeenCalled()
  })

  it('records a pending hash and waits for a confirmed balance read-back', async () => {
    const fixture = fundingFixture()
    let confirm!: () => void
    const confirmation = new Promise<void>((resolve) => {
      confirm = resolve
    })
    let submitted!: (hash: string) => void
    const hash = new Promise<string>((resolve) => {
      submitted = resolve
    })
    fixture.write.transfer.mockResolvedValue({
      hash: '0xfund',
      wait: async () => {
        await confirmation
        fixture.state.pool = BigNumber.from(1000)
        return { status: 1, transactionHash: '0xfund' }
      },
    })
    const funding = fundNftPoolTokenIfNeeded(
      fixture.signer,
      fixture.poolAddress,
      plan.fundingRequirements.primary.tokenAddress,
      BigNumber.from(1000),
      submitted,
    )
    expect(await hash).toBe('0xfund')
    expect(fixture.state.pool.isZero()).toBe(true)
    confirm()
    expect((await funding).status).toBe('VERIFIED')
    expect(fixture.write.transfer).toHaveBeenCalledTimes(1)
  })

  it.each([0, 1])('reconciles a replacement funding receipt with status %s', async (status) => {
    const fixture = fundingFixture()
    fixture.write.transfer.mockResolvedValue({
      hash: '0xfund',
      wait: async () => {
        fixture.state.pool = BigNumber.from(1000)
        throw { code: 'TRANSACTION_REPLACED', cancelled: false, receipt: { status, transactionHash: '0xreplacement' } }
      },
    })
    const submitted = jest.fn()
    const funding = fundNftPoolTokenIfNeeded(
      fixture.signer,
      fixture.poolAddress,
      plan.fundingRequirements.primary.tokenAddress,
      BigNumber.from(1000),
      submitted,
    )
    if (status === 0) await expect(funding).rejects.toThrow('Replacement funding transaction failed')
    else {
      expect((await funding).transactionHash).toBe('0xreplacement')
      expect(submitted.mock.calls).toEqual([['0xfund'], ['0xreplacement']])
    }
  })

  it('does not verify a reverted funding receipt even if the pool was otherwise funded', async () => {
    const fixture = fundingFixture()
    fixture.write.transfer.mockResolvedValue({
      hash: '0xfund',
      wait: async () => ({ status: 0, transactionHash: '0xfund' }),
    })
    await expect(
      fundNftPoolTokenIfNeeded(
        fixture.signer,
        fixture.poolAddress,
        plan.fundingRequirements.primary.tokenAddress,
        BigNumber.from(1000),
      ),
    ).rejects.toThrow('Funding transaction failed')
  })
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
    const signer: any = {
      provider: {
        getFeeData: jest.fn().mockResolvedValue({ gasPrice: BigNumber.from(1) }),
        getBalance: jest.fn().mockResolvedValue(BigNumber.from('1000000000000000000')),
      },
      getAddress: jest.fn().mockResolvedValue('0x4444444444444444444444444444444444444444'),
    }
    const readOnlyToken = {
      balanceOf: token.balanceOf,
      callStatic: { transfer: jest.fn().mockRejectedValue(new Error('missing sender')) },
      estimateGas: { transfer: jest.fn().mockRejectedValue(new Error('missing sender')) },
    }
    ;(Contract as unknown as jest.Mock).mockImplementation((_address, _abi, connection) =>
      connection === signer ? token : readOnlyToken,
    )
    const first = await fundNftPoolTokenIfNeeded(
      signer,
      poolAddress,
      plan.fundingRequirements.primary.tokenAddress,
      BigNumber.from(1000),
    )
    expect(first.status).toBe('VERIFIED')
    expect(token.callStatic.transfer).toHaveBeenCalledWith(poolAddress, BigNumber.from(700))
    expect(readOnlyToken.callStatic.transfer).not.toHaveBeenCalled()
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
      provider: {
        getFeeData: jest.fn().mockResolvedValue({ gasPrice: BigNumber.from(1) }),
        getBalance: jest.fn().mockResolvedValue(BigNumber.from('1000000000000000000')),
      },
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
