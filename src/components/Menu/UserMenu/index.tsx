import { useEffect, useState } from 'react'
import {
  Flex,
  LogoutIcon,
  RefreshIcon,
  useModal,
  UserMenu as UIKitUserMenu,
  UserMenuDivider,
  UserMenuItem,
  UserMenuVariant,
} from '@pancakeswap/uikit'
import useAuth from 'hooks/useAuth'
import { useRouter } from 'next/router'
import { useProfile } from 'state/profile/hooks'
import { usePendingTransactions } from 'state/transactions/hooks'
import ConnectWalletButton from 'components/ConnectWalletButton'
import { useGetBnbBalance, useGetMaticBalance } from 'hooks/useTokenBalance'
import { useTranslation } from 'contexts/Localization'
import { nftsBaseUrl } from 'views/Nft/market/constants'
import { FetchStatus } from 'config/constants/types'
import WalletModal, { WalletView, LOW_MATIC_BALANCE } from './WalletModal'
import ProfileUserMenuItem from './ProfileUserMenutItem'
import WalletUserMenuItem from './WalletUserMenuItem'
import useWeb3React from 'hooks/useWeb3React'
import { isChainSupported } from 'utils/wagmi'

const UserMenu = () => {
  const router = useRouter()
  const { t } = useTranslation()
  const { account, chainId } = useWeb3React()
  const { logout } = useAuth()
  const { hasPendingTransactions, pendingNumber } = usePendingTransactions()
  const { balance, fetchStatus } = useGetMaticBalance()
  const { isInitialized, isLoading, profile } = useProfile()

  const [onPresentWalletModal] = useModal(<WalletModal initialView={WalletView.WALLET_INFO} />)
  const [onPresentTransactionModal] = useModal(<WalletModal initialView={WalletView.TRANSACTIONS} />)
  const [onPresentWrongNetworkModal] = useModal(<WalletModal initialView={WalletView.WRONG_NETWORK} />)
  const hasProfile = isInitialized && !!profile
  const avatarSrc = profile?.nft?.image?.thumbnail
  const hasLowMaticBalance = fetchStatus === FetchStatus.Fetched && balance.lte(LOW_MATIC_BALANCE)
  const [userMenuText, setUserMenuText] = useState<string>('')
  const [userMenuVariable, setUserMenuVariable] = useState<UserMenuVariant>('default')
  const isWrongNetwork = account && !isChainSupported(chainId)

  useEffect(() => {
    if (hasPendingTransactions) {
      setUserMenuText(t('%num% Pending', { num: pendingNumber }))
      setUserMenuVariable('pending')
    } else {
      setUserMenuText('')
      setUserMenuVariable('default')
    }
  }, [hasPendingTransactions, pendingNumber, t])

  const onClickWalletMenu = (): void => {
    if (isWrongNetwork) {
      onPresentWrongNetworkModal()
    } else {
      onPresentWalletModal()
    }
  }

  const UserMenuItems = () => {
    return (
      <>
        <WalletUserMenuItem
          hasLowMaticBalance={hasLowMaticBalance}
          isWrongNetwork={isWrongNetwork}
          onPresentWalletModal={onClickWalletMenu}
        />
        <UserMenuItem as="button" disabled={isWrongNetwork} onClick={onPresentTransactionModal}>
          {t('Recent Transactions')}
          {hasPendingTransactions && <RefreshIcon spin />}
        </UserMenuItem>
        <UserMenuDivider />
        <UserMenuItem
          as="button"
          disabled={isWrongNetwork}
          onClick={() => router.push(`${nftsBaseUrl}/profile/${account.toLowerCase()}`)}
        >
          {t('Dashboard')} {/* TODO: This was Your NFTs */}
        </UserMenuItem>
        {/*TODO: Activate later
        <ProfileUserMenuItem isLoading={isLoading} hasProfile={hasProfile} disabled={isWrongNetwork} />
        */}
        <UserMenuDivider />
        <UserMenuItem as="button" onClick={logout}>
          <Flex alignItems="center" justifyContent="space-between" width="100%">
            {t('Disconnect')}
            <LogoutIcon />
          </Flex>
        </UserMenuItem>
      </>
    )
  }

  if (account) {
    return (
      <UIKitUserMenu account={account} avatarSrc={avatarSrc} text={userMenuText} variant={userMenuVariable}>
        <UserMenuItems />
      </UIKitUserMenu>
    )
  }

  if (isWrongNetwork) {
    return (
      <UIKitUserMenu text={t('Network')} variant="danger">
        <UserMenuItems />
      </UIKitUserMenu>
    )
  }

  return <ConnectWalletButton scale="sm" />
}

export default UserMenu
