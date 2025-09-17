import { useCallback, useMemo } from 'react'
import useWeb3React from 'hooks/useWeb3React'
import { useProfile } from 'state/profile/hooks'
import useNftsForAddress from 'views/Nft/market/hooks/useNftsForAddress'
import { useFarms } from 'state/nftFarms/hooks'
import { DeserializedNftFarm } from 'state/types'
import { NftToken } from 'state/nftMarket/types'
import { getAddress } from 'utils/addressHelpers'

export interface StakeableFarmWithNfts {
  farm: DeserializedNftFarm
  eligibleNfts: NftToken[]
}

interface UseDashboardResult {
  account?: string | null
  isAccountConnected: boolean
  isLoading: boolean
  stakeableFarms: StakeableFarmWithNfts[]
  totalEligibleNfts: number
  error?: unknown
  refreshWalletNfts: () => Promise<NftToken[] | undefined>
}

const useDashboard = (): UseDashboardResult => {
  const { account } = useWeb3React()
  const { profile, isLoading: isProfileLoading } = useProfile()
  const {
    nfts: walletNfts,
    isLoading: isWalletNftLoading,
    refresh: refreshWalletNfts,
    error: walletError,
  } = useNftsForAddress(account ?? '', profile, isProfileLoading)
  const { data: farms } = useFarms()

  const farmsByPid = useMemo(() => {
    return farms.reduce<Record<number, DeserializedNftFarm>>((acc, farm) => {
      acc[farm.pid] = farm
      return acc
    }, {})
  }, [farms])

  const activeFarms = useMemo(
    () => farms.filter((farm) => !farm.isFinished),
    [farms],
  )

  const walletNftsByCollection = useMemo(() => {
    return walletNfts.reduce<Map<string, NftToken[]>>((acc, nft) => {
      if (!nft?.collectionAddress) {
        return acc
      }
      const key = nft.collectionAddress.toLowerCase()
      const existing = acc.get(key)
      if (existing) {
        existing.push(nft)
      } else {
        acc.set(key, [nft])
      }
      return acc
    }, new Map<string, NftToken[]>())
  }, [walletNfts])

  const stakeableFarms = useMemo<StakeableFarmWithNfts[]>(() => {
    if (!account) {
      return []
    }

    return activeFarms.reduce<StakeableFarmWithNfts[]>((acc, farm) => {
      const acceptedAddresses = new Set<string>()
      const mainCollectionAddress = getAddress(farm.nftAddresses)?.toLowerCase()

      if (mainCollectionAddress) {
        acceptedAddresses.add(mainCollectionAddress)
      }

      farm.supportedCollectionPids?.forEach((pid) => {
        const supportedFarm = farmsByPid[pid]
        if (!supportedFarm) {
          return
        }
        const supportedAddress = getAddress(supportedFarm.nftAddresses)?.toLowerCase()
        if (supportedAddress) {
          acceptedAddresses.add(supportedAddress)
        }
      })

      if (acceptedAddresses.size === 0) {
        return acc
      }

      const eligibleMap = new Map<string, NftToken>()

      acceptedAddresses.forEach((address) => {
        const nftsForAddress = walletNftsByCollection.get(address)
        if (!nftsForAddress) {
          return
        }
        nftsForAddress.forEach((nft) => {
          const nftKey = `${address}:${nft.tokenId}`
          if (!eligibleMap.has(nftKey)) {
            eligibleMap.set(nftKey, nft)
          }
        })
      })

      if (eligibleMap.size === 0) {
        return acc
      }

      const eligibleNfts = Array.from(eligibleMap.values())

      acc.push({ farm, eligibleNfts })
      return acc
    }, [])
  }, [account, activeFarms, farmsByPid, walletNftsByCollection])

  const sortedStakeableFarms = useMemo(() => {
    return [...stakeableFarms].sort((a, b) => b.eligibleNfts.length - a.eligibleNfts.length)
  }, [stakeableFarms])

  const totalEligibleNfts = useMemo(
    () => sortedStakeableFarms.reduce((total, entry) => total + entry.eligibleNfts.length, 0),
    [sortedStakeableFarms],
  )

  const refreshWalletNftsCallback = useCallback(() => refreshWalletNfts(), [refreshWalletNfts])

  return {
    account,
    isAccountConnected: Boolean(account),
    isLoading: isProfileLoading || isWalletNftLoading,
    stakeableFarms: sortedStakeableFarms,
    totalEligibleNfts,
    error: walletError,
    refreshWalletNfts: refreshWalletNftsCallback,
  }
}

export default useDashboard
