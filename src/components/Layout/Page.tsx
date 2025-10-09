import styled from 'styled-components'
import { useTranslation } from 'contexts/Localization'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { DEFAULT_META, getCustomMeta } from 'config/constants/meta'
import { useCakeBusdPrice } from 'hooks/useBUSDPrice'
import Container from './Container'

const StyledPage = styled(Container)`
  min-height: calc(100vh - 64px);
  padding-top: 16px;
  padding-bottom: 16px;

  ${({ theme }) => theme.mediaQueries.sm} {
    padding-top: 24px;
    padding-bottom: 24px;
  }

  ${({ theme }) => theme.mediaQueries.lg} {
    padding-top: 32px;
    padding-bottom: 32px;
  }
`

interface MetaOverrides {
  title?: string
  description?: string
  image?: string
}

interface PageMetaProps {
  symbol?: string
  customMeta?: MetaOverrides
}

export const PageMeta: React.FC<PageMetaProps> = ({ symbol, customMeta }) => {
  const { t } = useTranslation()
  const { pathname, asPath } = useRouter()
  
  const pageMeta = getCustomMeta(pathname, t) || {}
  const { title, description, image } = { ...DEFAULT_META, ...pageMeta, ...customMeta }
  
  // Construct the full URL for og:url
  const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || 'https://app.coincollect.org'
  const fullUrl = `${baseUrl}${asPath}`
  const twitterHandle = process.env.NEXT_PUBLIC_TWITTER_HANDLE || '@CoinCollectHQ'
  
  return (
    <Head>
      {/* Basic Meta Tags */}
      <title key="page:title">{title}</title>
      <meta key="page:description" name="description" content={description} />
      
      {/* Open Graph Meta Tags */}
      <meta key="page:og:type" property="og:type" content="website" />
      <meta key="page:og:site_name" property="og:site_name" content="CoinCollect" />
      <meta key="page:og:title" property="og:title" content={title} />
      <meta key="page:og:description" property="og:description" content={description} />
      <meta key="page:og:image" property="og:image" content={image} />
      <meta key="page:og:image:alt" property="og:image:alt" content={title} />
      <meta key="page:og:image:width" property="og:image:width" content="1200" />
      <meta key="page:og:image:height" property="og:image:height" content="630" />
      <meta key="page:og:url" property="og:url" content={fullUrl} />
      <meta key="page:og:locale" property="og:locale" content="en_US" />
      
      {/* Twitter Card Meta Tags */}
      <meta key="page:twitter:card" name="twitter:card" content="summary_large_image" />
      <meta key="page:twitter:site" name="twitter:site" content={twitterHandle} />
      <meta key="page:twitter:creator" name="twitter:creator" content={twitterHandle} />
      <meta key="page:twitter:title" name="twitter:title" content={title} />
      <meta key="page:twitter:description" name="twitter:description" content={description} />
      <meta key="page:twitter:image" name="twitter:image" content={image} />
      <meta key="page:twitter:image:alt" name="twitter:image:alt" content={title} />
      
      {/* Additional Meta Tags for Better SEO */}
      <meta key="page:robots" name="robots" content="index, follow" />
      <meta key="page:author" name="author" content="CoinCollect" />
      <meta key="page:theme-color" name="theme-color" content="#1FC7D4" />
      <link key="page:canonical" rel="canonical" href={fullUrl} />
    </Head>
  )
}

interface PageProps extends React.HTMLAttributes<HTMLDivElement> {
  symbol?: string
  meta?: MetaOverrides
  withMeta?: boolean
}

const Page: React.FC<PageProps> = ({ children, symbol, meta, withMeta = true, ...props }) => {
  return (
    <>
      {withMeta && <PageMeta symbol={symbol} customMeta={meta} />}
      <StyledPage {...props}>{children}</StyledPage>
    </>
  )
}

export default Page
