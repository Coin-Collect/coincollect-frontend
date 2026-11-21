import { Token, Pair, ChainId } from '@coincollect/sdk'
import { isAddress } from 'utils'

const toToken = (value: string | Token | null | undefined): Token | null => {
  if (typeof value !== 'string') return value ?? null
  const address = isAddress(value)
  return address ? new Token(ChainId.MAINNET, address, 18) : null
}

const getLpAddress = (token1?: string | Token | null, token2?: string | Token | null) => {
  const first = toToken(token1)
  const second = toToken(token2)
  return first && second ? Pair.getAddress(first, second) : null
}

export default getLpAddress
