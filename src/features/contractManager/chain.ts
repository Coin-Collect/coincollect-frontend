import { Interface, FormatTypes } from '@ethersproject/abi'
import { getAddress } from '@ethersproject/address'
import { BigNumber } from '@ethersproject/bignumber'
import type { JsonRpcProvider, TransactionRequest, TransactionResponse } from '@ethersproject/providers'
import type { Signer } from 'ethers'
import { keccak256, type Hex } from 'viem'
import { mainnetTokens } from 'config/constants/tokens'
import { isLocalForkMode } from 'config/localFork'
import { getCoinCollectAbi, getWithdrawalProfile, isReviewedPaymentToken, type WithdrawalProfile } from './profiles'
import { loadVerifiedAbi } from './verifiedAbi'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const TOKEN_ABI = new Interface([
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
])
const NATIVE = 'native' as const
const TRACKED_TOKENS = [mainnetTokens.collect, mainnetTokens.wmatic, mainnetTokens.usdc, mainnetTokens.usdt, mainnetTokens.nitro]
export const REVIEW_TTL_MS = 90_000

export type AssetBalance = {
  address: string
  symbol: string
  decimals?: number
  balance?: BigNumber
  source: 'tracked' | 'contract' | 'manual'
}

export type ContractInspection = {
  address: string
  chainId: number
  block: number
  name?: string
  nativeBalance: BigNumber
  tokens: AssetBalance[]
  owner?: string
  roles: { label: string; granted?: boolean }[]
  functions: { signature: string; readOnly: boolean; withdrawal: boolean }[]
  abiSource?: 'Reviewed runtime' | 'Sourcify' | 'CoinCollect reference'
  withdrawalProfile?: string
  withdrawalReason?: string
  choices: { asset: string; symbol: string; amount: BigNumber; decimals: number }[]
}

export type WithdrawalReview = {
  contract: string
  chainId: number
  account: string
  asset: string
  recipient: string
  signature: string
  amount: BigNumber
  decimals: number
  symbol: string
  estimatedFee: BigNumber
  feeLimit: BigNumber
  gasLimit: BigNumber
  transaction: TransactionRequest
  expiresAt: number
}

export function parseContractAddress(input: string): string {
  const address = getAddress(input.trim())
  if (address === ZERO_ADDRESS) throw new Error('Enter a valid contract address.')
  return address
}

async function assertChain(provider: JsonRpcProvider, expected: number) {
  const actual = await provider.send('eth_chainId', [])
  if (typeof actual !== 'string' || Number(actual) !== expected) throw new Error('The network changed. Check the connected network and try again.')
}

async function readView<T>(
  provider: JsonRpcProvider, target: string, abi: Interface, signature: string, args: unknown[], block: number,
): Promise<T> {
  const fn = abi.getFunction(signature)
  if (!['view', 'pure'].includes(fn.stateMutability)) throw new Error('This function cannot be read safely.')
  const result = await provider.call({ to: target, data: abi.encodeFunctionData(fn, args) }, block)
  return abi.decodeFunctionResult(fn, result)[0] as T
}

async function optional<T>(operation: () => Promise<T>): Promise<T | undefined> {
  try { return await operation() } catch { return undefined }
}

function readAddress(value?: string): string | undefined {
  if (!value) return undefined
  try { return parseContractAddress(value) } catch { return undefined }
}

function finiteDecimals(value: number | BigNumber | undefined): number | undefined {
  if (value == null) return undefined
  const decimals = Number(value.toString())
  return Number.isInteger(decimals) && decimals >= 0 && decimals <= 255 ? decimals : undefined
}

function sameAddress(left?: string, right?: string): boolean {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase())
}

async function readAuthority(provider: JsonRpcProvider, address: string, abi: Interface, block: number, account?: string) {
  const owner = readAddress(await optional(() => readView<string>(provider, address, abi, 'owner()', [], block)))
  if (!account) return { owner, roles: [] }
  const roleGetters = Object.values(abi.functions).filter((fn) =>
    /^[A-Z][A-Z0-9_]*_ROLE$/.test(fn.name) && fn.inputs.length === 0 && fn.outputs?.[0]?.type === 'bytes32',
  ).slice(0, 8)
  const roles = abi.functions['hasRole(bytes32,address)']
    ? await Promise.all(roleGetters.map(async (fn) => {
        const id = await optional(() => readView<string>(provider, address, abi, fn.format(), [], block))
        const granted = id ? await optional(() => readView<boolean>(provider, address, abi, 'hasRole(bytes32,address)', [id, account], block)) : undefined
        return { label: fn.name, granted }
      }))
    : []
  return { owner, roles }
}

