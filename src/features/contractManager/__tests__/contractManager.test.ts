import { Interface } from '@ethersproject/abi'
import { BigNumber } from '@ethersproject/bignumber'
import type { JsonRpcProvider } from '@ethersproject/providers'
import type { Signer } from 'ethers'
import addresses from 'config/constants/contracts'
import {
  explainWithdrawalError,
  inspectContract,
  parseContractAddress,
  prepareWithdrawal,
  submitReviewedWithdrawal,
} from '../chain'
import { NITRO_ADDRESS, WPOL_ADDRESS } from '../profiles'
import { loadVerifiedAbi } from '../verifiedAbi'

jest.mock('config/constants/tokens', () => ({
  mainnetTokens: Object.fromEntries(
    ['collect', 'wmatic', 'usdc', 'usdt', 'nitro'].map((name, index) => [
      name,
      {
        address:
          name === 'wmatic' ? '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' : '0x' + (index + 1).toString().repeat(40),
        symbol: name === 'wmatic' ? 'WPOL' : name.toUpperCase(),
        decimals: 18,
      },
    ]),
  ),
}))
jest.mock('../verifiedAbi', () => ({ loadVerifiedAbi: jest.fn() }))
jest.mock('viem', () => ({
  keccak256: jest.fn(
    (code: string) =>
      ({
        [mockNftRuntime('6001', '00')]: '0x86048a576ede6f69d4bbc9d35b076a3a476f8103b9ed860b32c27682c156c146',
        '0x02': '0xeeb80f16c3b42688be43d06d4abb6f23b2dffc2365357aba55135adbcf85f9ca',
        '0x03': '0xca5c90ffe1d24c1d7fc301b0afb9c9fa92fc94af2fb68c14a7713ee728d38f76',
        '0x04': '0xae820ea59b005f58a45eea35b374afbd5dc503d4f219a6b670cd3453f1142ed5',
        [mockNftRuntime('6005', '00')]: '0x61b8a9ef1ecad85a496e28768faa5c16817eff3f703aeb38e4e09e446e670fed',
        [mockNftRuntime('6006', '00')]: '0xce8bc3efcd915566bbbd1a3813d512ef276ea1f70e51385a9d959d55b97a39b1',
      }[code] || 'unreviewed'),
  ),
}))

function mockNftRuntime(body: string, digestByte: string) {
  return '0x' + body + 'fea2646970667358221220' + digestByte.repeat(32) + '64736f6c63430008070033'
}

const GOLD_NFT_ADDRESS = addresses.coinCollectGoldNft[137]
const ZIDANOGO_ADDRESS = addresses.zidanogoNft[137]
const NITRO_CODE = mockNftRuntime('6001', '01')
const ZIDANOGO_CODE = mockNftRuntime('6005', '05')
const GOLD_CODE = mockNftRuntime('6006', '06')
const WALLET = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa'
const OTHER = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB'
const CONTRACT = '0x9999999999999999999999999999999999999999'
const abi = new Interface([
  'function name() view returns (string)',
  'function owner() view returns (address)',
  'function shares(address) view returns (uint256)',
  'function releasable(address) view returns (uint256)',
  'function releasable(address,address) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function withdraw()',
  'function withdrawFunds()',
  'function release(address)',
  'function release(address,address)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function hasRole(bytes32,address) view returns (bool)',
])

