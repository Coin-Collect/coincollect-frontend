import { createContext, useCallback, useEffect, useState } from 'react'
import { Language } from '@pancakeswap/uikit'
import { EN, languageList } from 'config/localization/languages'
import translations from 'config/localization/translations.json'
import { ContextApi, ProviderState, TranslateFunction } from './types'
import { LS_KEY, fetchLocale, getLanguageCodeFromLS, resolveTranslation } from './helpers'

const initialState: ProviderState = {
  isFetching: true,
  currentLanguage: EN,
}

// Export the translations directly
export const languageMap = new Map<Language['locale'], Record<string, string>>()
languageMap.set(EN.locale, translations)

export const LanguageContext = createContext<ContextApi | undefined>(undefined)

export const LanguageProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, setState] = useState<ProviderState>(() => {
    const codeFromStorage = getLanguageCodeFromLS()

    return {
      ...initialState,
      currentLanguage: languageList.find((language) => language.locale === codeFromStorage) ?? EN,
    }
  })
  const { currentLanguage } = state

  useEffect(() => {
    const fetchInitialLocales = async () => {
      const codeFromStorage = getLanguageCodeFromLS()

      if (codeFromStorage !== EN.locale) {
        const enLocale = languageMap.get(EN.locale)
        const currentLocale = await fetchLocale(codeFromStorage)
        languageMap.set(codeFromStorage, { ...enLocale, ...currentLocale })
      }

      setState((prevState) => ({
        ...prevState,
        isFetching: false,
      }))
    }

    fetchInitialLocales()
  }, [setState])

  const setLanguage = useCallback(async (language: Language) => {
    if (!languageMap.has(language.locale)) {
      setState((prevState) => ({
        ...prevState,
        isFetching: true,
      }))

      const locale = await fetchLocale(language.locale)
      const enLocale = languageMap.get(EN.locale)

      // Merge the EN locale to ensure that any locale fetched has all the keys
      languageMap.set(language.locale, { ...enLocale, ...locale })
      localStorage.setItem(LS_KEY, language.locale)

      setState((prevState) => ({
        ...prevState,
        isFetching: false,
        currentLanguage: language,
      }))
    } else {
      localStorage.setItem(LS_KEY, language.locale)
      setState((prevState) => ({
        ...prevState,
        isFetching: false,
        currentLanguage: language,
      }))
    }
  }, [])

  const translate: TranslateFunction = useCallback(
    (key, data) => resolveTranslation(languageMap.get(currentLanguage.locale) ?? translations, key, data),
    [currentLanguage],
  )

  return <LanguageContext.Provider value={{ ...state, setLanguage, t: translate }}>{children}</LanguageContext.Provider>
}