async function readToken(
  provider: JsonRpcProvider, target: string, token: Omit<AssetBalance, 'balance' | 'decimals'> & { decimals?: number }, block: number,
): Promise<AssetBalance> {
  const [balance, decimals, symbol] = await Promise.all([
    optional(() => readView<BigNumber>(provider, token.address, TOKEN_ABI, 'balanceOf(address)', [target], block)),
    token.decimals === undefined ? optional(() => readView<number>(provider, token.address, TOKEN_ABI, 'decimals()', [], block)) : token.decimals,
    token.symbol || optional(() => readView<string>(provider, token.address, TOKEN_ABI, 'symbol()', [], block)),
  ])
  const precision = finiteDecimals(decimals)
  return { ...token, decimals: precision, symbol: typeof symbol === 'string' && symbol.trim() ? symbol.trim().slice(0, 16) : 'ERC-20', balance: precision !== undefined ? balance : undefined }
}

async function profileBalance(
  provider: JsonRpcProvider, profile: WithdrawalProfile, contract: string, asset: string, account: string, block: number,
): Promise<{ amount: BigNumber; signature: string; args: string[]; symbol: string; decimals: number }> {
  if (profile.id !== 'splitter') {
    if (asset !== NATIVE) throw new Error('This contract only supports native POL withdrawals.')
    const owner = await readView<string>(provider, contract, profile.abi, 'owner()', [], block)
    if (!sameAddress(owner, account)) throw new Error('Only the current contract owner can withdraw.')
    return { amount: await provider.getBalance(contract, block), signature: profile.signature, args: [], symbol: 'POL', decimals: 18 }
  }
  const shares = await readView<BigNumber>(provider, contract, profile.abi, 'shares(address)', [account], block)
  if (shares.isZero()) throw new Error('This wallet has no payment share in the contract.')
  if (asset === NATIVE) {
    const amount = await readView<BigNumber>(provider, contract, profile.abi, 'releasable(address)', [account], block)
    return { amount, signature: 'release(address)', args: [account], symbol: 'POL', decimals: 18 }
  }
  if (!isReviewedPaymentToken(asset, await provider.getCode(asset, block)))
    throw new Error('This token has no reviewed withdrawal support.')
  const args = [asset, account]
  const amount = await readView<BigNumber>(provider, contract, profile.abi, 'releasable(address,address)', args, block)
  return { amount, signature: 'release(address,address)', args, symbol: 'WPOL', decimals: 18 }
}

