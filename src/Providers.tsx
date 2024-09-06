import { ModalProvider, light, dark } from '@pancakeswap/uikit'
import { Provider } from 'react-redux'
import { SWRConfig } from 'swr'
import { ThemeProvider } from 'styled-components'
import { useThemeManager } from 'state/user/hooks'
import { getLibrary } from 'utils/web3React'
import { LanguageProvider } from 'contexts/Localization'
import { ToastsProvider } from 'contexts/ToastsContext'
import { fetchStatusMiddleware } from 'hooks/useSWRContract'
import { Store } from '@reduxjs/toolkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config, metadata, projectId } from 'utils/wagmi'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { polygon } from 'viem/chains'

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
    enableAnalytics: true, // Optional - defaults to your Cloud configuration
    defaultChain: polygon,
    themeVariables: {
      '--w3m-accent': '#E91E63',
    },
    tokens: {
      137: {
        address: '0x56633733fc8BAf9f730AD2b6b9956Ae22c6d4148',
        image: 'https://static.cx.metamask.io/api/v1/tokenIcons/137/0x56633733fc8baf9f730ad2b6b9956ae22c6d4148.png'
      }
    }
  })

const Providers: React.FC<{ store: Store }> = ({ children, store }) => {
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
                  <ModalProvider>{children}</ModalProvider>
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
