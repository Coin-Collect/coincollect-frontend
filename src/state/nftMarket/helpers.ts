import { gql, request } from 'graphql-request'
import { stringify } from 'querystring'
import { API_NFT, GRAPH_API_NFTMARKET } from 'config/constants/endpoints'
import { multicallPolygonv1, multicallv2 } from 'utils/multicall'
import erc721Abi from 'config/abi/erc721.json'
import range from 'lodash/range'
import uniq from 'lodash/uniq'
import { pancakeBunniesAddress } from 'views/Nft/market/constants'
import {
  ApiCollection,
  ApiCollections,
  ApiResponseCollectionTokens,
  ApiResponseSpecificToken,
  AskOrderType,
  Collection,
  CollectionMarketDataBaseFields,
  NftActivityFilter,
  NftLocation,
  NftToken,
  TokenIdWithCollectionAddress,
  TokenMarketData,
  Transaction,
  AskOrder,
  ApiSingleTokenData,
  NftAttribute,
  ApiTokenFilterResponse,
  ApiCollectionsResponse,
  MarketEvent,
  Activity,
} from './types'
import { getBaseNftFields, getBaseTransactionFields, getCollectionBaseFields } from './queries'
import BigNumber from 'bignumber.js'
import useSWR from 'swr'
import { FetchStatus } from 'config/constants/types'
import { isAddress } from 'utils'

/**
 * API HELPERS
 */

/**
 * Fetch static data from all collections using the API
 * @returns
 */
export const getCollectionsApi = async (): Promise<ApiCollectionsResponse | null> => {
  const res = await fetch(`${API_NFT}/collections`)
  if (res.ok) {
    const json = await res.json()
    return json
  }
  console.error('Failed to fetch NFT collections', res.statusText)
  return null
}

/**
 * Fetch NFTs based on ownerAddress and collectionAddress parameters using the API
 * @param {string} ownerAddress - The owner's Ethereum address.
 * @param {string} collectionAddress - The collection's Ethereum address.
 * @returns {Promise<BigNumber[]>} - The response from the API or null if an error occurs.
 */
 export const walletOfOwnerApi = async (
  ownerAddress: string,
  collectionAddresses: string[]
): Promise<Array<{
  tokenId: BigNumber;
  media?: { original?: string; thumbnail?: string };
  collectionAddress: string;
}>> => {
  // Normalize addresses for network detection
  const mumbaiCollections = [
    "0xf2149E6B11638BAEf791e3E66ac7E6469328e840",
    "0x28BC2B247aeE27d7d592FA51D5BfEFFf479C4A63",
  ].map((a) => a.toLowerCase())
  const provided = (collectionAddresses || []).map((a) => a?.toLowerCase?.()).filter(Boolean)
  // If all provided are known mumbai test collections, use mumbai; otherwise default to mainnet
  const isMumbai = provided.length > 0 && provided.every((addr) => mumbaiCollections.includes(addr))
  const network = isMumbai ? 'mumbai' : 'mainnet'

  // Use Alchemy v3 getNFTsForOwner with pagination and higher page size
  const baseUrl = `https://polygon-${network}.g.alchemy.com/nft/v3/w_1-F8BIeLkGtlMHR8BczL7Ko7NNTiZ4/getNFTsForOwner`
  const contractAddressesParam = collectionAddresses.map((address) => `contractAddresses[]=${address}`).join('&')

  const results: Array<{ tokenId: BigNumber; media?: { original?: string; thumbnail?: string }; collectionAddress: string }> = []
  const seen = new Set<string>()

  let pageKey: string | undefined
  try {
    do {
      const queryParams = `?owner=${ownerAddress}&${contractAddressesParam}&withMetadata=true&pageSize=100${pageKey ? `&pageKey=${pageKey}` : ''}`
      const fullUrl = `${baseUrl}${queryParams}`
      const res = await fetch(fullUrl)
      if (!res.ok) {
        console.error('Failed to fetch NFTs', res.statusText)
        break
      }

      const json = await res.json()
      const owned = Array.isArray(json?.ownedNfts) ? json.ownedNfts : Array.isArray(json?.nfts) ? json.nfts : []

      for (const item of owned) {
        const rawTokenId: string | undefined = item?.id?.tokenId ?? item?.tokenId
        if (!rawTokenId) continue

        // Parse decimal or hex tokenId
        let formattedTokenId: BigNumber
        if (rawTokenId.startsWith('0x')) {
          formattedTokenId = new BigNumber(rawTokenId.slice(2), 16)
        } else {
          formattedTokenId = new BigNumber(rawTokenId, 10)
        }
        if (!formattedTokenId || !formattedTokenId.isFinite()) continue

        const collectionAddress: string | undefined = item?.contract?.address ?? item?.contractAddress
        if (!collectionAddress) continue

        const key = `${collectionAddress.toLowerCase()}-${formattedTokenId.toFixed()}`
        if (seen.has(key)) continue
        seen.add(key)

        const imageUrl: string = item?.media?.[0]?.gateway ?? item?.image?.originalUrl ?? ''
        const media = imageUrl ? { original: imageUrl, thumbnail: imageUrl } : undefined

        results.push({ tokenId: formattedTokenId, media, collectionAddress })
      }

      pageKey = json?.pageKey
    } while (pageKey)
  } catch (error) {
    console.error('Failed to fetch NFTs via Alchemy v3 API', error)
  }

  return results
}