export async function inspectContract(
  provider: JsonRpcProvider,
  chainId: number,
  input: string,
  account?: string,
  manualTokens: string[] = [],
): Promise<ContractInspection> {
  const address = parseContractAddress(input)
  await assertChain(provider, chainId)
  const block = await provider.getBlockNumber()
  const [code, nativeBalance] = await Promise.all([provider.getCode(address, block), provider.getBalance(address, block)])
  if (code === '0x') throw new Error('No contract was found at this address on the selected network.')
  const profile = getWithdrawalProfile(address, keccak256(code as Hex))
  const verified = !profile && !isLocalForkMode ? await loadVerifiedAbi(chainId, address, code) : undefined
  const reference = !profile && !verified ? getCoinCollectAbi(address) : undefined
  const abi = profile?.abi || verified || reference
  const abiSource = profile ? 'Reviewed runtime' : verified ? 'Sourcify' : reference ? 'CoinCollect reference' : undefined
  const functions = abi ? Object.values(abi.functions).map((fn) => {
    const readOnly = ['pure', 'view'].includes(fn.stateMutability)
    return { signature: fn.format(FormatTypes.sighash), readOnly, withdrawal: !readOnly && /withdraw|release|recover|redeem/i.test(fn.name) }
  }).sort((left, right) => Number(right.withdrawal) - Number(left.withdrawal) || left.signature.localeCompare(right.signature)) : []

  const relatedGetters = ['rewardToken()', 'asset()', 'paymentToken()', 'currency()', 'token()']
  const [authority, name, related] = await Promise.all([
    abi ? readAuthority(provider, address, abi, block, account) : Promise.resolve({ roles: [], owner: undefined }),
    abi ? optional(() => readView<string>(provider, address, abi, 'name()', [], block)) : undefined,
    abi ? Promise.all(relatedGetters.map((signature) => optional(() => readView<string>(provider, address, abi, signature, [], block)))) : [],
  ])
  const tokenInputs = new Map<string, Parameters<typeof readToken>[2]>()
  TRACKED_TOKENS.forEach((token) => {
    tokenInputs.set(token.address.toLowerCase(), { address: token.address, symbol: token.symbol || 'ERC-20', decimals: token.decimals, source: 'tracked' })
  })
  const add = (token: string | undefined, source: 'contract' | 'manual') => {
    const normalized = readAddress(token)
    if (!normalized) return
    const key = normalized.toLowerCase()
    tokenInputs.set(key, { symbol: '', ...tokenInputs.get(key), address: normalized, source })
  }
  related.forEach((value) => add(value, 'contract'))
  manualTokens.slice(0, 5).forEach((value) => add(value, 'manual'))
  const tokens = await Promise.all(Array.from(tokenInputs.values(), (token) => readToken(provider, address, token, block)))

  const choices: ContractInspection['choices'] = []
  let withdrawalReason: string | undefined
  if (!profile) withdrawalReason = abi
    ? 'This contract has no reviewed withdrawal configuration. Function names alone do not identify a safe transfer.'
    : 'A verified ABI or reviewed runtime could not be found for this address.'
  else if (!account) withdrawalReason = 'Connect your wallet to check whether you can withdraw.'
  else {
    try {
      const native = await profileBalance(provider, profile, address, NATIVE, account, block)
      choices.push({ asset: NATIVE, amount: native.amount, decimals: native.decimals, symbol: native.symbol })
      if (profile.id === 'splitter') {
        const wpol = tokens.find((token) => token.symbol === 'WPOL' && token.balance?.gt(0))
        const release = wpol && await optional(() => profileBalance(provider, profile, address, wpol.address, account, block))
        if (wpol && release) choices.push({ asset: wpol.address, amount: release.amount, decimals: release.decimals, symbol: release.symbol })
      }
      if (!choices.some(({ amount }) => amount.gt(0))) withdrawalReason = 'This wallet has no funds available to withdraw.'
    } catch (error) {
      withdrawalReason = explainWithdrawalError(error)
    }
  }

  return { address, chainId, block, nativeBalance, tokens, name: profile?.name || (typeof name === 'string' ? name.slice(0, 96) : undefined),
    owner: authority.owner, roles: authority.roles, functions, abiSource, withdrawalProfile: profile?.name, withdrawalReason, choices }
}

export function explainWithdrawalError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if ((error as { code?: string })?.code === 'ACTION_REJECTED') return 'You declined the transaction in your wallet.'
  // Do not expose raw provider URLs, project keys or calldata embedded in errors.
  return [
    'Only the current contract owner can withdraw.', 'This wallet has no payment share in the contract.',
    'This token has no reviewed withdrawal support.', 'The network changed. Check the connected network and try again.',
    'No contract was found at this address on the selected network.', 'The wallet changed. Review the withdrawal again.',
    'Connect your wallet to the selected network first.', 'This contract has no reviewed withdrawal configuration.',
    'Withdrawals require a wallet that can receive funds directly.', 'There is no available balance for this withdrawal.',
    'The simulation could not verify the recipient and exact amount.', 'Your wallet does not have enough POL for the estimated gas.',
    'The balance, fee or wallet changed. Review the withdrawal again.', 'The withdrawal review expired. Review it again.',
    'The network did not provide a usable gas quote.', 'This contract only supports native POL withdrawals.',
  ].includes(message) ? message : 'The network could not complete this check. Try again shortly.'
}

type TraceCall = { from?: string; to?: string; type?: string; input?: string; value?: string; error?: string; calls?: TraceCall[] }

async function verifyNitroTransfer(provider: JsonRpcProvider, contract: string, account: string, data: string, block: number, amount: BigNumber) {
  const trace = await optional<TraceCall>(() => provider.send('debug_traceCall', [
    { from: account, to: contract, data, value: '0x0' }, '0x' + block.toString(16), { tracer: 'callTracer', timeout: '4s' },
  ]))
  const payment = trace?.calls?.[0]
  if (
    !trace || trace.error || !sameAddress(trace.from, account) || !sameAddress(trace.to, contract) ||
    trace.input?.toLowerCase() !== data.toLowerCase() || trace.calls?.length !== 1 ||
    !payment || payment.error || payment.type !== 'CALL' || !sameAddress(payment.from, contract) ||
    !sameAddress(payment.to, account) || payment.input !== '0x' || payment.calls?.length ||
    !payment.value || !BigNumber.from(payment.value).eq(amount)
  ) throw new Error('The simulation could not verify the recipient and exact amount.')
}

