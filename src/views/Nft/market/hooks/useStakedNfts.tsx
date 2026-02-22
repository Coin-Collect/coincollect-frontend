import useWeb3React from 'hooks/useWeb3React'
import axios from 'axios'
import { IPFS_GATEWAY } from 'config'
import { getCoinCollectNftStakeAddress } from 'utils/addressHelpers'
import { useFarmUser } from 'state/nftFarms/hooks'
import { range } from 'lodash'
import { multicallPolygonv1 } from 'utils/multicall'
import coinCollectNftStakeABI from 'config/abi/coinCollectNftStake.json'
import smartNftStakeABI from 'config/abi/smartNftStake.json'
import erc721ABI from 'config/abi/erc721.json'
import BigNumber from 'bignumber.js'
import nftFarmsConfig from 'config/constants/nftFarms'
import { getAddress } from 'utils/addressHelpers'
import useSWR from 'swr'
import { isAddress } from 'utils'
import { FetchStatus } from 'config/constants/types'

const FALLBACK_COLLECTION_NAME = 'Unknown Collection'

export const useStakedNfts = (selectedPid: number) => {
  const { account } = useWeb3React()
  const { stakedBalance } = useFarmUser(selectedPid)
  const nftStakeContractAddress = getCoinCollectNftStakeAddress()

  const nftPool = nftFarmsConfig.filter(({ pid }) => pid == selectedPid)[0]
  const collectionAddress = getAddress(nftPool.nftAddresses)
  const smartNftStakeAddress = nftPool.contractAddresses ? getAddress(nftPool.contractAddresses) : null
  const getFallbackCollectionName = (address: string) => {
    const normalizedAddress = address?.toLowerCase?.()
    const exactFarm = nftFarmsConfig.find((farm) => {
      const farmAddress = farm?.nftAddresses ? getAddress(farm.nftAddresses).toLowerCase() : ''
      return farmAddress === normalizedAddress && farm.pid === selectedPid
    })
    if (exactFarm?.lpSymbol) {
      return exactFarm.lpSymbol
    }

    const firstFarmByAddress = nftFarmsConfig.find((farm) => {
      const farmAddress = farm?.nftAddresses ? getAddress(farm.nftAddresses).toLowerCase() : ''
      return farmAddress === normalizedAddress
    })

    return firstFarmByAddress?.lpSymbol || FALLBACK_COLLECTION_NAME
  }


  const getNfts = async () => {
    try {
      const calls = range(stakedBalance.toNumber()).map((i) => {
        return {
          address: smartNftStakeAddress ?? nftStakeContractAddress,
          name: 'tokenOfOwnerByIndex',
          params: smartNftStakeAddress ? [account, i] : [selectedPid, account, i],
        }
      })

      const rawTokens = await multicallPolygonv1(smartNftStakeAddress ? smartNftStakeABI : coinCollectNftStakeABI, calls)

      const parsedTokenIds = rawTokens.map((token) => {
        if (!smartNftStakeAddress) {
          return { tokenId: new BigNumber(token).toJSON() };
        } else {
          const [tokenAddress, tokenId] = token;
          return {
            tokenId: new BigNumber(tokenId._hex).toJSON(),
            tokenAddress: tokenAddress
          };
        }
      });

      const imageCalls = parsedTokenIds.map((token) => {
        const { tokenId, tokenAddress } = token;
        return {
          address: smartNftStakeAddress ? tokenAddress : collectionAddress,
          name: 'tokenURI',
          params: [tokenId],
        }
      })
      const rawTokenURIs = await multicallPolygonv1(erc721ABI, imageCalls)
      const uniqueCollectionAddresses = [...new Set(
        parsedTokenIds.map((token) => (smartNftStakeAddress ? token.tokenAddress : collectionAddress).toLowerCase())
      )]
      const nameCalls = uniqueCollectionAddresses.map((address) => ({
        address,
        name: 'name',
      }))
      const rawCollectionNames = uniqueCollectionAddresses.length
        ? await multicallPolygonv1(erc721ABI, nameCalls)
        : []
      const collectionNameByAddress = uniqueCollectionAddresses.reduce<Record<string, string>>((acc, address, index) => {
        const rawName = rawCollectionNames[index]?.[0]
        acc[address] = rawName || getFallbackCollectionName(address)
        return acc
      }, {})

      const tokenIdsNumber = await Promise.all(parsedTokenIds.map(async (token, index) => {
        const { tokenId, tokenAddress } = token;
        const nftCollectionAddress = smartNftStakeAddress ? tokenAddress : collectionAddress

        let meta: any = null;
        try {
          //@ts-ignore
          const tokenURI = rawTokenURIs[index][0];
          await new Promise(resolve => setTimeout(resolve, index * 300))
          meta = await axios(tokenURI.replace("ipfs://", `${IPFS_GATEWAY}/`));
        } catch (error) {
          console.log('IPFS link is broken!', error);
        }

        return {
          tokenId: tokenId,
          collectionAddress: nftCollectionAddress,
          image: meta ? meta.data.image.replace("ipfs://", `${IPFS_GATEWAY}/`) : 'images/nfts/no-profile-md.png',
          collectionName: collectionNameByAddress[nftCollectionAddress?.toLowerCase?.()] || FALLBACK_COLLECTION_NAME,
        };
      }));

      return tokenIdsNumber;
    } catch (error) {
      console.log('Error fetching staked NFTs:', error);
      throw error; // Re-throw the error to trigger SWR's error handling
    }
  }

  const { data, status, error, mutate } = useSWR(isAddress(account) ? [account, selectedPid, 'stakedNftList'] : null, async () => getNfts(), {
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      if (retryCount < 3) {
        // Retry the SWR request up to 3 times on error
        setTimeout(() => revalidate({ retryCount: retryCount + 1 }), 1000);
      }
    },
  });

  return { nfts: data ?? [], isLoading: status !== FetchStatus.Fetched, error, revalidateNfts: mutate }
}