export const getLastMintedNft = async (
  ownerAddress: string,
  collectionAddress: string,
  chainId: number
): Promise<any> => {
  const network = chainId == 80001 ? 'mumbai' : 'mainnet';
  const baseUrl = `https://polygon-${network}.g.alchemy.com/nft/v3/w_1-F8BIeLkGtlMHR8BczL7Ko7NNTiZ4/getNFTsForOwner`;
  const queryParams = `?owner=${ownerAddress}&contractAddresses[]=${collectionAddress}&withMetadata=true&orderBy=transferTime&pageSize=1`;
  const fullUrl = `${baseUrl}${queryParams}`;

  const res = await fetch(fullUrl);
  if (res.ok) {
    const json = await res.json();
    return json.ownedNfts.map(item => ({ "name": item.name, "image": item.image.originalUrl }));
  }

  console.error('Failed to fetch NFTs', res.statusText);
  return null;
}

/**
 * Fetch NFT minting activities
 * @param {string} collectionAddress - The collection's Ethereum address.
 * @returns {Promise<BigNumber[]>} - The response from the API or null if an error occurs.
 */
export const mintingActivityApi = async (
  collectionAddress: string
): Promise<any[] | null> => {
  const mumbaiCollections = ["0xf2149E6B11638BAEf791e3E66ac7E6469328e840", "0x28BC2B247aeE27d7d592FA51D5BfEFFf479C4A63"];
  const normalizedAddress = collectionAddress?.toLowerCase?.();
  const network = normalizedAddress && mumbaiCollections.some((addr) => addr.toLowerCase() === normalizedAddress) ? 'mumbai' : 'mainnet';
  const baseUrl = `https://polygon-${network}.g.alchemy.com/v2/w_1-F8BIeLkGtlMHR8BczL7Ko7NNTiZ4`;
  
  const payload = {
    "id": 1,
    "jsonrpc": "2.0",
    "method": "alchemy_getAssetTransfers",
    "params": [
      {
        "fromBlock": "0x0",
        "toBlock": "latest",
        "withMetadata": true,
        "excludeZeroValue": true,
        "maxCount": "0x3",
        "fromAddress": "0x0000000000000000000000000000000000000000",
        "contractAddresses": [
                              "0x569B70fc565AFba702d9e77e75FD3e3c78F57eeD",
                              "0x0B8E7D22CE826f1228a82525b8779dBdD9E24B80",
                              "0x0a846Dd40152d6fE8CB4DE4107E0b063B6D6b3F9",
                              "0x117D6870e6dE9faBcB40C34CceDD5228C63e3a1e",
                              "0x2E1cF0960Fc9Ece56f53bf58351d175cd1867b2c",
                              "0x7B1Ead5f2d144D6F8b0eDD3090cB7713A615C3C5",
                              "0x7121D40FDe5F2a82674262b8601DEcd9E066C936",
                              "0x446f52447C1bf0613b782A0A9707100655EF6A28",
                              "0xB2e4ab09684a4850d3271C53D39D68C9afA4785E",
                              "0x79C55f7f25b16D33A9C3352a332cbe6F375f7076",
                              "0x334a3EBA14Bf369132B7A77CA0B09cfd0761D9d2",
                              "0x589C351d8836177BfD0F6d8A5f7Bd3aA9DfBB70C"
                            ],
        "category": ["erc721"],
        "order": "desc"
      }
    ]
  };

  const headers = {
    "accept": "application/json",
    "content-type": "application/json"
  };

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const responseData = await response.json();
      const transfers = Array.isArray(responseData?.result?.transfers) ? responseData.result.transfers : [];

      if (transfers.length > 0) {
        const transfersWithNames = await Promise.all(
          transfers.map(async (transfer) => {
            if (transfer?.asset) {
              return transfer;
            }

            const contractAddress = transfer?.rawContract?.address;
            const rawTokenId = transfer?.tokenId ?? transfer?.erc721TokenId;
            if (!contractAddress || rawTokenId === undefined || rawTokenId === null) {
              return transfer;
            }

            let tokenIdParam: string | null = null;
            try {
              const tokenIdString =
                typeof rawTokenId === 'string' ? rawTokenId : rawTokenId?.toString?.();
              if (!tokenIdString) {
                return transfer;
              }
              tokenIdParam = new BigNumber(tokenIdString).toString(10);
            } catch (tokenIdError) {
              console.error('Failed to parse tokenId for metadata lookup', tokenIdError);
              return transfer;
            }

            if (!tokenIdParam) {
              return transfer;
            }

            const metadataUrl = `https://polygon-${network}.g.alchemy.com/nft/v3/w_1-F8BIeLkGtlMHR8BczL7Ko7NNTiZ4/getNFTMetadata?contractAddress=${contractAddress}&tokenId=${tokenIdParam}`;

            try {
              const metadataResponse = await fetch(metadataUrl);
              if (metadataResponse.ok) {
                const metadataJson = await metadataResponse.json();
                const assetName =
                  metadataJson?.name ??
                  metadataJson?.title ??
                  metadataJson?.raw?.metadata?.name ??
                  metadataJson?.contract?.name ??
                  null;

                if (assetName) {
                  return {
                    ...transfer,
                    asset: assetName,
                  };
                }
              } else {
                console.error('Failed to fetch NFT metadata:', metadataResponse.statusText);
              }
            } catch (metadataError) {
              console.error('Error fetching NFT metadata:', metadataError);
            }

            return transfer;
          }),
        );

        responseData.result.transfers = transfersWithNames;
      }

      return responseData;
    } else {
      console.error('Failed to fetch activities:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error occurred:', error);
    return null;
  }
}

