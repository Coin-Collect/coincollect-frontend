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
  const { pathname } = useRouter()
  
  const pageMeta = getCustomMeta(pathname, t) || {}
  const { title, description, image } = { ...DEFAULT_META, ...pageMeta, ...customMeta }
  
  return (
    <Head>
      <title key="page:title">{title}</title>
      <meta key="page:og:title" property="og:title" content={title} />
      <meta key="page:og:description" property="og:description" content={description} />
      <meta key="page:og:image" property="og:image" content={image} />
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
