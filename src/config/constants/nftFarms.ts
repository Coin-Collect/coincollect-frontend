import { serializeTokens } from './tokens'
import { SerializedNftFarmConfig } from './types'
import { CHAIN_ID } from './networks'
import { ChainId } from '@coincollect/sdk'

const serializedTokens = serializeTokens()

const nftFarms: SerializedNftFarmConfig[] = [
  {
    pid: 1,
    lpSymbol: 'CoinCollect Starter NFT',
    nftAddresses: {
      137: '0x569B70fc565AFba702d9e77e75FD3e3c78F57eeD',
      80001: '0x11DdF94710AD390063357D532042Bd5f23A3fBd6'
    },
  },
  {
    pid: 2,
    lpSymbol: 'CoinCollect Bronze NFT',
    nftAddresses: {
      137: '0x0B8E7D22CE826f1228a82525b8779dBdD9E24B80',
      80001: '0x2c65d5355813D3E1f86d1c9b25DCFF367bBd913D' 
    },
  },
  {
    pid: 3,
    lpSymbol: 'CoinCollect Silver NFT',
    nftAddresses: {
      137: '0x0a846Dd40152d6fE8CB4DE4107E0b063B6D6b3F9',
      80001: '0x0a846Dd40152d6fE8CB4DE4107E0b063B6D6b3F9' 
    },
    isFinished: false,
  },
  {
    pid: 4,
    lpSymbol: 'CoinCollect Gold NFT',
    nftAddresses: {
      137: '0x117D6870e6dE9faBcB40C34CceDD5228C63e3a1e',
      80001: '0x117D6870e6dE9faBcB40C34CceDD5228C63e3a1e'
    },
    isFinished: false,
  },
  {
    pid: 5,
    lpSymbol: 'Lot NFT',
    nftAddresses: {
      137: '0x2E1cF0960Fc9Ece56f53bf58351d175cd1867b2c',
      80001: '0xDb37c24423F63F0245def80a4904204337F90651'
    },
    contractAddresses: {
      137: '0xEf0B91bA446213C2671AA45a7652Be1e25a80Ef9',
      80001: '0x888BCbB019383f4c13528CBCb41DEa3B606Ee1dE',
    },
    tokenPerBlock: '0.0000102',
    participantThreshold: 20,
    isFinished: false,
    earningToken: serializedTokens.lot,
    sideRewards: [
      {token: 'Collect', percentage: 6670},
      {token: 'Shiba', percentage: 33350},
    ],
    supportedCollectionPids: [1,2,3,4],
    mainCollectionWeight: '15',
    performanceFee: '0',
    projectLink: 'https://lotshare.app/',
  },
].filter((f) => !!f.nftAddresses[ChainId.POLYGON])

export default nftFarms
