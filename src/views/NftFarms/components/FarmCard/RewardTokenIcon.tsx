import type { Token } from '@coincollect/sdk'
import { useState } from 'react'
import styled from 'styled-components'
import { studioToken } from 'features/universalRewards/assetCatalog'

const TokenImage = styled.img`
  flex: none;
  border-radius: 50%;
  object-fit: cover;
`

const TokenFallback = styled.span<{ $size: number }>`
  display: inline-grid;
  flex: none;
  place-items: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 5px;
  background: ${({ theme }) => `${theme.colors.textSubtle}22`};
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: ${({ $size }) => Math.max(8, Math.round($size * 0.55))}px;
  font-weight: 800;
  text-transform: uppercase;

  &::before {
    content: attr(data-letter);
  }
`

const symbolIcons: Record<string, string> = {
  SHIB: '/images/games/tokens/shib-min.png',
  ELON: '/images/games/tokens/elon-min.png',
  BONK: '/images/games/tokens/bonk.png',
  RADAR: '/images/tokens/0xdCb72AE4d5dc6Ae274461d57E65dB8D50d0a33AD.png',
}

type Props = {
  token: string
  tokenMeta?: Pick<Token, 'address'>
  size?: number
}

function TokenIcon({ token, address, size }: { token: string; address?: string; size: number }) {
  const [index, setIndex] = useState(0)
  const candidates = [
    symbolIcons[token.toUpperCase()],
    address && `/images/tokens/${address}.svg`,
    address && `/images/tokens/${address}.png`,
  ].filter(Boolean)
  const src = candidates[index]
  return src ? (
    <TokenImage src={src} alt="" width={size} height={size} onError={() => setIndex((previous) => previous + 1)} />
  ) : (
    <TokenFallback $size={size} aria-hidden="true" data-letter={token.slice(0, 1)} />
  )
}

export default function RewardTokenIcon({ token, tokenMeta, size = 14 }: Props) {
  const address = tokenMeta && (studioToken(tokenMeta.address)?.address ?? tokenMeta.address)
  return <TokenIcon key={`${address}:${token}`} token={token} address={address} size={size} />
}
