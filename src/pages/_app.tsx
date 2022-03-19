import { ResetCSS } from '@pancakeswap/uikit'
import Script from 'next/script'
import BigNumber from 'bignumber.js'
import EasterEgg from 'components/EasterEgg'
import GlobalCheckClaimStatus from 'components/GlobalCheckClaimStatus'
import SubgraphHealthIndicator from 'components/SubgraphHealthIndicator'
import { ToastListener } from 'contexts/ToastsContext'
import useEagerConnect from 'hooks/useEagerConnect'
import { useInactiveListener } from 'hooks/useInactiveListener'
import useSentryUser from 'hooks/useSentryUser'
import useUserAgent from 'hooks/useUserAgent'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { Fragment } from 'react'
import { PersistGate } from 'redux-persist/integration/react'
import { useStore, persistor } from 'state'
import { usePollBlockNumber } from 'state/block/hooks'
import { usePollCoreFarmData } from 'state/farms/hooks'
import { NextPage } from 'next'
import { Blocklist, Updaters } from '..'
import ErrorBoundary from '../components/ErrorBoundary'
import Menu from '../components/Menu'
import BlockCountry from '../components/BlockCountry'
import Providers from '../Providers'
import GlobalStyle from '../style/Global'

// This config is required for number formatting
BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

function GlobalHooks() {
  usePollBlockNumber()
  useEagerConnect()
  usePollCoreFarmData()
  useUserAgent()
  useInactiveListener()
  useSentryUser()
  return null
}

function MyApp(props: AppProps) {
  const { pageProps } = props
  const store = useStore(pageProps.initialReduxState)

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, minimum-scale=1, viewport-fit=cover"
        />
        <meta
          name="description"
          content="CoinCollect is the MultiChain NFT DeFi Protocol. Earn tokens through NTF staking, yield farming or special pools, CoinCollect NFTs are lifetime privilege."
        />
        <meta name="theme-color" content="#E91E63" />
        <meta name="twitter:image" content="https://coincollect.org/assets/images/clone/ogbanner.png" />
        <meta
          name="twitter:description"
          content="CoinCollect is the MultiChain NFT DeFi Protocol. Earn tokens through NTF staking, yield farming or special pools, CoinCollect NFTs are lifetime privilege."
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="CoinCollect is the MultiChain NFT DeFi Protocol." />
        <title>CoinCollect</title>
      </Head>
      <Providers store={store}>
        <Blocklist>
          <GlobalHooks />
          <Updaters />
          <ResetCSS />
          <GlobalStyle />
          <GlobalCheckClaimStatus excludeLocations={[]} />
          <PersistGate loading={null} persistor={persistor}>
            <BlockCountry />
            <App {...props} />
          </PersistGate>
        </Blocklist>
      </Providers>
      <Script
        strategy="afterInteractive"
        id="google-tag"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer', '${process.env.NEXT_PUBLIC_GTAG}');
          `,
        }}
      />
    </>
  )
}

type NextPageWithLayout = NextPage & {
  Layout?: React.FC
}

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout
}

const ProductionErrorBoundary = process.env.NODE_ENV === 'production' ? ErrorBoundary : Fragment

const App = ({ Component, pageProps }: AppPropsWithLayout) => {
  // Use the layout defined at the page level, if available
  const Layout = Component.Layout || Fragment
  return (
    <ProductionErrorBoundary>
      <Menu>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </Menu>
      <EasterEgg iterations={2} />
      <ToastListener />
      <SubgraphHealthIndicator />
    </ProductionErrorBoundary>
  )
}

export default MyApp