function rpcFixture(contract = NITRO_ADDRESS, code = NITRO_CODE) {
  const state = {
    code,
    name: 'NitroClash',
    owner: WALLET,
    amount: BigNumber.from(60),
    shares: 1,
    chain: '0x89',
    fee: 3,
    usesEip1559: false,
    baseFee: BigNumber.from(250_000_000_000),
    polygonTip: undefined as BigNumber | undefined,
    walletBalance: BigNumber.from(2_000_000),
    destination: WALLET,
  }
  const trace = jest.fn((params: any[]) => ({
    from: params[0].from,
    to: contract,
    input: params[0].data,
    calls: [{ from: contract, to: state.destination, type: 'CALL', value: state.amount.toHexString(), input: '0x' }],
  }))
  const send = jest.fn(async (method: string, params: any[]) => {
    if (method === 'eth_chainId') return state.chain
    if (method === 'eth_maxPriorityFeePerGas') {
      if (state.polygonTip) return state.polygonTip.toHexString()
      throw new Error('Method not supported')
    }
    return trace(params)
  })
  const getCode = jest.fn(async (address: string) =>
    address.toLowerCase() === contract.toLowerCase()
      ? state.code
      : address.toLowerCase() === WPOL_ADDRESS.toLowerCase()
      ? '0x04'
      : '0x',
  )
  const call = jest.fn(async (request: { data: string; from?: string }) => {
    if (request.from) return '0x'
    const id = request.data.slice(0, 10)
    if (id === abi.getSighash('name()')) return abi.encodeFunctionResult('name()', [state.name])
    if (id === abi.getSighash('owner()')) return abi.encodeFunctionResult('owner()', [state.owner])
    if (id === abi.getSighash('shares(address)')) return abi.encodeFunctionResult('shares(address)', [state.shares])
    if (id === abi.getSighash('releasable(address)')) return abi.encodeFunctionResult('releasable(address)', [10])
    if (id === abi.getSighash('releasable(address,address)'))
      return abi.encodeFunctionResult('releasable(address,address)', [7])
    if (id === abi.getSighash('balanceOf(address)')) return abi.encodeFunctionResult('balanceOf(address)', [20])
    if (id === abi.getSighash('DEFAULT_ADMIN_ROLE()'))
      return abi.encodeFunctionResult('DEFAULT_ADMIN_ROLE()', ['0x' + '0'.repeat(64)])
    if (id === abi.getSighash('hasRole(bytes32,address)'))
      return abi.encodeFunctionResult('hasRole(bytes32,address)', [true])
    throw new Error('Unsupported view')
  })
  const estimateGas = jest.fn(async () => BigNumber.from(25_000))
  const provider = {
    send,
    getCode,
    call,
    estimateGas,
    getBlockNumber: async () => 9_000,
    getBalance: async (address: string) =>
      address.toLowerCase() === contract.toLowerCase() ? state.amount : state.walletBalance,
    getFeeData: async () =>
      state.usesEip1559
        ? {
            lastBaseFeePerGas: state.baseFee,
            gasPrice: state.baseFee.add(25_000_000_000),
            maxFeePerGas: state.baseFee.mul(2).add(1_500_000_000),
            maxPriorityFeePerGas: BigNumber.from(1_500_000_000),
          }
        : { gasPrice: BigNumber.from(state.fee) },
  } as unknown as JsonRpcProvider
  return { provider, state, trace, send, call, estimateGas }
}

function walletFixture() {
  const wallet = { account: WALLET, chainId: 137 }
  const sendTransaction = jest.fn(async (_request: unknown) => ({ hash: '0x' + '1'.repeat(64) }))
  const signer = {
    getAddress: async () => wallet.account,
    getChainId: async () => wallet.chainId,
    sendTransaction,
  } as unknown as Signer
  return { wallet, signer, sendTransaction, getWallet: () => wallet }
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(loadVerifiedAbi as jest.Mock).mockReset()
})

it('validates addresses and recognizes the exact Nitro runtime', async () => {
  expect(parseContractAddress(NITRO_ADDRESS.toLowerCase())).toBe(NITRO_ADDRESS)
  expect(() => parseContractAddress('0x' + '0'.repeat(40))).toThrow()
  const { provider } = rpcFixture()
  const result = await inspectContract(provider, 137, NITRO_ADDRESS, WALLET)

  expect(result).toMatchObject({ owner: WALLET, name: 'NitroClash', abiSource: 'CoinCollect reference' })
  expect(result.nativeBalance.toString()).toBe('60')
  expect(result.choices[0].amount.toString()).toBe('60')
  expect(result.functions).toContainEqual({ signature: 'withdraw()', withdrawal: true, readOnly: false })
})

it('shows verified ABI and roles without granting generic withdrawal access', async () => {
  ;(loadVerifiedAbi as jest.Mock).mockResolvedValue(abi)
  const { provider, call, trace } = rpcFixture(CONTRACT, '0xff')
  const result = await inspectContract(provider, 137, CONTRACT, WALLET)

  expect(result.abiSource).toBe('Sourcify')
  expect(result.roles).toEqual([{ label: 'DEFAULT_ADMIN_ROLE', granted: true }])
  expect(result.choices).toEqual([])
  await expect(prepareWithdrawal(provider, 137, CONTRACT, WALLET)).rejects.toThrow('no reviewed withdrawal')
  expect(call.mock.calls.some(([request]) => request.from)).toBe(false)
  expect(trace).not.toHaveBeenCalled()
})