const fetchCollectionsTotalSupply = async (collections: ApiCollection[]): Promise<number[]> => {
  const totalSupplyCalls = collections.map((collection) => ({
    address: collection.address.toLowerCase(),
    name: 'totalSupply',
  }))
  if (totalSupplyCalls.length > 0) {
    const totalSupplyRaw = await multicallPolygonv1(erc721Abi, totalSupplyCalls)
    // TODO: Deploy multicallv2 and activate instead of v1
    //const totalSupplyRaw = await multicallv2(erc721Abi, totalSupplyCalls, { requireSuccess: false })
    const totalSupply = totalSupplyRaw.flat()
    return totalSupply.map((totalCount) => (totalCount ? totalCount.toNumber() : 0))
  }
  return []
}

/** TODO: Deactivated thegraph data fetching functions, activate later 
 * Fetch all collections data by combining data from the API (static metadata) and the Subgraph (dynamic market data)
 */
export const getCollections = async (): Promise<Record<string, Collection>> => {
  try {
    const [collections, /*collectionsMarket*/] = await Promise.all([getCollectionsApi(), /*getCollectionsSg()*/])
    const collectionApiData: ApiCollection[] = collections?.data ?? []
    /*
    const collectionsTotalSupply = await fetchCollectionsTotalSupply(collectionApiData)
    const collectionApiDataCombinedOnChain = collectionApiData.map((collection, index) => {
      const totalSupplyFromApi = Number(collection.totalSupply) || 0
      const totalSupplyFromOnChain = collectionsTotalSupply[index]
      return {
        ...collection,
        totalSupply: Math.max(totalSupplyFromApi, totalSupplyFromOnChain).toString(),
      }
    })
    */
    // @ts-ignore
    return collectionApiData /*combineCollectionData(collectionApiDataCombinedOnChain, collectionsMarket)*/
  } catch (error) {
    console.error('Unable to fetch data:', error)
    return {}
  }
}

/**
 * Fetch collection data by combining data from the API (static metadata) and the Subgraph (dynamic market data)
 */
export const getCollection = async (collectionAddress: string): Promise<Record<string, Collection> | null> => {
  try {
    const [collection, collectionMarket] = await Promise.all([
      getCollectionApi(collectionAddress),
      getCollectionSg(collectionAddress),
    ])

    if (!collection || !collectionMarket) {
      return null
    }

    const collectionsTotalSupply = await fetchCollectionsTotalSupply([collection])
    const totalSupplyFromApi = Number(collection.totalSupply) || 0
    const totalSupplyFromOnChain = collectionsTotalSupply[0]
    const collectionApiDataCombinedOnChain = {
      ...collection,
      totalSupply: Math.max(totalSupplyFromApi, totalSupplyFromOnChain).toString(),
    }

    return combineCollectionData([collectionApiDataCombinedOnChain], [collectionMarket])
  } catch (error) {
    console.error('Unable to fetch data:', error)
    return null
  }
}

/**
 * Fetch static data from a collection using the API
 * @returns
 */
export const getCollectionApi = async (collectionAddress: string): Promise<ApiCollection | null> => {
  const res = await fetch(`${API_NFT}/collections/${collectionAddress}`)
  if (res.ok) {
    const json = await res.json()
    return json.data
  }
  console.error(`API: Failed to fetch NFT collection ${collectionAddress}`, res.statusText)
  return null
}

/**
 * Fetch static data for all nfts in a collection using the API
 * @param collectionAddress
 * @param size
 * @param page
 * @returns
 */
export const getNftsFromCollectionApi = async (
  collectionAddress: string,
  size = 100,
  page = 1,
): Promise<ApiResponseCollectionTokens | null> => {
  const isPBCollection = collectionAddress.toLowerCase() === pancakeBunniesAddress.toLowerCase()
  const requestPath = `${API_NFT}/collections/${collectionAddress}/tokens${
    !isPBCollection ? `?page=${page}&size=${size}` : ``
  }`

  const res = await fetch(requestPath)
  if (res.ok) {
    const data = await res.json()
    return data
  }
  console.error(`API: Failed to fetch NFT tokens for ${collectionAddress} collection`, res.statusText)
  return null
}

/**
 * Fetch a single NFT using the API
 * @param collectionAddress
 * @param tokenId
 * @returns NFT from API
 */
export const getNftApi = async (
  collectionAddress: string,
  tokenId: string,
): Promise<ApiResponseSpecificToken['data'] | null> => {
  const res = await fetch(`${API_NFT}/collections/${collectionAddress}/tokens/${tokenId}`)
  if (res.ok) {
    const json = await res.json()
    return json.data
  }

  console.error(`API: Can't fetch NFT token ${tokenId} in ${collectionAddress}`, res.status)
  return null
}

/**
 * Fetch a list of NFT from different collections
 * @param from Array of { collectionAddress: string; tokenId: string }
 * @returns Array of NFT from API
 */
export const getNftsFromDifferentCollectionsApi = async (
  from: { collectionAddress: string; tokenId: string }[],
): Promise<NftToken[]> => {
  const promises = from.map(async (nft) => {
    try {
      return await getNftApi(nft.collectionAddress, nft.tokenId)
    } catch {
      return null
    }
  })
  const responses = await Promise.all(promises)
  // Sometimes API can't find some tokens (e.g. 404 response)
  // at least return the ones that returned successfully
  const validResponses: Array<{ response: NonNullable<Awaited<ReturnType<typeof getNftApi>>>, originalIndex: number }> = []
  responses.forEach((resp, index) => {
    if (resp) {
      validResponses.push({ response: resp, originalIndex: index })
    }
  })
  
  return validResponses.map(({ response: res, originalIndex }) => ({
    tokenId: res.tokenId,
    name: res.name,
    collectionName: res.collection.name,
    collectionAddress: from[originalIndex].collectionAddress,
    description: res.description,
    attributes: res.attributes,
    createdAt: res.createdAt,
    updatedAt: res.updatedAt,
    image: res.image,
  }))
}

