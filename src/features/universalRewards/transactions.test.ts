import { toFunctionSelector, zeroAddress } from 'viem'
import { describeV3Error, withV3GasHeadroom } from './transactions'

it.each([
  new Error('The requested method and/or account has not been authorized by the user.'),
  { shortMessage: 'The requested account and/or method has not been authorized by the user.' },
])('explains wallet permission failures with an actionable recovery', (error) => {
  expect(describeV3Error(error)).toBe(
    'Your wallet has not authorized this account or network for CoinCollect. Review the site permissions in your wallet, then retry.',
  )
})

it('keeps room for a ledger exit to start paying between simulation and execution', () => {
  const address = '0x0000000000000000000000000000000000000001'
  const estimate = BigInt(88_722)
  const data = toFunctionSelector('exit(uint256,uint256,address,uint256)')
  expect(withV3GasHeadroom(estimate, { ledger: address, call: { to: address, data } })).toBe(BigInt(281_466))
  expect(withV3GasHeadroom(estimate, { ledger: address, call: { to: zeroAddress, data } })).toBe(BigInt(131_466))
  expect(withV3GasHeadroom(estimate)).toBe(BigInt(131_466))
})
