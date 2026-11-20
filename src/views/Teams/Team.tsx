import { ChevronLeftIcon, Flex, Text } from '@pancakeswap/uikit'
import Page from 'components/Layout/Page'
import { useTranslation } from 'contexts/Localization'
import { useRouter } from 'next/router'
import Link from 'next/link'
import TeamCard from './components/TeamCard'
import TeamHeader from './components/TeamHeader'

const Team = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const idStr = typeof router.query.id === 'string' ? router.query.id : ''

  return (
    <Page>
      <TeamHeader />
      <Flex mb="24px">
        <Flex as={Link} href="/teams" alignItems="center">
          <ChevronLeftIcon color="primary" />
          <Text color="primary">{t('Teams Overview')}</Text>
        </Flex>
      </Flex>
      <TeamCard id={idStr} />
    </Page>
  )
}

export default Team