/**
 * SUBGRAPH HELPERS
 */

/**
 * Fetch market data from a collection using the Subgraph
 * @returns
 */
export const getCollectionSg = async (collectionAddress: string): Promise<CollectionMarketDataBaseFields | null> => {
  try {
    if (!collectionAddress) {
      return null
    }
    const res = await request(
      GRAPH_API_NFTMARKET,
      gql`
        query getCollectionData($collectionAddress: String!) {
          collection(id: $collectionAddress) {
            ${getCollectionBaseFields()}
          }
        }
      `,
      { collectionAddress: collectionAddress.toLowerCase() },
    )
    return res.collection || null
  } catch (error) {
    console.error('Failed to fetch collection', error)
    return null
  }
}

/**
 * Fetch market data from all collections using the Subgraph
 * @returns
 */
export const getCollectionsSg = async (): Promise<CollectionMarketDataBaseFields[]> => {
  try {
    const res = await request(
      GRAPH_API_NFTMARKET,
      gql`
        {
          collections {
            ${getCollectionBaseFields()}
          }
        }
      `,
    )
    return res.collections || []
  } catch (error) {
    console.error('Failed to fetch NFT collections', error)
    return []
  }
}

/**
 * Fetch market data for nfts in a collection using the Subgraph
 * @param collectionAddress
 * @param first
 * @param skip
 * @returns
 */
export const getNftsFromCollectionSg = async (
  collectionAddress: string,
  first = 1000,
  skip = 0,
): Promise<TokenMarketData[]> => {
  // Squad to be sorted by tokenId as this matches the order of the paginated API return. For PBs - get the most recent,
  if (!collectionAddress) {
    return []
  }
  const isPBCollection = collectionAddress.toLowerCase() === pancakeBunniesAddress.toLowerCase()

  try {
    const res = await request(
      GRAPH_API_NFTMARKET,
      gql`
        query getNftCollectionMarketData($collectionAddress: String!) {
          collection(id: $collectionAddress) {
            id
            nfts(orderBy:${isPBCollection ? 'updatedAt' : 'tokenId'}, skip: $skip, first: $first) {
             ${getBaseNftFields()}
            }
          }
        }
      `,
      { collectionAddress: collectionAddress.toLowerCase(), skip, first },
    )
    return res.collection?.nfts || []
  } catch (error) {
    console.error('Failed to fetch NFTs from collection', error)
    return []
  }
}

/**
 * Fetch market data for PancakeBunnies NFTs by bunny id using the Subgraph
 * @param bunnyId - bunny id to query
 * @param existingTokenIds - tokens that are already loaded into redux
 * @returns
 */
export const getNftsByBunnyIdSg = async (
  bunnyId: string,
  existingTokenIds: string[],
  orderDirection: 'asc' | 'desc',
): Promise<TokenMarketData[]> => {
  try {
    if (!bunnyId) {
      return []
    }
    const where =
      existingTokenIds.length > 0
        ? { otherId: bunnyId, isTradable: true, tokenId_not_in: existingTokenIds }
        : { otherId: bunnyId, isTradable: true }
    const res = await request(
      GRAPH_API_NFTMARKET,
      gql`
        query getNftsByBunnyIdSg($collectionAddress: String!, $where: NFT_filter, $orderDirection: String!) {
          nfts(first: 30, where: $where, orderBy: currentAskPrice, orderDirection: $orderDirection) {
            ${getBaseNftFields()}
          }
        }
      `,
      {
        collectionAddress: pancakeBunniesAddress.toLowerCase(),
        where,
        orderDirection,
      },
    )
    return res.nfts || []
  } catch (error) {
    console.error(`Failed to fetch collection NFTs for bunny id ${bunnyId}`, error)
    return []
  }
}

/**
 * Fetch market data for PancakeBunnies NFTs by bunny id using the Subgraph
 * @param bunnyId - bunny id to query
 * @param existingTokenIds - tokens that are already loaded into redux
 * @returns
 */
export const getMarketDataForTokenIds = async (
  collectionAddress: string,
  existingTokenIds: string[],
): Promise<TokenMarketData[]> => {
  try {
    if (!collectionAddress || existingTokenIds.length === 0) {
      return []
    }
    const res = await request(
      GRAPH_API_NFTMARKET,
      gql`
        query getMarketDataForTokenIds($collectionAddress: String!, $where: NFT_filter) {
          collection(id: $collectionAddress) {
            id
            nfts(first: 1000, where: $where) {
              ${getBaseNftFields()}
            }
          }
        }
      `,
      {
        collectionAddress: collectionAddress.toLowerCase(),
        where: { tokenId_in: existingTokenIds },
      },
    )
    return res.collection?.nfts || []
  } catch (error) {
    console.error(`Failed to fetch market data for NFTs stored tokens`, error)
    return []
  }
}

