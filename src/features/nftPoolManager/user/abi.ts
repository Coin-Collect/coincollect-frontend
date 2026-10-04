/** Narrow ABI for address-native V2 user reads and writes. */
export const v2PoolUserAbi = [
  'function SMART_CHEF_FACTORY() view returns (address)',
  'function stakedToken() view returns (address)',
  'function rewardToken() view returns (address)',
  'function sideRewardTokens(uint256) view returns (address)',
  'function sideRewardPercentage(address) view returns (uint256)',
  'function rewardTokenDecimals(address) view returns (uint256)',
  'function communityCollections(uint256) view returns (address)',
  'function collectionWeights(address) view returns (uint256)',
  'function startBlock() view returns (uint256)',
  'function bonusEndBlock() view returns (uint256)',
  'function participantThreshold() view returns (uint256)',
  'function poolCapacity() view returns (uint256)',
  'function hasUserLimit() view returns (bool)',
  'function userLimit() view returns (bool)',
  'function poolLimitPerUser() view returns (uint256)',
  'function numberBlocksForUserLimit() view returns (uint256)',
  'function performanceFee() view returns (uint256)',
  'function feeTo() view returns (address)',
  'function pendingReward(address) view returns (uint256)',
  'function userInfo(address) view returns (uint256 amount,uint256 nftCount,uint256 rewardDebt)',
  'function balanceOf(address) view returns (uint256)',
  'function tokenOfOwnerByIndex(address,uint256) view returns (address,uint256)',
  'function tokenWeight(address,uint256) view returns (uint256)',
  'function stakeAll(address[],uint256[]) payable',
  'function unstakeAll(address[],uint256[])',
  'function harvest()',
  'function emergencyWithdraw()',
]

export const v2Erc721UserAbi = [
  'function ownerOf(uint256) view returns (address)',
  'function balanceOf(address) view returns (uint256)',
  'function isApprovedForAll(address,address) view returns (bool)',
  'function setApprovalForAll(address,bool)',
  'function supportsInterface(bytes4) view returns (bool)',
  'function tokenOfOwnerByIndex(address,uint256) view returns (uint256)',
  'function tokensOfOwnerBySize(address,uint256,uint256) view returns (uint256[],uint256)',
  'function walletOfOwner(address) view returns (uint256[])',
  'function tokenURI(uint256) view returns (string)',
]

export const v2Erc20UserAbi = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]