export async function prepareWithdrawal(
  provider: JsonRpcProvider, chainId: number, input: string, wallet: string, asset = NATIVE as string,
): Promise<WithdrawalReview> {
  const contract = parseContractAddress(input)
  const account = parseContractAddress(wallet)
  const selectedAsset = asset === NATIVE ? NATIVE : parseContractAddress(asset)
  await assertChain(provider, chainId)
  const block = await provider.getBlockNumber()
  const [code, receiverCode] = await Promise.all([provider.getCode(contract, block), provider.getCode(account, block)])
  const profile = getWithdrawalProfile(contract, keccak256(code as Hex))
  if (!profile) throw new Error('This contract has no reviewed withdrawal configuration.')
  if (receiverCode !== '0x' || sameAddress(account, contract))
    throw new Error('Withdrawals require a wallet that can receive funds directly.')
  const { amount, signature, args, symbol, decimals } = await profileBalance(provider, profile, contract, selectedAsset, account, block)
  if (amount.lte(0)) throw new Error('There is no available balance for this withdrawal.')
  const data = profile.abi.encodeFunctionData(signature, args)
  const request = { to: contract, from: account, data, value: BigNumber.from(0) }
  // Only reviewed, exact calldata is simulated. No arbitrary ABI write is attempted.
  await provider.call(request, block)
  if (profile.id === 'nitro') await verifyNitroTransfer(provider, contract, account, data, block, amount)
  const [estimate, feeData, walletBalance] = await Promise.all([
    provider.estimateGas(request), provider.getFeeData(), provider.getBalance(account),
  ])
  const maxFee = feeData.maxFeePerGas && feeData.maxPriorityFeePerGas ? feeData.maxFeePerGas : feeData.gasPrice
  if (!maxFee || maxFee.lte(0)) throw new Error('The network did not provide a usable gas quote.')
  const gasLimit = estimate.mul(120).add(99).div(100)
  const feeLimit = gasLimit.mul(maxFee)
  if (walletBalance.lt(feeLimit)) throw new Error('Your wallet does not have enough POL for the estimated gas.')
  const fee = feeData.maxFeePerGas && feeData.maxPriorityFeePerGas
    ? { maxFeePerGas: feeData.maxFeePerGas, maxPriorityFeePerGas: feeData.maxPriorityFeePerGas }
    : { gasPrice: maxFee }
  const typicalFee = feeData.gasPrice && feeData.gasPrice.lt(maxFee) ? feeData.gasPrice : maxFee
  return { contract, account, chainId, asset: selectedAsset, recipient: account, amount, signature, symbol, decimals,
    estimatedFee: estimate.mul(typicalFee), feeLimit, gasLimit, transaction: { ...request, ...fee, gasLimit, chainId },
    expiresAt: Date.now() + REVIEW_TTL_MS }
}

export type ConnectedWallet = { account?: string; chainId?: number }

export async function submitReviewedWithdrawal(
  provider: JsonRpcProvider, signer: Signer, review: WithdrawalReview, getWallet: () => ConnectedWallet,
): Promise<TransactionResponse> {
  const checkWallet = async () => {
    const current = getWallet()
    if (!sameAddress(current.account, review.account) || current.chainId !== review.chainId ||
        !sameAddress(await signer.getAddress(), review.account) || (await signer.getChainId()) !== review.chainId)
      throw new Error('The wallet changed. Review the withdrawal again.')
  }
  if (Date.now() >= review.expiresAt) throw new Error('The withdrawal review expired. Review it again.')
  await checkWallet()
  const fresh = await prepareWithdrawal(provider, review.chainId, review.contract, review.account, review.asset)
  if (!fresh.amount.eq(review.amount) || !sameAddress(fresh.recipient, review.recipient) ||
      fresh.transaction.data !== review.transaction.data || fresh.feeLimit.gt(review.feeLimit))
    throw new Error('The balance, fee or wallet changed. Review the withdrawal again.')
  if (Date.now() >= review.expiresAt) throw new Error('The withdrawal review expired. Review it again.')
  await checkWallet()
  const { from, ...transaction } = fresh.transaction
  return signer.sendTransaction(transaction)
}
