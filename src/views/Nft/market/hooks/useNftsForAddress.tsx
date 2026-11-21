import { useMemo } from 'react'
import isEmpty from 'lodash/isEmpty'
import { useGetCollections } from 'state/nftMarket/hooks'
import { NftLocation, TokenIdWithCollectionAddress } from 'state/nftMarket/types'
import { Profile } from 'state/types'
import { getCompleteAccountNftData } from 'state/nftMarket/helpers'
import { isAddress } from 'utils'
import useSWR from 'swr'
import { FetchStatus } from 'config/constants/types'
import { laggyMiddleware } from 'hooks/useSWRContract'

const useNftsForAddress = (account: string | null | undefined, profile: Profile | undefined, isProfileFetching: boolean) => {
  const { data: collections } = useGetCollections()

  const profileNftTokenId = profile?.tokenId?.toString()
  const profileNftCollectionAddress = profile?.collectionAddress

  const profileNftWithCollectionAddress = useMemo<TokenIdWithCollectionAddress | undefined>(() => {
    if (profileNftTokenId && profileNftCollectionAddress) {
      return {
        tokenId: profileNftTokenId,
        collectionAddress: profileNftCollectionAddress,
        nftLocation: NftLocation.PROFILE,
      }
    }
    return undefined
  }, [profileNftTokenId, profileNftCollectionAddress])

  const { status, data, mutate } = useSWR(
    !isProfileFetching && !isEmpty(collections) && isAddress(account) ? [account, 'userNfts'] : null,
    async () => account && collections ? getCompleteAccountNftData(account, collections, profileNftWithCollectionAddress) : [],
    { use: [laggyMiddleware] },
  )

  return { nfts: data ?? [], isLoading: status !== FetchStatus.Fetched, refresh: mutate }
}

export default useNftsForAddress