export const getNftsMarketData = async (
  where = {},
  first = 1000,
  orderBy = 'id',
  orderDirection: 'asc' | 'desc' = 'desc',
  skip = 0,
): Promise<TokenMarketData[]> => {
  try {
    const res = await request(
      GRAPH_API_NFTMARKET,
      gql`
        query getNftsMarketData($first: Int, $skip: Int!, $where: NFT_filter, $orderBy: NFT_orderBy, $orderDirection: OrderDirection) {
          nfts(where: $where, first: $first, orderBy: $orderBy, orderDirection: $orderDirection, skip: $skip) {
            ${getBaseNftFields()}
            transactionHistory {
              ${getBaseTransactionFields()}
            }
          }
        }
      `,
      { where, first, skip, orderBy, orderDirection },
    )

    return res.nfts || []
  } catch (error) {
    console.error('Failed to fetch NFTs market data', error)
    return []
  }
}

export const getAllPancakeBunniesLowestPrice = async (bunnyIds: string[]): Promise<Record<string, number>> => {
  try {
    const singlePancakeBunnySubQueries = bunnyIds.map(
      (
        bunnyId,
      ) => `b${bunnyId}:nfts(first: 1, where: { otherId: ${bunnyId}, isTradable: true }, orderBy: currentAskPrice, orderDirection: asc) {
        currentAskPrice
      }
    `,
    )
    const rawResponse: Record<string, { currentAskPrice: string }[]> = await request(
      GRAPH_API_NFTMARKET,
      gql`
        query getAllPancakeBunniesLowestPrice {
          ${singlePancakeBunnySubQueries}
        }
      `,
    )
    return Object.keys(rawResponse).reduce((lowestPricesData, subQueryKey) => {
      const bunnyId = subQueryKey.split('b')[1]
      return {
        ...lowestPricesData,
        [bunnyId]:
          rawResponse[subQueryKey].length > 0 ? parseFloat(rawResponse[subQueryKey][0].currentAskPrice) : Infinity,
      }
    }, {})
  } catch (error) {
    console.error('Failed to fetch PancakeBunnies lowest prices', error)
    return {}
  }
}

export const getAllPancakeBunniesRecentUpdatedAt = async (bunnyIds: string[]): Promise<Record<string, number>> => {
  try {
    const singlePancakeBunnySubQueries = bunnyIds.map(
      (
        bunnyId,
      ) => `b${bunnyId}:nfts(first: 1, where: { otherId: ${bunnyId}, isTradable: true }, orderBy: updatedAt, orderDirection: desc) {
        updatedAt
      }
    `,
    )
    const rawResponse: Record<string, { updatedAt: string }[]> = await request(
      GRAPH_API_NFTMARKET,
      gql`
        query getAllPancakeBunniesLowestPrice {
          ${singlePancakeBunnySubQueries}
        }
      `,
    )
    return Object.keys(rawResponse).reduce((updatedAtData, subQueryKey) => {
      const bunnyId = subQueryKey.split('b')[1]
      return {
        ...updatedAtData,
        [bunnyId]: rawResponse[subQueryKey].length > 0 ? Number(rawResponse[subQueryKey][0].updatedAt) : -Infinity,
      }
    }, {})
  } catch (error) {
    console.error('Failed to fetch PancakeBunnies latest market updates', error)
    return {}
  }
}

/**
 * Returns the lowest price of any NFT in a collection
 */
export const getLowestPriceInCollection = async (collectionAddress: string) => {
  try {
    if (!collectionAddress) {
      return 0
    }
    const response = await getNftsMarketData(
      { collection: collectionAddress.toLowerCase(), isTradable: true },
      1,
      'currentAskPrice',
      'asc',
    )

    if (response.length === 0) {
      return 0
    }

    const [nftSg] = response
    return parseFloat(nftSg.currentAskPrice)
  } catch (error) {
    console.error(`Failed to lowest price NFTs in collection ${collectionAddress}`, error)
    return 0
  }
}

/**
 * Fetch user trading data for buyTradeHistory, sellTradeHistory and askOrderHistory from the Subgraph
 * @param where a User_filter where condition
 * @returns a UserActivity object
 */
export const getUserActivity = async (
  address: string,
): Promise<{ askOrderHistory: AskOrder[]; buyTradeHistory: Transaction[]; sellTradeHistory: Transaction[] }> => {
  try {
    if (!address) {
      return {
        askOrderHistory: [],
        buyTradeHistory: [],
        sellTradeHistory: [],
      }
    }
    const res = await request(
      GRAPH_API_NFTMARKET,
      gql`
        query getUserActivity($address: String!) {
          user(id: $address) {
            buyTradeHistory(first: 250, orderBy: timestamp, orderDirection: desc) {
              ${getBaseTransactionFields()}
              nft {
                ${getBaseNftFields()}
              }
            }
            sellTradeHistory(first: 250, orderBy: timestamp, orderDirection: desc) {
              ${getBaseTransactionFields()}
              nft {
                ${getBaseNftFields()}
              }
            }
            askOrderHistory(first: 500, orderBy: timestamp, orderDirection: desc) {
              id
              block
              timestamp
              orderType
              askPrice
              nft {
                ${getBaseNftFields()}
              }
            }
          }
        }
      `,
      { address },
    )

    return {
      askOrderHistory: res.user?.askOrderHistory || [],
      buyTradeHistory: res.user?.buyTradeHistory || [],
      sellTradeHistory: res.user?.sellTradeHistory || []
    }
  } catch (error) {
    console.error('Failed to fetch user Activity', error)
    return {
      askOrderHistory: [],
      buyTradeHistory: [],
      sellTradeHistory: [],
    }
  }
}

