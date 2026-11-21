import translations from 'config/localization/translations.json'
import { resolveTranslation } from 'contexts/Localization/helpers'

describe('English translation catalog', () => {
  it.each(Object.entries(translations))('provides display text for %s', (key, value) => {
    expect(key.trim()).not.toBe('')
    expect(typeof value).toBe('string')
    expect(value.trim()).not.toBe('')
  })

  it('uses the shipped CoinCollect wording for legacy translation keys', () => {
    expect(resolveTranslation(translations, 'PancakeSwap')).toBe('CoinCollect')
    expect(resolveTranslation(translations, 'Buy CAKE')).toBe('Buy COLLECT')
    expect(resolveTranslation(translations, '%num% CAKE', { num: 0 })).toBe('0 COLLECT')
  })

  it('preserves literal fallback text and recognises only catalog entries', () => {
    expect(resolveTranslation(translations, 'Dynamic reward notification')).toBe('Dynamic reward notification')
    expect(resolveTranslation(translations, 'constructor')).toBe('constructor')
  })

  it('substitutes repeated placeholders and leaves unknown placeholders intact', () => {
    expect(resolveTranslation({}, '%amount% plus %amount% in %token%', { amount: '$&' })).toBe('$& plus $& in %token%')
  })
})
