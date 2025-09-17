import { useTranslation } from 'contexts/Localization'
import { useRouter } from 'next/router'
import BaseSubMenu from '../../components/BaseSubMenu'
import { nftsBaseUrl } from '../../constants'

const SubMenuComponent: React.FC = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const accountAddress = router.query.accountAddress as string
  const { asPath } = router

  const ItemsConfig = [
    {
      label: t('Overview'),
      href: `${nftsBaseUrl}/profile/${accountAddress}/overview`,
    },
    {
      label: t('Items'),
      href: `${nftsBaseUrl}/profile/${accountAddress}`,
    },
    {
      label: t('Activity'),
      href: `${nftsBaseUrl}/profile/${accountAddress}/activity`,
    },
  ]

  return <BaseSubMenu items={ItemsConfig} activeItem={asPath} justifyContent="flex-start" mb="60px" />
}

export default SubMenuComponent
