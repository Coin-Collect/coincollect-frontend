import { useWeb3React } from '@web3-react/core'
import useSWR, { KeyedMutator } from 'swr'
import { FetchStatus } from 'config/constants/types'
import { useCoinCollectClaimRewardContract, useCoinCollectClaimRewardV2Contract } from 'hooks/useContract'
import claimConfig from 'config/constants/claim'
import nftFarmsConfig from 'config/constants/nftFarms'
import BigNumber from 'bignumber.js'
import { getAddress, getCoinCollectClaimRewardV2Address } from 'utils/addressHelpers'
import { multicallPolygonv2 } from 'utils/multicall'
import coinCollectClaimRewardAbi from 'config/abi/coinCollectClaimReward.json'
import coinCollectNftAbi from 'config/abi/coinCollectNft.json'
import erc20Abi from 'config/abi/erc20.json'
import { walletOfOwnerApi } from 'state/nftMarket/helpers'

interface CollectionInfo {
  collectionAddress: string;
  nftIds: number[];
  isTargetNft?: boolean;
}

interface UserClaimInfo {
  totalWeights: number;
  remainingClaims: number;
}

interface ClaimInfo {
  claimId: number;
  collections: CollectionInfo[];
  targetCollectionWeight: number;
  nftLimit: number;
  claimedList: boolean[];
}

const getSpecificData = (claimInfo, dataType) => {
  if (dataType == "userClaimInfo") {
    return claimInfo[2]
  } else if (dataType == "rewardBalances") {
    return claimInfo[3]
  } else if (dataType == "targetNftsForClaimIndex") {

    const targetNftsForClaimIndex = []
    for (let i = 0; i < claimInfo[1].length; i += 1) {
      const addressList = Array(claimInfo[1][i][1].length).fill(claimInfo[1][i][0]);
      const nftList = claimInfo[1][i][1].map((nft: BigNumber) => nft.toNumber());
      targetNftsForClaimIndex.push([addressList, nftList])
    }
    return targetNftsForClaimIndex

  } else if (dataType == "communityNfts") {

    const communityNfts = [[], []]
    for (let i = 0; i < claimInfo[0].length; i += 1) {
      const addressList = Array(claimInfo[0][i][1].length).fill(claimInfo[0][i][0]);
      const nftList = claimInfo[0][i][1].map((nft: BigNumber) => nft.toNumber());
      communityNfts[0].push(...addressList)
      communityNfts[1].push(...nftList)
    }
    return communityNfts

  }

}


const getWeightForCollection = (
  {
    claimId,
    collections,
    targetCollectionWeight,
    nftLimit,
    claimedList,

  }: ClaimInfo
) => {

  let totalWeights = 0;
  let claimCount = 0;
  let tokenIndex = 0;
  const communityCollectionWeights = {
    "0x569B70fc565AFba702d9e77e75FD3e3c78F57eeD": 1,
    "0x11DdF94710AD390063357D532042Bd5f23A3fBd6": 1,
    "0x0B8E7D22CE826f1228a82525b8779dBdD9E24B80": 3,
    "0x2c65d5355813D3E1f86d1c9b25DCFF367bBd913D": 3,
    "0x0a846Dd40152d6fE8CB4DE4107E0b063B6D6b3F9": 5,
    "0x117D6870e6dE9faBcB40C34CceDD5228C63e3a1e": 10,
  };

  for (let i = 0; i < collections.length; i++) {
    const collection = collections[i];


    for (let y = 0; y < collection.nftIds.length; y++) {

      if (!claimedList[tokenIndex]) {
        if (collection.isTargetNft) {
          totalWeights += targetCollectionWeight;
        } else {
          totalWeights += communityCollectionWeights[collection.collectionAddress];
        }
        claimCount += 1;

        if (claimCount >= nftLimit) {
          break;
        }
      }

      tokenIndex += 1;

    }

    if (claimCount >= nftLimit) {
      break;
    }


  }

  return [totalWeights, claimCount];

}