it('quotes Zidanogo for its owner while retaining the verified ABI for inspection', async () => {
  ;(loadVerifiedAbi as jest.Mock).mockResolvedValue(abi)
  const { provider, state, trace } = rpcFixture(ZIDANOGO_ADDRESS, ZIDANOGO_CODE)
  state.name = 'Zidanogo GentleMals'
  const inspection = await inspectContract(provider, 137, ZIDANOGO_ADDRESS, WALLET)
  expect(inspection).toMatchObject({
    name: 'Zidanogo GentleMals',
    owner: WALLET,
    abiSource: 'Sourcify',
    choices: [{ asset: 'native', symbol: 'POL', amount: BigNumber.from(60) }],
  })

  const quote = await prepareWithdrawal(provider, 137, ZIDANOGO_ADDRESS, WALLET)
  expect(quote).toMatchObject({ recipient: WALLET, signature: 'withdraw()', amount: BigNumber.from(60) })

  state.destination = OTHER
  await expect(prepareWithdrawal(provider, 137, ZIDANOGO_ADDRESS, WALLET)).rejects.toThrow('recipient and exact amount')
  state.owner = OTHER
  await expect(prepareWithdrawal(provider, 137, ZIDANOGO_ADDRESS, WALLET)).rejects.toThrow('current contract owner')
  expect(trace).toHaveBeenCalledTimes(2)
})

it('quotes the Gold NFT native withdrawal only for the current owner and exact transfer', async () => {
  const { provider, state, trace } = rpcFixture(GOLD_NFT_ADDRESS, GOLD_CODE)
  state.name = 'CoinCollect Gold NFT'
  expect(await inspectContract(provider, 137, GOLD_NFT_ADDRESS, WALLET)).toMatchObject({
    name: 'CoinCollect Gold NFT',
    owner: WALLET,
    abiSource: 'CoinCollect reference',
    choices: [{ asset: 'native', symbol: 'POL', amount: BigNumber.from(60) }],
  })
  expect(await inspectContract(provider, 137, GOLD_NFT_ADDRESS, OTHER)).toMatchObject({
    choices: [],
    withdrawalReason: 'Only the current contract owner can withdraw.',
  })

  const review = await prepareWithdrawal(provider, 137, GOLD_NFT_ADDRESS, WALLET)
  expect(review).toMatchObject({ recipient: WALLET, signature: 'withdraw()', amount: BigNumber.from(60) })
  expect(review.transaction.data).toBe(abi.encodeFunctionData('withdraw()'))

  const { signer, getWallet, sendTransaction } = walletFixture()
  state.destination = OTHER
  await expect(submitReviewedWithdrawal(provider, signer, review, getWallet)).rejects.toThrow(
    'recipient and exact amount',
  )
  expect(trace).toHaveBeenCalledTimes(2)
  expect(sendTransaction).not.toHaveBeenCalled()
})

it('supports a new deployment of the same NFT code with a different owner and metadata digest', async () => {
  const { provider, state, trace } = rpcFixture(CONTRACT, mockNftRuntime('6006', 'a1'))
  state.name = 'Other collection'
  state.owner = OTHER
  state.destination = OTHER

  expect((await inspectContract(provider, 137, CONTRACT, WALLET)).choices).toEqual([])
  expect(await inspectContract(provider, 137, CONTRACT, OTHER)).toMatchObject({
    name: 'Other collection',
    owner: OTHER,
    choices: [{ asset: 'native', amount: BigNumber.from(60) }],
  })
  await expect(prepareWithdrawal(provider, 137, CONTRACT, OTHER)).resolves.toMatchObject({ recipient: OTHER })
  expect(trace).toHaveBeenCalledTimes(1)
})

it.each([
  ['executable byte', mockNftRuntime('6007', '06')],
  ['compiler version', GOLD_CODE.replace(/08070033$/, '08080033')],
  ['trailer length', GOLD_CODE.replace(/0033$/, '0034')],
])('keeps a changed %s read-only even when the ABI lists withdraw()', async (_, code) => {
  ;(loadVerifiedAbi as jest.Mock).mockResolvedValue(abi)
  const { provider, trace } = rpcFixture(GOLD_NFT_ADDRESS, code)
  expect((await inspectContract(provider, 137, GOLD_NFT_ADDRESS, WALLET)).choices).toEqual([])
  await expect(prepareWithdrawal(provider, 137, GOLD_NFT_ADDRESS, WALLET)).rejects.toThrow('no reviewed withdrawal')
  expect(trace).not.toHaveBeenCalled()
})

