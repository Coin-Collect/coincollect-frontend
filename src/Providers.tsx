import { ModalProvider, light, dark } from '@pancakeswap/uikit'
import { Provider } from 'react-redux'
import { SWRConfig } from 'swr'
import { ThemeProvider } from 'styled-components'
import { useThemeManager } from 'state/user/hooks'
import { LanguageProvider } from 'contexts/Localization'
import { ToastsProvider } from 'contexts/ToastsContext'
import { fetchStatusMiddleware } from 'hooks/useSWRContract'
import { Store } from '@reduxjs/toolkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config, metadata, projectId } from 'utils/wagmi'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { polygon } from 'viem/chains'
import { PropsWithChildren } from 'react'
import { MusicProvider } from 'contexts/MusicContext'

const ThemeProviderWrapper = (props) => {
  const [isDark] = useThemeManager()
  return <ThemeProvider theme={isDark ? dark : light} {...props} />
}

// Create a client
const queryClient = new QueryClient()

if (!projectId) throw new Error('Project ID is not defined')

  // Create modal
  createWeb3Modal({
    metadata,
    wagmiConfig: config,
    projectId,
    enableAnalytics: false, // Optional - defaults to your Cloud configuration
    defaultChain: polygon,
    themeVariables: {
      '--w3m-accent': '#E91E63',
    },
    tokens: {
      137: {
        address: '0x56633733fc8BAf9f730AD2b6b9956Ae22c6d4148',
        image: 'https://static.cx.metamask.io/api/v1/tokenIcons/137/0x56633733fc8baf9f730ad2b6b9956ae22c6d4148.png'
      }
    },
    featuredWalletIds: [
      'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
      '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0'
    ]
  })

type ProvidersProps = PropsWithChildren<{ store: Store }>

const Providers = ({ children, store }: ProvidersProps) => {
  return (
    <WagmiProvider reconnectOnMount config={config}>
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <ToastsProvider>
            <ThemeProviderWrapper>
              <LanguageProvider>
                <SWRConfig
                  value={{
                    use: [fetchStatusMiddleware],
                  }}
                >
                  <MusicProvider>
                    <ModalProvider>{children}</ModalProvider>
                  </MusicProvider>
                </SWRConfig>
              </LanguageProvider>
            </ThemeProviderWrapper>
          </ToastsProvider>
        </Provider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default Providers
