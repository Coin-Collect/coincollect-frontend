import { Interface } from '@ethersproject/abi'
import { keccak256, type Hex } from 'viem'
import coinCollectNftAbi from 'config/abi/coinCollectNft.json'
import nftFactoryAbi from 'config/abi/nftSmartChefFactory.json'
import legacyNftStakeAbi from 'config/abi/coinCollectNftStake.json'
import addresses from 'config/constants/contracts'

export const NITRO_ADDRESS = addresses.nitroNft[137]
export const WPOL_ADDRESS = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
const RECEIPTS_RUNTIME = '0xeeb80f16c3b42688be43d06d4abb6f23b2dffc2365357aba55135adbcf85f9ca'
const WPOL_RUNTIME = '0xae820ea59b005f58a45eea35b374afbd5dc503d4f219a6b670cd3453f1142ed5'

// For these Solidity builds, preserve the executable bytes, compiler version and trailer layout.
// Only mask the 32-byte IPFS digest in the fixed metadata footer after the INVALID separator.
const SOLIDITY_IPFS_FOOTER = /(fea2646970667358221220)[0-9a-f]{64}(64736f6c6343[0-9a-f]{6}0033)$/
const NFT_OWNER_WITHDRAWAL_RUNTIMES = [
  '0x14cb2a70cc2ad2a9b8e36c23cabf7b1fb4cadb6fdae08be4d6365cc2441ddca6', // CoinCollect Starter
  '0xce8bc3efcd915566bbbd1a3813d512ef276ea1f70e51385a9d959d55b97a39b1', // Bronze, Silver, Gold
  '0xc4a406bb70dfbb4a8130f0af1ba7e2c1862a97a173f770bf82d7eeab25bf7b21', // LotShare, PlaceDJ
  '0x86048a576ede6f69d4bbc9d35b076a3a476f8103b9ed860b32c27682c156c146', // NitroClash, BlitzBrawler
  '0x45b00ca0ad0524a05b0575625cc47a01e9e4eeb807e4c707353156712710dbff', // AvatarsAI, BeastHunter
  '0x8571bcd0c95a70663ea9b8f4d6f07d24d5e2f28dafb84608fb7fd4f4d13bbb32', // SapienX
  '0x61b8a9ef1ecad85a496e28768faa5c16817eff3f703aeb38e4e09e446e670fed', // Zidanogo
]

// Standalone OpenZeppelin PaymentSplitter v4.9.6, solc 0.8.30, metadata.bytecodeHash none.
// The runtime is independent of the constructor's payee and share configuration.
const SPLITTER_RUNTIMES = [
  '0xca5c90ffe1d24c1d7fc301b0afb9c9fa92fc94af2fb68c14a7713ee728d38f76',
  '0xa6bbe9845f7240c0e9db494a5f7034153f044bc48bc4b19b3f6d5727b3dfd0fe',
  '0x3a489735832b1a8747ba29d7df9c5b06d1441aef66c5314457a6bc946b00c00e',
  '0x3d772892dc61caaf078278ab3fb7037c1b2276a4786f9f1865e2d4c003fbd5ed',
]

const nft = new Interface(coinCollectNftAbi)
const nftWithdrawal = new Interface([
  'function name() view returns (string)',
  'function owner() view returns (address)',
  'function withdraw()',
])
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
      id: 'nft' | 'receipts'
      name: string
      abi: Interface
      signature: 'withdraw()' | 'withdrawFunds()'
      requiresNativeTransferTrace?: true
    }
  | { id: 'splitter'; name: string; abi: Interface }

export function getWithdrawalProfile(code: string): WithdrawalProfile | undefined {
  const normalized = code.replace(SOLIDITY_IPFS_FOOTER, '$1' + '0'.repeat(64) + '$2')
  const runtimeHash = keccak256(code as Hex)
  const normalizedHash = normalized === code ? runtimeHash : keccak256(normalized as Hex)
  if (NFT_OWNER_WITHDRAWAL_RUNTIMES.includes(normalizedHash)) {
    return {
      id: 'nft',
      name: 'NFT owner withdrawal',
      abi: nftWithdrawal,
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
