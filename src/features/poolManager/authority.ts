import { Contract } from '@ethersproject/contracts'
import type { Provider } from '@ethersproject/providers'
import { getSmartChefFactoryAddress } from 'utils/addressHelpers'
import factoryAbi from 'config/abi/smartChefFactoryV2.json'
import { PoolManagerAuthority } from './types'

const CONTRACT_CODE_PREFIX = '0x'

export function classifyFactoryAuthority(ownerAddress: string, ownerCode: string, account?: string | null) {
  const ownerIsContract = Boolean(ownerCode && ownerCode !== CONTRACT_CODE_PREFIX && ownerCode !== '0x0')
  const authorized = Boolean(account && account.toLowerCase() === ownerAddress.toLowerCase()) && !ownerIsContract
  return {
    ownerIsContract,
    authorized,
    state: ownerIsContract
      ? 'CONTRACT_OWNER'
      : authorized
      ? 'AUTHORIZED'
      : account
      ? 'WRONG_ACCOUNT'
      : 'WALLET_REQUIRED',
  } as const
}

/**
 * Reads factory ownership only. This is deliberately not a frontend security
 * boundary: the factory's onlyOwner modifier remains the source of truth.
 */
export async function getFactoryAuthority(
  provider: Provider,
  account?: string | null,
  chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 137,
): Promise<PoolManagerAuthority> {
  const factoryAddress = getSmartChefFactoryAddress(chainId)

  if (!factoryAddress) {
    return {
      factoryAddress: null,
      account,
      ownerIsContract: false,
      authorized: false,
      state: 'UNAVAILABLE',
      error: `No SmartChefFactory is configured for chain ${chainId}.`,
    }
  }

  try {
    const factory = new Contract(factoryAddress, factoryAbi, provider)
    const ownerAddress = await factory.owner()
    const code = await provider.getCode(ownerAddress)
    const { ownerIsContract, authorized, state } = classifyFactoryAuthority(ownerAddress, code, account)

    return {
      factoryAddress,
      ownerAddress,
      account,
      ownerIsContract,
      authorized,
      state,
      error: ownerIsContract
        ? 'Factory is contract-owned. A browser wallet cannot satisfy this authority check.'
        : undefined,
    }
  } catch (error) {
    return {
      factoryAddress,
      account,
      ownerIsContract: false,
      authorized: false,
      state: 'UNAVAILABLE',
      error: error instanceof Error ? error.message : 'Factory ownership could not be read.',
    }
  }
}
