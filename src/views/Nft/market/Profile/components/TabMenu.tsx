import { useTranslation } from 'contexts/Localization'
import { NextLinkFromReactRouter } from 'components/NextLink'
import styled from 'styled-components'
import { Flex } from '@pancakeswap/uikit'
import { nftsBaseUrl } from 'views/Nft/market/constants'
import { useRouter } from 'next/router'

const Tab = styled.button<{ $active: boolean }>`
  display: inline-flex;
  justify-content: center;
  cursor: pointer;
  color: ${({ theme, $active }) => ($active ? theme.colors.secondary : theme.colors.textSubtle)};
  border-width: ${({ $active }) => ($active ? '1px 1px 0 1px' : '0')};
  border-style: solid solid none solid;
  border-color: ${({ theme }) =>
    `${theme.colors.cardBorder} ${theme.colors.cardBorder} transparent ${theme.colors.cardBorder}`};
  outline: 0;
  padding: 12px 16px;
  border-radius: 16px 16px 0 0;
  font-size: 16px;
  font-weight: ${({ $active }) => ($active ? '600' : '400')};
  background-color: ${({ theme, $active }) => ($active ? theme.colors.background : 'transparent')};
  transition: background-color 0.3s ease-out;
`

const TabMenu = () => {
  const { t } = useTranslation()
  const { pathname, query } = useRouter()
  const accountAddress = typeof query.accountAddress === 'string' ? query.accountAddress : ''
  const profileBasePath = accountAddress ? `${nftsBaseUrl}/profile/${accountAddress}` : `${nftsBaseUrl}/profile`
  const isOverview = pathname?.includes('/overview')

  const tabs = [
    {
      key: 'overview',
      label: t('Overview'),
      href: `${profileBasePath}/overview`,
      isActive: isOverview,
    },
    {
      key: 'nfts',
      label: t('NFTs'),
      href: profileBasePath,
      isActive: !isOverview,
    },
  ]

  return (
    <Flex>
      {tabs.map((tab) => (
        <Tab key={tab.key} $active={tab.isActive} as={NextLinkFromReactRouter} to={tab.href}>
          {tab.label}
        </Tab>
      ))}
    </Flex>
  )
}

export default TabMenu