export const getCollectionActivity = async (
  address: string,
  nftActivityFilter: NftActivityFilter,
  itemPerQuery,
): Promise<{ askOrders?: AskOrder[]; transactions?: Transaction[] }> => {
  const getAskOrderEvent = (orderType: MarketEvent): AskOrderType => {
    switch (orderType) {
      case MarketEvent.CANCEL:
        return AskOrderType.CANCEL
      case MarketEvent.MODIFY:
        return AskOrderType.MODIFY
      case MarketEvent.NEW:
        return AskOrderType.NEW
      default:
        return AskOrderType.MODIFY
    }
  }

  const isFetchAllCollections = address === ''

  const hasCollectionFilter = nftActivityFilter.collectionFilters.length > 0

  const collectionFilterGql = !isFetchAllCollections
    ? `collection: ${JSON.stringify(address)}`
    : hasCollectionFilter
    ? `collection_in: ${JSON.stringify(nftActivityFilter.collectionFilters)}`
    : ``

  const askOrderTypeFilter = nftActivityFilter.typeFilters
    .filter((marketEvent) => marketEvent !== MarketEvent.SELL)
    .map((marketEvent) => getAskOrderEvent(marketEvent))

  const askOrderIncluded = nftActivityFilter.typeFilters.length === 0 || askOrderTypeFilter.length > 0

  const askOrderTypeFilterGql =
    askOrderTypeFilter.length > 0 ? `orderType_in: ${JSON.stringify(askOrderTypeFilter)}` : ``

  const transactionIncluded =
    nftActivityFilter.typeFilters.length === 0 ||
    nftActivityFilter.typeFilters.some(
      (marketEvent) => marketEvent === MarketEvent.BUY || marketEvent === MarketEvent.SELL,
    )

  let askOrderQueryItem = itemPerQuery / 2
  let transactionQueryItem = itemPerQuery / 2

  if (!askOrderIncluded || !transactionIncluded) {
    askOrderQueryItem = !askOrderIncluded ? 0 : itemPerQuery
    transactionQueryItem = !transactionIncluded ? 0 : itemPerQuery
  }

  const askOrderGql = askOrderIncluded
    ? `askOrders(first: ${askOrderQueryItem}, orderBy: timestamp, orderDirection: desc, where:{
            ${collectionFilterGql}, ${askOrderTypeFilterGql}
          }) {
              id
              block
              timestamp
              orderType
              askPrice
              seller {
                id
              }
              nft {
                ${getBaseNftFields()}
              }
          }`
    : ``

  const transactionGql = transactionIncluded
    ? `transactions(first: ${transactionQueryItem}, orderBy: timestamp, orderDirection: desc, where:{
            ${collectionFilterGql}
          }) {
            ${getBaseTransactionFields()}
              nft {
                ${getBaseNftFields()}
              }
          }`
    : ``

  try {
    const res = await request(
      GRAPH_API_NFTMARKET,
      gql`
        query getCollectionActivity {
          ${askOrderGql}
          ${transactionGql}
        }
      `,
    )

    return res || { askOrders: [], transactions: [] }
  } catch (error) {
    console.error('Failed to fetch collection Activity', error)
    return {
      askOrders: [],
      transactions: [],
    }
  }
}


export const getTokenActivity = async (
  tokenId: string,
  collectionAddress: string,
): Promise<{ askOrders: AskOrder[]; transactions: Transaction[] }> => {
  try {
    if (!tokenId || !collectionAddress) {
      return { askOrders: [], transactions: [] }
    }
    const res = await request(
      GRAPH_API_NFTMARKET,
      gql`
        query getCollectionActivity($tokenId: BigInt!, $address: ID!) {
          nfts(where:{tokenId: $tokenId, collection: $address}) {
            transactionHistory(orderBy: timestamp, orderDirection: desc) {
              ${getBaseTransactionFields()}
                nft {
                  ${getBaseNftFields()}
                }
            }
            askHistory(orderBy: timestamp, orderDirection: desc) {
                id
                block
                timestamp
                orderType
                askPrice
                seller {
                  id
                }
                nft {
                  ${getBaseNftFields()}
                }
            }
          }
        }
      `,
      { tokenId, address: collectionAddress },
    )

    const nfts = res.nfts || []
    if (nfts.length > 0) {
      return { askOrders: nfts[0].askHistory || [], transactions: nfts[0].transactionHistory || [] }
    }
    return { askOrders: [], transactions: [] }
  } catch (error) {
    console.error('Failed to fetch token Activity', error)
    return {
      askOrders: [],
      transactions: [],
    }
  }
}

/**
 * Get the most recently listed NFTs
 * @param first Number of nfts to retrieve
 * @returns NftTokenSg[]
 */
export const getLatestListedNfts = async (first: number): Promise<TokenMarketData[]> => {
  try {
    const res = await request(
      GRAPH_API_NFTMARKET,
      gql`
        query getLatestNftMarketData($first: Int) {
          nfts(where: { isTradable: true }, orderBy: updatedAt , orderDirection: desc, first: $first) {
            ${getBaseNftFields()}
            collection {
              id
            }
          }
        }
      `,
      { first },
    )

    return res.nfts
  } catch (error) {
    console.error('Failed to fetch NFTs market data', error)
    return []
  }
}

/**
 * Filter NFTs from a collection
 * @param collectionAddress
 * @returns
 */
export const fetchNftsFiltered = async (
  collectionAddress: string,
  filters: Record<string, string | number>,
): Promise<ApiTokenFilterResponse | null> => {
  const res = await fetch(`${API_NFT}/collections/${collectionAddress}/filter?${stringify(filters)}`)

  if (res.ok) {
    const data = await res.json()
    return data
  }

  console.error(`API: Failed to fetch NFT collection ${collectionAddress}`, res.statusText)
  return null
}

