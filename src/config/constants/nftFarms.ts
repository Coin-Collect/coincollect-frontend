import { serializeTokens } from './tokens'
import { SerializedNftFarmConfig } from './types'
import { CHAIN_ID } from './networks'
import { ChainId } from '@coincollect/sdk'

const serializedTokens = serializeTokens()

const nftFarms: SerializedNftFarmConfig[] = [
  {
    pid: 1,
    lpSymbol: 'Starter NFT',
    lpAddresses: {
      137: '0x846B6a90065e115bbD792e930Fd688935ea0Bbbf',
      80001: '0xde4FB00ba4f31213017362865db8251fECAc6AB8' // CHANGE_ADDRESS:ERC20PegForNFT
    },
    nftAddresses: {
      137: '0x569B70fc565AFba702d9e77e75FD3e3c78F57eeD',
      80001: '0x11DdF94710AD390063357D532042Bd5f23A3fBd6'
    },
    token: serializedTokens.collect,
    quoteToken: serializedTokens.usdt,
  },
  {
    pid: 2,
    lpSymbol: 'Bronze NFT',
    lpAddresses: {
      137: '0x214C9b0CbcF1A5E4b8b0B78faD8743333B437Af3',
      80001: '0x109830F230A078Af2Ac526eac44D91cfB5e57C23' // CHANGE_ADDRESS:ERC20PegForNFT
    },
    nftAddresses: {
      137: '0x0B8E7D22CE826f1228a82525b8779dBdD9E24B80',
      80001: '0x2c65d5355813D3E1f86d1c9b25DCFF367bBd913D' 
    },
    token: serializedTokens.collect,
    quoteToken: serializedTokens.wmatic,
  },
  {
    pid: 3,
    lpSymbol: 'Silver NFT',
    lpAddresses: {
      137: '0x5f60C3aFDa5f2B48EE27D350159f85337F7a3Bf9',
      80001: '0x2aA524Bd10b24DE1E164FE0D3D8a895Ad2415964' // CHANGE_ADDRESS:ERC20PegForNFT
    },
    nftAddresses: {
      137: '0x0a846Dd40152d6fE8CB4DE4107E0b063B6D6b3F9',
      80001: '0x0a846Dd40152d6fE8CB4DE4107E0b063B6D6b3F9' 
    },
    token: serializedTokens.collect,
    quoteToken: serializedTokens.wmatic,
    isFinished: true,
  },
  {
    pid: 4,
    lpSymbol: 'Gold NFT',
    lpAddresses: {
      137: '0xDaD558FD416772A2a125aD6a4004fCe0076CaD98',
      80001: '0x0EaBC4BA3cd97FcCb82e895B7C215a4da6b97eC0' // CHANGE_ADDRESS:ERC20PegForNFT
    },
    nftAddresses: {
      137: '0x117D6870e6dE9faBcB40C34CceDD5228C63e3a1e',
      80001: '0x117D6870e6dE9faBcB40C34CceDD5228C63e3a1e'
    },
    token: serializedTokens.collect,
    quoteToken: serializedTokens.wmatic,
    isFinished: true,
  },
  {
    pid: 5,
    lpSymbol: 'Lot NFT',
    lpAddresses: {
      137: '0xDaD558FD416772A2a125aD6a4004fCe0076CaD98',
      80001: '0xE564106bacd4D3b74a79e0fbDabF0c43828a1DBB' // CHANGE_ADDRESS:ERC20PegForNFT
    },
    nftAddresses: {
      137: '0x117D6870e6dE9faBcB40C34CceDD5228C63e3a1e',
      80001: '0x117D6870e6dE9faBcB40C34CceDD5228C63e3a1e'
    },
    contractAddresses: {
      137: '0xEf0B91bA446213C2671AA45a7652Be1e25a80Ef9',
      80001: '0xa366daC682d414F4825332B4354FfF1C093E5804',
    },
    token: serializedTokens.collect,
    quoteToken: serializedTokens.wmatic,
    tokenPerBlock: '2',
    participantThreshold: 200,
    isFinished: false,
  },
].filter((f) => !!f.lpAddresses[ChainId.POLYGON])

export default nftFarms
