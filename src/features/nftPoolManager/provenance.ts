import { Interface } from '@ethersproject/abi'
import { BigNumber } from '@ethersproject/bignumber'
import type { Provider } from '@ethersproject/providers'
import factoryAbi from 'config/abi/nftSmartChefFactory.json'
import { normalizeNftAddress } from './registry'
import { NftDeploymentDecodedInputs, NftPoolDeploymentProvenance } from './types'

const factoryInterface = new Interface(factoryAbi as any)

function address(value: any): string | undefined {
  return normalizeNftAddress(value?.toString?.() || value) || undefined
}

function number(value: any): number | undefined {
  const result = Number(value?.toString?.() || value)
  return Number.isSafeInteger(result) ? result : undefined
}

function bigNumber(value: any): BigNumber | undefined {
  try {
    return BigNumber.from(value)
  } catch {
    return undefined
  }
}

export function decodeDeployPoolData(data: string, factoryAddress?: string): NftDeploymentDecodedInputs {
  const parsed = factoryInterface.parseTransaction({ data })
  if (!parsed || parsed.name !== 'deployPool') throw new Error('Transaction does not call deployPool.')
  const args: any = parsed.args
  const config = args._configExtra || args[9]
  const decoded: NftDeploymentDecodedInputs = {
    stakedTokenAddress: address(args._stakedToken || args[0]) || '',
    rewardTokenAddress: address(args._rewardToken || args[1]) || '',
    sideRewardTokens: (args._sideRewardTokens || args[2] || []).map((item: any) => address(item) || ''),
    sideRewardPercentages: (args._sideRewardPercentage || args[3] || []).map((item: any) => BigNumber.from(item)),
    rewardPerBlock: bigNumber(args._rewardPerBlock || args[4]) as BigNumber,
    startBlock: number(args._startBlock || args[5]) as number,
    endBlock: number(args._bonusEndBlock || args[6]) as number,
    poolLimitPerUser: bigNumber(args._poolLimitPerUser || args[7]) as BigNumber,
    numberBlocksForUserLimit: number(args._numberBlocksForUserLimit || args[8]) as number,
    initialPoolCapacity: bigNumber(config?.poolCapacity || config?.[0]) as BigNumber,
    participantThreshold: bigNumber(config?.participantThreshold || config?.[1]) as BigNumber,
    admin: address(args._admin || args[10]) || '',
  }
  if (
    !decoded.stakedTokenAddress ||
    !decoded.rewardTokenAddress ||
    decoded.sideRewardTokens.some((item) => !item) ||
    !decoded.rewardPerBlock ||
    decoded.startBlock === undefined ||
    decoded.endBlock === undefined ||
    !decoded.poolLimitPerUser ||
    decoded.numberBlocksForUserLimit === undefined ||
    !decoded.initialPoolCapacity ||
    !decoded.participantThreshold ||
    !decoded.admin
  ) {
    throw new Error('deployPool calldata is missing a required input.')
  }
  if (factoryAddress && parsed) return decoded
  return decoded
}

export async function readDeploymentProvenance(
  provider: Provider,
  factoryAddress: string | undefined,
  transactionHash: string | undefined,
  blockNumber?: number,
): Promise<NftPoolDeploymentProvenance> {
  const base: NftPoolDeploymentProvenance = {
    factoryAddress,
    transactionHash,
    blockNumber,
    decodeStatus: transactionHash ? 'unavailable' : 'not-applicable',
  }
  if (!transactionHash) return base
  try {
    const transaction = await provider.getTransaction(transactionHash)
    if (!transaction) return { ...base, error: 'Deployment transaction is not available from the connected RPC.' }
    if (factoryAddress && transaction.to && transaction.to.toLowerCase() !== factoryAddress.toLowerCase())
      return { ...base, decodeStatus: 'malformed', error: 'Deployment transaction target is not the NFT factory.' }
    return { ...base, decodedInputs: decodeDeployPoolData(transaction.data, factoryAddress), decodeStatus: 'decoded' }
  } catch (error) {
    return {
      ...base,
      decodeStatus: 'malformed',
      error: error instanceof Error ? error.message : 'Deployment calldata could not be decoded.',
    }
  }
}