it('fails before simulation for a changed chain, changed runtime or wrong owner', async () => {
  const { provider, trace, state } = rpcFixture()
  state.chain = '0x1'
  await expect(prepareWithdrawal(provider, 137, NITRO_ADDRESS, WALLET)).rejects.toThrow('network changed')
  state.chain = '0x89'
  state.code = '0xff'
  await expect(prepareWithdrawal(provider, 137, NITRO_ADDRESS, WALLET)).rejects.toThrow('no reviewed withdrawal')
  state.code = NITRO_CODE
  state.owner = OTHER
  await expect(prepareWithdrawal(provider, 137, NITRO_ADDRESS, WALLET)).rejects.toThrow('current contract owner')
  expect(trace).not.toHaveBeenCalled()
})

it('requires Nitro trace proof of the exact transfer before quoting a fee', async () => {
  const { provider, state, call, estimateGas } = rpcFixture()
  state.destination = OTHER
  await expect(prepareWithdrawal(provider, 137, NITRO_ADDRESS, WALLET)).rejects.toThrow('recipient and exact amount')
  expect(estimateGas).not.toHaveBeenCalled()
  state.destination = WALLET
  const review = await prepareWithdrawal(provider, 137, NITRO_ADDRESS, WALLET)
  expect(review.recipient).toBe(WALLET)
  expect(review.amount.toString()).toBe('60')
  expect(review.estimatedFee.toString()).toBe('75000')
  expect(call).toHaveBeenCalledWith(
    expect.objectContaining({ from: WALLET, data: abi.getSighash('withdraw()') }),
    9_000,
  )
})

it('uses reviewed withdrawFunds and overloaded PaymentSplitter arguments only', async () => {
  const receipts = rpcFixture(CONTRACT, '0x02')
  const owner = await prepareWithdrawal(receipts.provider, 137, CONTRACT, WALLET)
  expect(owner.transaction.data).toBe(abi.encodeFunctionData('withdrawFunds'))
  const splitter = rpcFixture(CONTRACT, '0x03')
  const native = await prepareWithdrawal(splitter.provider, 137, CONTRACT, WALLET)
  const token = await prepareWithdrawal(splitter.provider, 137, CONTRACT, WALLET, WPOL_ADDRESS)
  expect(native.amount.toString()).toBe('10')
  expect(token.amount.toString()).toBe('7')
  expect(native.transaction.data).toBe(abi.encodeFunctionData('release(address)', [WALLET]))
  expect(token.transaction.data).toBe(abi.encodeFunctionData('release(address,address)', [WPOL_ADDRESS, WALLET]))
  splitter.state.shares = 0
  await expect(prepareWithdrawal(splitter.provider, 137, CONTRACT, WALLET)).rejects.toThrow('no payment share')
})

it.each([
  ['amount', 'The amount available to withdraw changed.'],
  ['fee', 'The network fee is above the maximum you reviewed.'],
  ['wallet', 'The wallet changed.'],
] as const)('does not send when the reviewed %s changes beyond its limit', async (field, message) => {
  const { provider, state } = rpcFixture()
  const { signer, wallet, getWallet, sendTransaction } = walletFixture()
  const review = await prepareWithdrawal(provider, 137, NITRO_ADDRESS, WALLET)
  if (field === 'amount') state.amount = BigNumber.from(90)
  if (field === 'fee') state.fee = 4
  if (field === 'wallet') wallet.account = OTHER

  await expect(submitReviewedWithdrawal(provider, signer, review, getWallet)).rejects.toThrow(message)
  expect(sendTransaction).not.toHaveBeenCalled()
})

it('uses the fresh legacy fee within the reviewed maximum', async () => {
  const { provider, state, trace } = rpcFixture(ZIDANOGO_ADDRESS, ZIDANOGO_CODE)
  const { signer, getWallet, sendTransaction } = walletFixture()
  state.fee = 100
  state.walletBalance = BigNumber.from(4_000_000)
  const review = await prepareWithdrawal(provider, 137, ZIDANOGO_ADDRESS, WALLET)
  expect(review.feeLimit).toEqual(BigNumber.from(3_600_000))

  state.fee = 120
  await submitReviewedWithdrawal(provider, signer, review, getWallet)

  expect(trace).toHaveBeenCalledTimes(2)
  expect(sendTransaction).toHaveBeenCalledTimes(1)
  expect(sendTransaction).toHaveBeenCalledWith(
    expect.objectContaining({
      to: ZIDANOGO_ADDRESS,
      gasPrice: BigNumber.from(120),
      gasLimit: BigNumber.from(30_000),
    }),
  )
})