/**
 * OTHER HELPERS
 */

export const getMetadataWithFallback = (apiMetadata: ApiResponseCollectionTokens['data'], bunnyId: string) => {
  // The fallback is just for the testnet where some bunnies don't exist
  return (
    apiMetadata[bunnyId] ?? {
      name: '',
      description: '',
      collection: { name: 'Pancake Bunnies' },
      image: {
        original: '',
        thumbnail: '',
      },
    }
  )
}

export const getPancakeBunniesAttributesField = (bunnyId: string) => {
  // Generating attributes field that is not returned by API
  // but can be "faked" since objects are keyed with bunny id
  return [
    {
      traitType: 'bunnyId',
      value: bunnyId,
      displayType: null,
    },
  ]
}

export const combineApiAndSgResponseToNftToken = (
  apiMetadata: ApiSingleTokenData,
  marketData: TokenMarketData,
  attributes: NftAttribute[],
) => {
  return {
    tokenId: marketData.tokenId,
    name: apiMetadata.name,
    description: apiMetadata.description,
    collectionName: apiMetadata.collection.name,
    collectionAddress: pancakeBunniesAddress,
    image: apiMetadata.image,
    marketData,
    attributes,
  }
}

export const fetchWalletTokenIdsForCollections = async (
  account: string,
  collections: ApiCollections,
): Promise<TokenIdWithCollectionAddress[]> => {
  const balanceOfCalls = Object.values(collections).map((collection) => {
    const { address: collectionAddress } = collection
    return {
      address: collectionAddress,
      name: 'balanceOf',
      params: [account],
    }
  })

  const balanceOfCallsResultRaw = await multicallv2(erc721Abi, balanceOfCalls, { requireSuccess: false })
  const balanceOfCallsResult = balanceOfCallsResultRaw.flat()

  const tokenIdCalls = Object.values(collections)
    .map((collection, index) => {
      const balanceOf = balanceOfCallsResult[index]?.toNumber() ?? 0
      const { address: collectionAddress } = collection

      return range(balanceOf).map((tokenIndex) => {
        return {
          address: collectionAddress,
          name: 'tokenOfOwnerByIndex',
          params: [account, tokenIndex],
        }
      })
    })
    .flat()

  const tokenIdResultRaw = await multicallv2(erc721Abi, tokenIdCalls, { requireSuccess: false })
  const tokenIdResult = tokenIdResultRaw.flat()

  const nftLocation = NftLocation.WALLET

  const walletNfts = tokenIdResult.reduce((acc, tokenIdBn, index) => {
    if (tokenIdBn) {
      const { address: collectionAddress } = tokenIdCalls[index]
      acc.push({ tokenId: tokenIdBn.toString(), collectionAddress, nftLocation })
    }
    return acc
  }, [])

  return walletNfts
}

/**
 * Helper to combine data from the collections' API and subgraph
 */
export const combineCollectionData = (
  collectionApiData: ApiCollection[],
  collectionSgData: CollectionMarketDataBaseFields[],
): Record<string, Collection> => {
  const collectionsMarketObj: Record<string, CollectionMarketDataBaseFields> = collectionSgData.reduce(
    (prev, current) => ({ ...prev, [current.id]: { ...current } }),
    {},
  )

  return collectionApiData.reduce((accum, current) => {
    const collectionMarket = collectionsMarketObj[current.address.toLowerCase()]
    const collection: Collection = {
      ...current,
      ...collectionMarket,
    }

    if (current.name) {
      collection.name = current.name
    }

    return {
      ...accum,
      [current.address]: collection,
    }
  }, {})
}

/**
 * Evaluate whether a market NFT is in a users wallet, their profile picture, or on sale
 * @param tokenId string
 * @param tokenIdsInWallet array of tokenIds in wallet
 * @param tokenIdsForSale array of tokenIds on sale
 * @param profileNftId Optional tokenId of users' profile picture
 * @returns NftLocation enum value
 */
export const getNftLocationForMarketNft = (
  tokenId: string,
  tokenIdsInWallet: string[],
  tokenIdsForSale: string[],
  profileNftId?: string,
): NftLocation => {
  if (tokenId === profileNftId) {
    return NftLocation.PROFILE
  }
  if (tokenIdsForSale.includes(tokenId)) {
    return NftLocation.FORSALE
  }
  if (tokenIdsInWallet.includes(tokenId)) {
    return NftLocation.WALLET
  }
  console.error(`Cannot determine location for tokenID ${tokenId}, defaulting to NftLocation.WALLET`)
  return NftLocation.WALLET
}

/**
 * Construct complete TokenMarketData entities with a users' wallet NFT ids and market data for their wallet NFTs
 * @param walletNfts TokenIdWithCollectionAddress
 * @param marketDataForWalletNfts TokenMarketData[]
 * @returns TokenMarketData[]
 */
export const attachMarketDataToWalletNfts = (
  walletNfts: TokenIdWithCollectionAddress[],
  marketDataForWalletNfts: TokenMarketData[],
): TokenMarketData[] => {
  const walletNftsWithMarketData = walletNfts.map((walletNft) => {
    const marketData = marketDataForWalletNfts.find(
      (marketNft) =>
        marketNft.tokenId === walletNft.tokenId &&
        marketNft.collection?.id?.toLowerCase() === walletNft.collectionAddress.toLowerCase(),
    )
    return (
      marketData ?? {
        tokenId: walletNft.tokenId,
        collection: {
          id: walletNft.collectionAddress.toLowerCase(),
        },
        metadataUrl: walletNft.collectionAddress,
        currentSeller: '',
        isTradable: false,
        currentAskPrice: '0',
        latestTradedPriceInBNB: '0',
        tradeVolumeBNB: '0',
        totalTrades: '0',
        otherId: '',
      }
    )
  })
  return walletNftsWithMarketData
}

