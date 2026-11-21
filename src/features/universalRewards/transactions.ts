import {
  encodeFunctionData,
  isAddressEqual,
  keccak256,
  parseEventLogs,
  toFunctionSelector,
  type Address,
  type Hex,
  type WalletClient,
} from 'viem'
import { getCode } from 'viem/actions'
import { universalRewardsAbi, universalRewardsV33Abi } from './abi'
import { erc20Abi, type NftRef } from './reader'
import { validateV3Deployment, type V3Client, type V3Deployment } from './runtime'

const expiredClaimError = toFunctionSelector('ClaimPeriodEnded()')
const openClaimError = toFunctionSelector('ClaimPeriodOpen()')
const positionBatchSelectors = ['claimBatch', 'exitBatch'].map((name) =>
  toFunctionSelector(`${name}(uint256,(uint256,address,uint256)[])`),
)

export interface V3Call {
  to: Address
  data: Hex
  value?: bigint
}

export function withV3GasHeadroom(estimate: bigint) {
  // The mined block can settle another interval between estimation and inclusion.
  return estimate + estimate / BigInt(5) + BigInt(25_000)
}

async function assertWallet(wallet: WalletClient, account: Address, deployment: V3Deployment) {
  const [chainId, addresses] = await Promise.all([wallet.getChainId(), wallet.getAddresses()])
  if (chainId !== deployment.chainId) throw new Error('Switch your wallet to the V3 settlement network.')
  if (!addresses[0] || !isAddressEqual(addresses[0], account)) {
    throw new Error('The wallet account changed. Verify your selection again.')
  }
}

export async function sendV3Call(
  client: V3Client,
  deployment: V3Deployment,
  wallet: WalletClient,
  account: Address,
  call: V3Call,
) {
  await Promise.all([validateV3Deployment(client, deployment), assertWallet(wallet, account, deployment)])
  await client.call({ account, ...call })
  const gas = withV3GasHeadroom(await client.estimateGas({ account, ...call }))
  const [balance, gasPrice] = await Promise.all([client.getBalance({ address: account }), client.getGasPrice()])
  if (balance < (call.value ?? BigInt(0)) + gas * gasPrice) {
    throw new Error('Your settlement wallet needs enough POL to cover this transaction.')
  }
  await assertWallet(wallet, account, deployment)
  if (deployment.chainId === 31337 && positionBatchSelectors.some((selector) => call.data.startsWith(selector))) {
    // Local previews can share a chain ID and contract address while pointing at different ledgers.
    const walletCode = await getCode(wallet, { address: deployment.address })
    if (!walletCode || keccak256(walletCode).toLowerCase() !== deployment.runtimeHash.toLowerCase()) {
      throw new Error('Your wallet is connected to a different local RPC. Select the RPC for this preview.')
    }
  }
  return wallet.sendTransaction({ account, chain: wallet.chain ?? null, ...call, gas })
}

export async function readV3Receipt(client: V3Client, hash: Hex) {
  let replaced = false
  const receipt = await client.waitForTransactionReceipt({
    hash,
    confirmations: 1,
    timeout: 45_000,
    onReplaced: ({ reason }) => {
      replaced = reason !== 'repriced'
    },
  })
  if (replaced) throw new V3TransactionRejected('The wallet replaced or cancelled this transaction.')
  if (receipt.status !== 'success')
    throw new V3TransactionRejected('The transaction reverted on the settlement network.')
  return receipt
}

export class V3TransactionRejected extends Error {}

export function createdV3PoolId(receipt: Awaited<ReturnType<typeof readV3Receipt>>, target: Address) {
  const logs = receipt.logs.filter((log) => isAddressEqual(log.address, target))
  const [created] = parseEventLogs({ abi: universalRewardsAbi, logs, eventName: 'PoolCreated' })
  if (!created) throw new Error('Pool creation receipt could not be verified.')
  return created.args.poolId
}

export function joinV3(deployment: V3Deployment, poolId: bigint, refs: readonly NftRef[]): V3Call {
  return {
    to: deployment.address,
    data: encodeFunctionData({ abi: universalRewardsAbi, functionName: 'joinBatch', args: [poolId, refs] }),
  }
}

export function manageV3Position(
  deployment: V3Deployment,
  poolId: bigint,
  ref: NftRef,
  action: 'claim' | 'exit' | 'leave',
  rewardToken?: Address,
): V3Call {
  const args = [poolId, ref.sourceChainId, ref.collection, ref.tokenId] as const
  return {
    to: deployment.address,
    data: rewardToken
      ? encodeFunctionData({ abi: universalRewardsAbi, functionName: 'claimReward', args: [...args, rewardToken] })
      : encodeFunctionData({ abi: universalRewardsAbi, functionName: action, args }),
  }
}

export function manageV3Positions(
  deployment: V3Deployment,
  poolId: bigint,
  refs: readonly NftRef[],
  action: 'claimBatch' | 'exitBatch',
): V3Call {
  return {
    to: deployment.address,
    data: encodeFunctionData({ abi: universalRewardsV33Abi, functionName: action, args: [poolId, refs] }),
  }
}

export function reconcileV3Position(deployment: V3Deployment, poolId: bigint, key: Hex): V3Call {
  return {
    to: deployment.address,
    data: encodeFunctionData({ abi: universalRewardsAbi, functionName: 'reconcile', args: [poolId, [key]] }),
  }
}

export function approveV3Funding(deployment: V3Deployment, token: Address, amount: bigint): V3Call {
  return {
    to: token,
    data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [deployment.address, amount] }),
  }
}

export function recoverV3ExpiredRewards(deployment: V3Deployment, poolId: bigint, token: Address): V3Call {
  return {
    to: deployment.address,
    data: encodeFunctionData({
      abi: universalRewardsAbi,
      functionName: 'recoverExpiredRewards',
      args: [poolId, token],
    }),
  }
}

export function describeV3Error(error: unknown): string {
  if (typeof error !== 'object' || error === null) return 'The V3 request failed.'
  const message =
    'shortMessage' in error && typeof error.shortMessage === 'string'
      ? error.shortMessage
      : error instanceof Error
      ? error.message
      : 'The V3 request failed.'
  if (/\b(?:0xe450d38c|ERC20InsufficientBalance)\b/i.test(message)) {
    return 'Your wallet does not have enough of the selected token. Check the balance before trying again.'
  }
  if (message.includes('ClaimPeriodEnded') || message.includes(expiredClaimError)) return 'Claim period ended.'
  if (message.includes('ClaimPeriodOpen') || message.includes(openClaimError))
    return 'Treasury recovery opens when the claim period ends.'
  return message
}