it('reviews and passes the fresh Polygon priority fee to the signer', async () => {
  const { provider, state, send } = rpcFixture(ZIDANOGO_ADDRESS, ZIDANOGO_CODE)
  const { signer, getWallet, sendTransaction } = walletFixture()
  state.usesEip1559 = true
  state.polygonTip = BigNumber.from(30_000_000_000)
  state.walletBalance = BigNumber.from('1000000000000000000')

  const review = await prepareWithdrawal(provider, 137, ZIDANOGO_ADDRESS, WALLET)
  expect(review.transaction.maxPriorityFeePerGas).toEqual(state.polygonTip)
  expect(review.transactionFeeLimit).toEqual(BigNumber.from(30_000).mul(530_000_000_000))
  expect(review.estimatedFee).toEqual(BigNumber.from(25_000).mul(280_000_000_000))

  state.baseFee = BigNumber.from(260_000_000_000)
  state.polygonTip = BigNumber.from(32_000_000_000)
  await submitReviewedWithdrawal(provider, signer, review, getWallet)

  expect(send.mock.calls.filter(([method]) => method === 'eth_maxPriorityFeePerGas')).toHaveLength(2)
  expect(sendTransaction).toHaveBeenCalledWith(
    expect.objectContaining({
      to: ZIDANOGO_ADDRESS,
      maxPriorityFeePerGas: state.polygonTip,
      maxFeePerGas: BigNumber.from(552_000_000_000),
    }),
  )
})

it.each([undefined, 1_500_000_000])('uses the Polygon fee floor for RPC tip %s', async (tip) => {
  const { provider, state } = rpcFixture()
  state.usesEip1559 = true
  state.polygonTip = tip === undefined ? undefined : BigNumber.from(tip)
  state.walletBalance = BigNumber.from('1000000000000000000')
  const review = await prepareWithdrawal(provider, 137, NITRO_ADDRESS, WALLET)
  expect(review.transaction.maxPriorityFeePerGas).toEqual(BigNumber.from(25_000_000_000))
})

it('caps the displayed maximum at the wallet balance and rechecks gas affordability', async () => {
  const { provider, state } = rpcFixture()
  const { signer, getWallet, sendTransaction } = walletFixture()
  state.walletBalance = BigNumber.from(100_000)
  const review = await prepareWithdrawal(provider, 137, NITRO_ADDRESS, WALLET)
  expect(review.feeLimit).toEqual(state.walletBalance)

  state.walletBalance = BigNumber.from(89_999)
  await expect(submitReviewedWithdrawal(provider, signer, review, getWallet)).rejects.toThrow('enough POL')
  expect(sendTransaction).not.toHaveBeenCalled()
})

it('passes only fresh simulated zero-value calldata to the connected signer', async () => {
  const { provider, trace } = rpcFixture()
  const { signer, getWallet, sendTransaction } = walletFixture()
  const review = await prepareWithdrawal(provider, 137, NITRO_ADDRESS, WALLET)
  expect(sendTransaction).not.toHaveBeenCalled()
  await submitReviewedWithdrawal(provider, signer, review, getWallet)

  expect(trace).toHaveBeenCalledTimes(2)
  expect(sendTransaction).toHaveBeenCalledTimes(1)
  expect(sendTransaction).toHaveBeenCalledWith(
    expect.objectContaining({
      to: NITRO_ADDRESS,
      value: BigNumber.from(0),
      data: abi.encodeFunctionData('withdraw()'),
      chainId: 137,
    }),
  )
  expect(sendTransaction.mock.calls[0][0]).not.toHaveProperty('from')
})

it('does not ask the signer to submit an expired preview', async () => {
  const { provider } = rpcFixture()
  const { signer, getWallet, sendTransaction } = walletFixture()
  const review = await prepareWithdrawal(provider, 137, NITRO_ADDRESS, WALLET)
  await expect(submitReviewedWithdrawal(provider, signer, { ...review, expiresAt: 0 }, getWallet)).rejects.toThrow(
    'expired',
  )
  expect(sendTransaction).not.toHaveBeenCalled()
})

it('recognizes an injected wallet rejection without exposing the provider error', () => {
  expect(explainWithdrawalError({ cause: { code: 4001 } })).toBe('You declined the transaction in your wallet.')
})