/**
 * Attach TokenMarketData and location to NftToken
 * @param nftsWithMetadata NftToken[] with API metadata
 * @param nftsForSale  market data for nfts that are on sale (i.e. not in a user's wallet)
 * @param walletNfts market data for nfts in a user's wallet
 * @param tokenIdsInWallet array of token ids in user's wallet
 * @param tokenIdsForSale array of token ids of nfts that are on sale
 * @param profileNftId profile picture token id
 * @returns NFT[]
 */
export const combineNftMarketAndMetadata = (
  nftsWithMetadata: NftToken[],
  nftsForSale: TokenMarketData[],
  walletNfts: TokenMarketData[],
  tokenIdsInWallet: string[],
  tokenIdsForSale: string[],
  profileNftId?: string,
): NftToken[] => {
  const completeNftData = nftsWithMetadata.map<NftToken>((nft) => {
    // Get metadata object
    const isOnSale =
      nftsForSale.filter(
        (forSaleNft) =>
          forSaleNft.tokenId === nft.tokenId &&
          forSaleNft.collection &&
          forSaleNft.collection.id === nft.collectionAddress,
      ).length > 0
    let marketData
    if (isOnSale) {
      marketData = nftsForSale.find(
        (marketNft) =>
          marketNft.collection &&
          marketNft.collection.id === nft.collectionAddress &&
          marketNft.tokenId === nft.tokenId,
      )
    } else {
      marketData = walletNfts.find(
        (marketNft) =>
          marketNft.collection &&
          marketNft.collection.id === nft.collectionAddress &&
          marketNft.tokenId === nft.tokenId,
      )
    }
    const location = getNftLocationForMarketNft(nft.tokenId, tokenIdsInWallet, tokenIdsForSale, profileNftId)
    return { ...nft, marketData, location }
  })
  return completeNftData
}

/**
 * Get in-wallet, on-sale & profile pic NFT metadata, complete with market data for a given account
 * @param account
 * @param collections
 * @param profileNftWithCollectionAddress
 * @returns Promise<NftToken[]>
 */
export const getCompleteAccountNftData = async (
  account: string,
  collections: ApiCollections,
  profileNftWithCollectionAddress?: TokenIdWithCollectionAddress,
): Promise<NftToken[]> => {
  const walletNftIdsWithCollectionAddress = await fetchWalletTokenIdsForCollections(account, collections)
  if (profileNftWithCollectionAddress?.tokenId) {
    walletNftIdsWithCollectionAddress.unshift(profileNftWithCollectionAddress)
  }

  const uniqueCollectionAddresses = uniq(
    walletNftIdsWithCollectionAddress.map((walletNftId) => walletNftId.collectionAddress),
  )

  const walletNftsByCollection = uniqueCollectionAddresses.map((collectionAddress) => {
    return {
      collectionAddress,
      idWithCollectionAddress: walletNftIdsWithCollectionAddress.filter(
        (walletNft) => walletNft.collectionAddress === collectionAddress,
      ),
    }
  })

  const walletMarketDataRequests = walletNftsByCollection.map((walletNftByCollection) => {
    const tokenIdIn = walletNftByCollection.idWithCollectionAddress.map((walletNft) => walletNft.tokenId)
    return getNftsMarketData({
      tokenId_in: tokenIdIn,
      collection: walletNftByCollection.collectionAddress.toLowerCase(),
    })
  })

  const walletMarketDataResponses = await Promise.all(walletMarketDataRequests)
  const walletMarketData = walletMarketDataResponses.flat()

  const walletNftsWithMarketData = attachMarketDataToWalletNfts(walletNftIdsWithCollectionAddress, walletMarketData)

  const walletTokenIds = walletNftIdsWithCollectionAddress
    .filter((walletNft) => {
      // Profile Pic NFT is no longer wanted in this array, hence the filter
      return profileNftWithCollectionAddress?.tokenId !== walletNft.tokenId
    })
    .map((nft) => nft.tokenId)

  const marketDataForSaleNfts = await getNftsMarketData({ currentSeller: account.toLowerCase() })
  const tokenIdsForSale = marketDataForSaleNfts.map((nft) => nft.tokenId)

  const forSaleNftIds = marketDataForSaleNfts.map((nft) => {
    return { collectionAddress: nft.collection?.id || '', tokenId: nft.tokenId }
  })

  const metadataForAllNfts = await getNftsFromDifferentCollectionsApi([
    ...forSaleNftIds,
    ...walletNftIdsWithCollectionAddress,
  ])

  const completeNftData = combineNftMarketAndMetadata(
    metadataForAllNfts,
    marketDataForSaleNfts,
    walletNftsWithMarketData,
    walletTokenIds,
    tokenIdsForSale,
    profileNftWithCollectionAddress?.tokenId,
  )

  return completeNftData
}

/**
 * Fetch distribution information for a collection
 * @returns
 */
export const getCollectionDistributionApi = async <T>(collectionAddress: string): Promise<T | null> => {
  const res = await fetch(`${API_NFT}/collections/${collectionAddress}/distribution`)
  if (res.ok) {
    const data = await res.json()
    return data
  }
  console.error(`API: Failed to fetch NFT collection ${collectionAddress} distribution`, res.statusText)
  return null
}
