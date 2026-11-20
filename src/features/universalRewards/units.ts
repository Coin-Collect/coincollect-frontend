// Construct bigint values without exponentiation so Next's legacy target does not emit Math.pow.
export const UNIT = BigInt('1000000000000000000')
export const UINT128_MAX = BigInt('0xffffffffffffffffffffffffffffffff')
export const UINT256_MAX = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

export function tokenScale(decimals: number) {
  return BigInt('1' + '0'.repeat(decimals))
}
