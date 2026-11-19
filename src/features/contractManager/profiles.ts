import { Interface } from '@ethersproject/abi'
import { keccak256, type Hex } from 'viem'
import coinCollectNftAbi from 'config/abi/coinCollectNft.json'
import nftFactoryAbi from 'config/abi/nftSmartChefFactory.json'
import legacyNftStakeAbi from 'config/abi/coinCollectNftStake.json'
import addresses from 'config/constants/contracts'

export const NITRO_ADDRESS = addresses.nitroNft[137]
export const ZIDANOGO_ADDRESS = addresses.zidanogoNft[137]
export const WPOL_ADDRESS = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
export const NITRO_RUNTIME = '0xe7953ee386dea09f17c1019d35e7bb3a24eb022a0735bc08b20a951f966c9511'
const ZIDANOGO_RUNTIME = '0xff65802850837c5f1cbb6336404ba0d6fe680c5ee274e18302b4b3a39ce1f4e0'
export const RECEIPTS_RUNTIME = '0xeeb80f16c3b42688be43d06d4abb6f23b2dffc2365357aba55135adbcf85f9ca'
const WPOL_RUNTIME = '0xae820ea59b005f58a45eea35b374afbd5dc503d4f219a6b670cd3453f1142ed5'

// Standalone OpenZeppelin PaymentSplitter v4.9.6, solc 0.8.30, metadata.bytecodeHash none.
// The runtime is independent of the constructor's payee and share configuration.
const SPLITTER_RUNTIMES = [
  '0xca5c90ffe1d24c1d7fc301b0afb9c9fa92fc94af2fb68c14a7713ee728d38f76',
  '0xa6bbe9845f7240c0e9db494a5f7034153f044bc48bc4b19b3f6d5727b3dfd0fe',
  '0x3a489735832b1a8747ba29d7df9c5b06d1441aef66c5314457a6bc946b00c00e',
  '0x3d772892dc61caaf078278ab3fb7037c1b2276a4786f9f1865e2d4c003fbd5ed',
]

const nft = new Interface(coinCollectNftAbi)
const zidanogo = new Interface(['function owner() view returns (address)', 'function withdraw()'])
const receipts = new Interface(['function owner() view returns (address)', 'function withdrawFunds()'])
const splitter = new Interface([
  'function shares(address account) view returns (uint256)',
  'function totalShares() view returns (uint256)',
  'function payee(uint256 index) view returns (address)',
  'function totalReleased() view returns (uint256)',
  'function totalReleased(address token) view returns (uint256)',
  'function released(address account) view returns (uint256)',
  'function released(address token, address account) view returns (uint256)',
  'function releasable(address account) view returns (uint256)',
  'function releasable(address token, address account) view returns (uint256)',
  'function release(address payable account)',
  'function release(address token, address account)',
])

export type WithdrawalProfile =
  | {
      id: 'nitro' | 'zidanogo' | 'receipts'
      name: string
      abi: Interface
      signature: 'withdraw()' | 'withdrawFunds()'
      requiresNativeTransferTrace?: true
    }
  | { id: 'splitter'; name: string; abi: Interface }

export function getWithdrawalProfile(address: string, runtimeHash: string): WithdrawalProfile | undefined {
  if (address.toLowerCase() === NITRO_ADDRESS.toLowerCase() && runtimeHash === NITRO_RUNTIME) {
    return { id: 'nitro', name: 'NitroClash', abi: nft, signature: 'withdraw()', requiresNativeTransferTrace: true }
  }
  // Sourcify exact match: ZIDANOGO.withdraw is onlyOwner and sends the entire native balance to msg.sender.
  if (address.toLowerCase() === ZIDANOGO_ADDRESS.toLowerCase() && runtimeHash === ZIDANOGO_RUNTIME) {
    return {
      id: 'zidanogo',
      name: 'Zidanogo GentleMals',
      abi: zidanogo,
      signature: 'withdraw()',
      requiresNativeTransferTrace: true,
    }
  }
  if (runtimeHash === RECEIPTS_RUNTIME) {
    return { id: 'receipts', name: 'Ownable Receipts', abi: receipts, signature: 'withdrawFunds()' }
  }
  if (SPLITTER_RUNTIMES.includes(runtimeHash)) {
    return { id: 'splitter', name: 'OpenZeppelin PaymentSplitter', abi: splitter }
  }
  return undefined
}

export function isReviewedPaymentToken(address: string, code: string): boolean {
  return address.toLowerCase() === WPOL_ADDRESS.toLowerCase() && keccak256(code as Hex) === WPOL_RUNTIME
}

export function getCoinCollectAbi(address: string): Interface | undefined {
  const key = address.toLowerCase()
  if (key === addresses.nftSmartChefFactory[137].toLowerCase()) return new Interface(nftFactoryAbi)
  if (key === addresses.coinCollectNftStake[137].toLowerCase()) return new Interface(legacyNftStakeAbi)
  const nftAddresses = [
    addresses.coinCollectNft,
    addresses.coinCollectBronzeNft,
    addresses.coinCollectSilverNft,
    addresses.coinCollectGoldNft,
    addresses.lotNft,
    addresses.blitzBrawlerNft,
    addresses.avatarsAiNft,
    addresses.beastHunterNft,
    addresses.nitroNft,
    addresses.placeDjNft,
    addresses.zidanogoNft,
    addresses.sapienXNft,
  ]
  return nftAddresses.some((entry) => entry[137]?.toLowerCase() === key) ? nft : undefined
}
