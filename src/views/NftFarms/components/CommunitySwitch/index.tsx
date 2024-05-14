import styled from 'styled-components'
import { ButtonMenu, ButtonMenuItem, NotificationDot } from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'
import { useRouter } from 'next/router'
import { NextLinkFromReactRouter } from 'components/NextLink'


const CommunitySwitch: React.FC<any> = () => {
  const router = useRouter()
  const { t } = useTranslation()

  let activeIndex
  switch (router.pathname) {
    case '/nftpools':
      activeIndex = 0
      break
    case '/nftpools/partner-collections':
      activeIndex = 1
      break
    case '/nftpools/community-collections':
      activeIndex = 2
      break
    default:
      activeIndex = 0
      break
  }

  return (
    <Wrapper>
      <ButtonMenu activeIndex={activeIndex} scale="sm" variant="subtle">
        <ButtonMenuItem as={NextLinkFromReactRouter} to="/nftpools">
          {t('All')}
        </ButtonMenuItem>
        <ButtonMenuItem as={NextLinkFromReactRouter} to="/nftpools/partner-collections">
          {t('Partner')}
        </ButtonMenuItem>
        <ButtonMenuItem as={NextLinkFromReactRouter} to="/nftpools/community-collections">
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
