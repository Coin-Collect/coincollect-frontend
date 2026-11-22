import { describeV3Error } from './transactions'

it.each([
  new Error('The requested method and/or account has not been authorized by the user.'),
  { shortMessage: 'The requested account and/or method has not been authorized by the user.' },
])('explains wallet permission failures with an actionable recovery', (error) => {
  expect(describeV3Error(error)).toBe(
    'Your wallet has not authorized this account or network for CoinCollect. Review the site permissions in your wallet, then retry.',
  )
})
