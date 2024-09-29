import { Currency, ETHER, Token } from '@coincollect/sdk'

export function currencyId(currency: Currency): string {
  if (currency === ETHER) return 'POL'
  if (currency instanceof Token) return currency.address
  throw new Error('invalid currency')
}

export default currencyId
