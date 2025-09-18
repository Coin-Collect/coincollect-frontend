import sample from 'lodash/sample'
import { ChainId } from '@coincollect/sdk'
import { PUBLIC_NODES } from 'config/nodes'

if (
  process.env.NODE_ENV !== 'production' &&
  (!process.env.NEXT_PUBLIC_NODE_1 || !process.env.NEXT_PUBLIC_NODE_2 || !process.env.NEXT_PUBLIC_NODE_3)
) {
  throw Error('One base RPC URL is undefined')
}

// Array of available nodes to connect to
export const nodes = [process.env.NEXT_PUBLIC_NODE_1, process.env.NEXT_PUBLIC_NODE_2, process.env.NEXT_PUBLIC_NODE_3]

// Array of available nodes to connect to
export const maticNodes = (
  [
    process.env.NEXT_PUBLIC_MATIC_NODE_1,
    process.env.NEXT_PUBLIC_MATIC_NODE_2,
    process.env.NEXT_PUBLIC_MATIC_NODE_3,
    ...(PUBLIC_NODES?.[ChainId.POLYGON] ?? []),
  ].filter(Boolean) as string[]
)

// Array of available nodes to connect to
export const mumbaiNodes = [process.env.NEXT_PUBLIC_MUMBAI_NODE_1].filter(Boolean) as string[]

const getNodeUrl = () => {
  // Use custom node if available (both for development and production)
  // However on the testnet it wouldn't work, so if on testnet - comment out the NEXT_PUBLIC_NODE_PRODUCTION from env file
  if (process.env.NEXT_PUBLIC_NODE_PRODUCTION) {
    return process.env.NEXT_PUBLIC_NODE_PRODUCTION
  }
  return sample(nodes)
}

export const getPolygonNodeUrl = () => {
  // Use custom node if available (both for development and production)
  // However on the testnet it wouldn't work, so if on testnet - comment out the NEXT_PUBLIC_NODE_PRODUCTION from env file
  if (process.env.NEXT_PUBLIC_POLYGON_NODE_PRODUCTION) {
    return process.env.NEXT_PUBLIC_POLYGON_NODE_PRODUCTION
  }

  if (process.env.NEXT_PUBLIC_CHAIN_ID == '137') {
    const node = sample(maticNodes)
    if (!node) {
      throw Error('No Polygon RPC URLs configured')
    }
    return node
  }

  const node = sample(mumbaiNodes)
  if (!node) {
    throw Error('No Mumbai RPC URLs configured')
  }
  return node
}

export default getNodeUrl