const getClaimInfoApi = async (account) => {
  console.log("Started")
  const v2Claims = claimConfig.filter((claim) => claim.version == 2);
  const claimCalls = v2Claims.map((claim) => {
    const { cid } = claim
    return {
      name: 'claims',
      address: getCoinCollectClaimRewardV2Address(),
      params: [cid],
    }

  });
  const rawClaims = await multicallPolygonv2<any>(coinCollectClaimRewardAbi, claimCalls);
  const parsedClaims = rawClaims.map((rawClaim, index) => {
    return {
      cid: v2Claims[index]["cid"],
      nftLimit: v2Claims[index]["nftLimit"],
      rewardToken: rawClaim[0],
      targetCollectionAddress: rawClaim[3],
      targetCollectionWeight: new BigNumber(rawClaim[4]._hex).toJSON(),
      useApi: Boolean(v2Claims[index]["useApi"]),
    }
  });
  console.log("parsedClaims")
  console.log(parsedClaims)


  //=============================================================

  // Get Coincollect nfts
  const communityCollection = nftFarmsConfig.filter((nftFarm) => nftFarm.pid <= 4).reverse();
  const communityCollectionCalls = communityCollection.map((nftFarm) => {
    const { nftAddresses } = nftFarm
    return {
      name: 'walletOfOwner',
      address: getAddress(nftAddresses),
      params: [account],
    }

  });

  const communityNftsRaw = await multicallPolygonv2<any>(coinCollectNftAbi, communityCollectionCalls);
  const communityNftsFlat = communityNftsRaw.flat();
  const communityNfts: CollectionInfo[] = communityNftsFlat.map((communityNfts, index) => {
    const collectionInfo: CollectionInfo = {
      collectionAddress: getAddress(communityCollection[index].nftAddresses),
      nftIds: communityNfts.map((id) => id.toNumber())
    };
    return collectionInfo;
  });
  console.log("communityNfts")
  console.log(communityNfts)


  //=============================================================


  let apiClaims = parsedClaims.filter(claim => claim.useApi);
  let nativeClaims = parsedClaims.filter(claim => !claim.useApi);
  // Get nfts with api if signed on config
  const nativeClaimsTargetNftCalls = nativeClaims.map((claim) => {
    return {
      name: 'walletOfOwner',
      address: claim.targetCollectionAddress,
      params: [account],
    }
  });
  const nativeTargetNftsRaw = await multicallPolygonv2<any>(coinCollectNftAbi, nativeClaimsTargetNftCalls);
  const nativeTargetNfts = nativeTargetNftsRaw.flat();

  const apiTargetNfts = await Promise.all(apiClaims.map(async (claim, index) => {
    const tokenIds = await walletOfOwnerApi(account, claim.targetCollectionAddress);
    return tokenIds;
  }))


  let targetNFTs: CollectionInfo[] = [];
  let apiTargetNftsIndex = 0;
  let nativeTargetNftsIndex = 0;
  parsedClaims.forEach(claim => {

    const nftIdsRaw = claim.useApi ? apiTargetNfts[apiTargetNftsIndex] : nativeTargetNfts[nativeTargetNftsIndex];
    const nftIdsNumber = nftIdsRaw.map((id) => id.toNumber());
    const collectionInfo: CollectionInfo = {
      collectionAddress: claim.targetCollectionAddress,
      nftIds: nftIdsNumber,
      isTargetNft: true,
    };


    targetNFTs.push(collectionInfo);
    if (claim.useApi) {
      apiTargetNftsIndex++;
    } else {
      nativeTargetNftsIndex++;
    }
  });
  console.log("targetNFTs")
  console.log(targetNFTs)


  /*
  No need this, remove later
  const allNfts = [...targetNFTs, ...communityNfts];
  console.log("allNfts")
  console.log(allNfts)
  */
  //=============================================================


  const rewardBalancesCalls = parsedClaims.map((claim) => {
    return {
      name: 'balanceOf',
      address: claim.rewardToken,
      params: [getCoinCollectClaimRewardV2Address()],
    }
  });
  const rewardBalancesRaw = await multicallPolygonv2<any>(erc20Abi, rewardBalancesCalls);
  console.log("rewardBalancesRaw")
  console.log(rewardBalancesRaw)


  //=============================================================


  const walletClaimedCountCalls = parsedClaims.map((claim, index) => {
    return {
      name: 'walletClaimedCount',
      address: getCoinCollectClaimRewardV2Address(),
      params: [0, index, account], // TODO: make loop value zero dynamic
    }
  });

  const walletClaimedCountsRaw = await multicallPolygonv2<any>(coinCollectClaimRewardAbi, walletClaimedCountCalls);
  const walletClaimedCountsFlat = walletClaimedCountsRaw.flat();
  const walletClaimedCountsNumber = walletClaimedCountsFlat.map((claimedCount) => {
    return claimedCount.toNumber()
  });
  console.log("walletClaimedCountsNumber")
  console.log(walletClaimedCountsNumber)


  //=============================================================


  let isClaimedListCalls = [];
  for (let i = 0; i < parsedClaims.length; i++) {
    const claim = parsedClaims[i];
    const allNftsForClaim = [targetNFTs[i], ...communityNfts];
    allNftsForClaim.forEach((collectionInfo) => {

      if (collectionInfo.nftIds.length > 0) {
        collectionInfo.nftIds.forEach((tokenId) => {

          isClaimedListCalls.push({
            name: 'nftRewardsClaimed',
            address: getCoinCollectClaimRewardV2Address(),
            params: [0, claim.cid, collectionInfo.collectionAddress, tokenId],
          });

        });
      }

    });

  }

  const isClaimedListRaw = await multicallPolygonv2<any>(coinCollectClaimRewardAbi, isClaimedListCalls);
  const isClaimedListFlat = isClaimedListRaw.flat();
  console.log("isClaimedListFlat")
  console.log(isClaimedListFlat)

  let isClaimedListSeperated = [];
  let tokenIndex = 0;
  for (let i = 0; i < parsedClaims.length; i++) {
    const claim = parsedClaims[i];
    const allNftsForClaim = [targetNFTs[i], ...communityNfts];
    let isClaimedListForClaim = [];

    allNftsForClaim.forEach((collectionInfo) => {

      if (collectionInfo.nftIds.length > 0) {
        collectionInfo.nftIds.forEach((tokenId, index) => {

          isClaimedListForClaim.push(isClaimedListFlat[tokenIndex]);
          tokenIndex++;

        });
      }

    });
    isClaimedListSeperated.push(isClaimedListForClaim);
  }

  console.log("isClaimedListSeperated")
  console.log(isClaimedListSeperated)

  //=============================================================


  const userClaimInfos: UserClaimInfo[] = parsedClaims.map((claim, index) => {

    let userClaimInfo: UserClaimInfo = {
      totalWeights: 0,
      remainingClaims: 0
    }

    const walletClaimedCount = walletClaimedCountsNumber[index];
    if (walletClaimedCount >= claim.nftLimit) {
      return userClaimInfo;
    }

    let remainingClaimCount = claim.nftLimit - walletClaimedCount;
    userClaimInfo.remainingClaims = remainingClaimCount;

    // Calculate weights
    const [weight, claimedCount] = getWeightForCollection({
      claimId: claim.cid,
      collections: [targetNFTs[index], ...communityNfts],
      targetCollectionWeight: parseInt(claim.targetCollectionWeight),
      nftLimit: remainingClaimCount,
      claimedList: isClaimedListSeperated[index],
    });
    userClaimInfo.totalWeights += weight;
    return userClaimInfo;

  });

  console.log("userClaimInfos")
  console.log(userClaimInfos)

  return [communityNfts, targetNFTs, userClaimInfos, rewardBalancesRaw];
}


