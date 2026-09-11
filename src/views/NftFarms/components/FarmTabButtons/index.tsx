import styled from 'styled-components'
import { ButtonMenu, ButtonMenuItem, NotificationDot } from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'
import { useRouter } from 'next/router'
import { NextLinkFromReactRouter } from 'components/NextLink'

interface FarmTabButtonsProps {
  hasStakeInFinishedFarms: boolean
}

const FarmTabButtons: React.FC<FarmTabButtonsProps> = ({ hasStakeInFinishedFarms }) => {
  const router = useRouter()
  const { t } = useTranslation()
  const selectedCollection = router.pathname.includes('partner-collections')
    ? 'partner'
    : router.pathname.includes('community-collections')
    ? 'community'
    : router.query.collection === 'partner' || router.query.collection === 'community'
    ? router.query.collection
    : undefined
  const livePath = selectedCollection ? `/nftpools/${selectedCollection}-collections` : '/nftpools'
  const finishedPath = selectedCollection ? `/nftpools/history?collection=${selectedCollection}` : '/nftpools/history'

  let activeIndex
  switch (router.pathname) {
    case '/nftpools':
      activeIndex = 0
      break
    case '/nftpools/history':
      activeIndex = 1
      break
    case '/nftpools/archived':
      activeIndex = 2
      break
    default:
      activeIndex = 0
      break
  }

  return (
    <Wrapper>
      <ButtonMenu activeIndex={activeIndex} scale="sm" variant="subtle">
        <ButtonMenuItem as={NextLinkFromReactRouter} to={livePath}>
          {t('Live')}
        </ButtonMenuItem>
        <NotificationDot show={hasStakeInFinishedFarms}>
          <ButtonMenuItem as={NextLinkFromReactRouter} to={finishedPath} id="finished-farms-button">
            {t('Finished')}
          </ButtonMenuItem>
        </NotificationDot>
      </ButtonMenu>
    </Wrapper>
  )
}

export default FarmTabButtons

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
