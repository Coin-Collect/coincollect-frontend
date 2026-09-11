import styled from 'styled-components'
import { ButtonMenu, ButtonMenuItem, NotificationDot } from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'
import { useRouter } from 'next/router'
import { NextLinkFromReactRouter } from 'components/NextLink'

const CommunitySwitch: React.FC<any> = () => {
  const router = useRouter()
  const { t } = useTranslation()
  const isFinished = router.pathname === '/nftpools/history'
  const collectionFilter =
    router.query.collection === 'partner' || router.query.collection === 'community'
      ? router.query.collection
      : undefined

  const selectedCollection = router.pathname.includes('partner-collections')
    ? 'partner'
    : router.pathname.includes('community-collections')
    ? 'community'
    : collectionFilter

  let activeIndex
  switch (selectedCollection) {
    case 'partner':
      activeIndex = 1
      break
    case 'community':
      activeIndex = 2
      break
    default:
      activeIndex = 0
  }

  const getCollectionPath = (collection?: 'partner' | 'community') => {
    if (isFinished) {
      return collection ? `/nftpools/history?collection=${collection}` : '/nftpools/history'
    }

    return collection ? `/nftpools/${collection}-collections` : '/nftpools'
  }

  return (
    <Wrapper>
      <ButtonMenu activeIndex={activeIndex} scale="sm" variant="subtle">
        <ButtonMenuItem as={NextLinkFromReactRouter} to={getCollectionPath()}>
          {t('All')}
        </ButtonMenuItem>
        <ButtonMenuItem as={NextLinkFromReactRouter} to={getCollectionPath('partner')}>
          {t('Partner')}
        </ButtonMenuItem>
        <ButtonMenuItem as={NextLinkFromReactRouter} to={getCollectionPath('community')}>
          {t('Community')}
        </ButtonMenuItem>
      </ButtonMenu>
    </Wrapper>
  )
}

export default CommunitySwitch

const Wrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;

  a {
    padding-left: 12px;
    padding-right: 12px;
  }

  ${({ theme }) => theme.mediaQueries.sm} {
    margin-left: 16px;
  }
`
