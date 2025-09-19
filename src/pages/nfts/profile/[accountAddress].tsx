import { useCallback } from 'react'
import useWeb3React from 'hooks/useWeb3React'
import { useRouter } from 'next/router'
import { useProfileForAddress } from 'state/profile/hooks'
import { NftProfileLayout } from 'views/Nft/market/Profile'
import SubMenu from 'views/Nft/market/Profile/components/SubMenu'
import UnconnectedProfileNfts from 'views/Nft/market/Profile/components/UnconnectedProfileNfts'
import UserNfts from 'views/Nft/market/Profile/components/UserNfts'
import useCoinCollectNftsForAddress from 'views/Nft/market/hooks/useCoinCollectNftsForAddress'
import useUserStakedNftFarms from 'views/Nft/market/Profile/hooks/useUserStakedNftFarms'

const NftProfilePage = () => {
  const { account } = useWeb3React()
  const accountAddress = useRouter().query.accountAddress as string
  const isConnectedProfile = account?.toLowerCase() === accountAddress?.toLowerCase()
  const {
    profile,
    isValidating: isProfileFetching,
  } = useProfileForAddress(accountAddress, {
    revalidateIfStale: true,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const {
    nfts,
    isLoading: isNftLoading,
    refresh: refreshUserNfts,
  } = useCoinCollectNftsForAddress(accountAddress, profile, isProfileFetching)
  const {
    stakedFarms,
    isLoading: isStakedFarmsLoading,
    totalStakedBalance,
  } = useUserStakedNftFarms(isConnectedProfile)

  const handleRefreshUserNfts = useCallback(() => {
    refreshUserNfts()
  }, [refreshUserNfts])
  
  return (
    <>
      {/* TODO: Activate Later
      <SubMenu />
      */}
      {isConnectedProfile ? (
        <UserNfts
          account={account}
          walletNfts={nfts}
          isWalletLoading={isNftLoading}
          stakedFarms={stakedFarms}
          isStakedLoading={isStakedFarmsLoading}
          totalStakedBalance={totalStakedBalance}
          onRefreshWallet={handleRefreshUserNfts}
          onSuccessSale={handleRefreshUserNfts}
        />
      ) : (
        <UnconnectedProfileNfts nfts={nfts} isLoading={isNftLoading} />
      )}
    </>
  )
}

NftProfilePage.Layout = NftProfileLayout

export default NftProfilePage