const getClaimInfo = async (account, claimRewardContract, claimRewardV2Contract) => {
  
  const claimInfo = await claimRewardContract.getInfo(account);
  //const claimInfo2 = await claimRewardV2Contract.getInfo(account);
  const [communityNfts, targetNFTs, userClaimInfos, rewardBalancesRaw] = await getClaimInfoApi(account);



  try {

    let claimIndex1 = 0;
    let claimIndex2 = 0;
    const claimDetails = claimConfig.map((claim) => {

      const claimIndex = claim.version == 2 ? claimIndex2++ : claimIndex1++;

      if (claim.version == 2) {

      const nftsToClaim: CollectionInfo[] = [targetNFTs[claimIndex], ...communityNfts];
      let nftsToClaimClean = [[], []];
      nftsToClaim.forEach((info) => {
        info.nftIds.forEach((tokenId) => {
          nftsToClaimClean[0].push(info.collectionAddress);
          nftsToClaimClean[1].push(tokenId);
        });
      });


        return {
          ...claim,
          userWeight: userClaimInfos[claimIndex]?.totalWeights,
          remainingClaims: userClaimInfos[claimIndex]?.remainingClaims,
          rewardBalance: new BigNumber(rewardBalancesRaw[claimIndex][0]?._hex).toNumber(),
          nftsToClaim: nftsToClaimClean,
        }

      }

      return {
        ...claim,
        userWeight: new BigNumber(getSpecificData(claimInfo, "userClaimInfo")[claimIndex]?.totalWeights?._hex).toNumber(),
        remainingClaims: new BigNumber(getSpecificData(claimInfo, "userClaimInfo")[claimIndex]?.remainingClaims?._hex).toNumber(),
        rewardBalance: new BigNumber(getSpecificData(claimInfo, "rewardBalances")[claimIndex]?._hex).toNumber(),
        nftsToClaim: [[...getSpecificData(claimInfo, "targetNftsForClaimIndex")[claimIndex]?.[0] ?? [], ...getSpecificData(claimInfo, "communityNfts")[0]], [...getSpecificData(claimInfo, "targetNftsForClaimIndex")[claimIndex]?.[1] ?? [], ...getSpecificData(claimInfo, "communityNfts")[1]]],
      }


    })


    return claimDetails

  } catch (error) {
    console.log(error)
    return null
  }

}

export const useClaimInfo = (): {
  data: any
  isInitialized: boolean
  isLoading: boolean
  refresh: KeyedMutator<any>
} => {
  const { account } = useWeb3React()
  const claimRewardContract = useCoinCollectClaimRewardContract()
  const claimRewardV2Contract = useCoinCollectClaimRewardV2Contract()

  const { data, status, mutate } = useSWR(account ? [account, 'claimInfo'] : null, () => getClaimInfo(account, claimRewardContract, claimRewardV2Contract))

  const isLoading = status === FetchStatus.Fetching
  const isInitialized = status === FetchStatus.Fetched || status === FetchStatus.Failed


  return { data, isInitialized, isLoading, refresh: mutate }
}