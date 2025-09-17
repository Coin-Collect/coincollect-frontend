import { useRouter } from 'next/router'
import { NftProfileLayout } from 'views/Nft/market/Profile'
import SubMenu from 'views/Nft/market/Profile/components/SubMenu'
import ProfileOverview from 'views/Nft/market/Profile/components/Overview'

const NftProfileOverviewPage = () => {
  const { query } = useRouter()
  const accountAddress = query.accountAddress as string

  return (
    <>
      <SubMenu />
      <ProfileOverview accountAddress={accountAddress} />
    </>
  )
}

NftProfileOverviewPage.Layout = NftProfileLayout

export default NftProfileOverviewPage
