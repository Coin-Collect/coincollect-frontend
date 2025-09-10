import { ResetCSS, useTooltip } from '@pancakeswap/uikit'
import Script from 'next/script'
import BigNumber from 'bignumber.js'
import EasterEgg from 'components/EasterEgg'
import GlobalCheckClaimStatus from 'components/GlobalCheckClaimStatus'
import SubgraphHealthIndicator from 'components/SubgraphHealthIndicator'
import { ToastListener } from 'contexts/ToastsContext'
import useEagerConnect from 'hooks/useEagerConnect'
import { useAccountEventListener } from 'hooks/useAccountEventListener'
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
import styled from 'styled-components'

// This config is required for number formatting
BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

function GlobalHooks() {
  usePollBlockNumber()
  //useEagerConnect()
  usePollCoreFarmData()
  useUserAgent()
  useAccountEventListener()
  useSentryUser()
  return null
}

const WizardLink = styled.a`
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 1000;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, rgba(255,255,255,0.6), rgba(255,255,255,0.1));
  box-shadow: 0 6px 24px rgba(0,0,0,0.2);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  text-decoration: none;
  &:hover { 
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 10px 32px rgba(0,0,0,0.28);
  }
  &:active {
    transform: translateY(0) scale(0.98);
  }

  @media (max-width: 768px) {
    right: 20px;
    bottom: 20px;
    width: 68px;
    height: 68px;
  }
`

const WizardVideo = styled.video`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  pointer-events: none; /* allow clicks to hit the anchor */
`

function MyApp(props: AppProps) {
  const { pageProps } = props
  // @ts-ignore
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
  const assistantUrl = process.env.NEXT_PUBLIC_AI_ASSISTANT_URL || 'https://chatgpt.com/g/g-68be838798b88191be7523dce0b90b2c-coincollect-wizard'
  
  const { targetRef, tooltip, tooltipVisible } = useTooltip(
    <div>
      Meet Wizard, your AI assistant here to help you navigate CoinCollect.
      <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>
        AI Assistant powered by OpenAI, created by SapienX
      </div>
    </div>,
    { placement: 'top' }
  )
  
  return (
    <ProductionErrorBoundary>
      <Menu>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </Menu>
      <EasterEgg iterations={2} />
      <ToastListener />
      <WizardLink
        ref={targetRef}
        href={assistantUrl}
        target={assistantUrl.startsWith('http') ? '_blank' : undefined}
        rel={assistantUrl.startsWith('http') ? 'noreferrer noopener' : undefined}
        aria-label="Open AI Assistant"
        title={assistantUrl === '#' ? 'AI Assistant coming soon' : 'Chat with our AI Assistant'}
      >
        <WizardVideo src="/wizzard.webm" autoPlay loop muted playsInline />
      </WizardLink>
      {tooltipVisible && tooltip}
      {/* TODO: Activate later
      <SubgraphHealthIndicator />
      */}
    </ProductionErrorBoundary>
  )
}

export default MyApp
