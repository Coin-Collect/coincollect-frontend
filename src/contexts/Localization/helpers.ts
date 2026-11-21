import { EN } from 'config/localization/languages'
import type { ContextData, TranslationKey } from './types'

export function resolveTranslation(catalog: Record<string, string>, key: TranslationKey, data?: ContextData): string {
  const translated = (Object.prototype.hasOwnProperty.call(catalog, key) && catalog[key]) || key
  if (!data) return translated

  return translated.replace(/%([^%\s]+)%/g, (placeholder, name: string) => {
    const value = Object.prototype.hasOwnProperty.call(data, name) ? data[name] : undefined
    return value == null ? placeholder : String(value)
  })
}

const publicUrl = process.env.PUBLIC_URL || ''

export const LS_KEY = 'pancakeswap_language'

export const fetchLocale = async (locale) => {
  const response = await fetch(`${publicUrl}/locales/${locale}.json`)
  const data = await response.json()
  return data
}

export const getLanguageCodeFromLS = () => {
  try {
    const codeFromStorage = localStorage.getItem(LS_KEY)

    return codeFromStorage || EN.locale
  } catch {
    return EN.locale
  }
}
