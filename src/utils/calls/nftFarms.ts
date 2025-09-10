import { parseUnits } from '@ethersproject/units'
import { DEFAULT_GAS_LIMIT, DEFAULT_TOKEN_DECIMAL } from 'config'
import { callWithEstimateGas } from 'utils/calls'

const options = {
  gasLimit: DEFAULT_GAS_LIMIT,
}

export const stakeNftFarm = async (
  masterChefContract,
  pid,
  collectionAddresses,
  tokenIds,
  gasPrice,
  isSmartNftPool,
  performanceFee
) => {
  const stakePriceWei = performanceFee ? parseUnits(performanceFee, 'ether') : 0;
  const stakeParams = isSmartNftPool ? [collectionAddresses, tokenIds] : [pid, tokenIds];
  return callWithEstimateGas(masterChefContract, 'stakeAll', stakeParams, {
    value: stakePriceWei,
    gasPrice,
  });
};


export const unstakeNftFarm = async (
  masterChefContract,
  pid,
  collectionAddresses,
  tokenIds,
  gasPrice,
  isSmartNftPool
) => {
  const stakeParams = isSmartNftPool ? [collectionAddresses, tokenIds] : [pid, tokenIds];
  try {
    return await callWithEstimateGas(masterChefContract, 'unstakeAll', stakeParams, {
      gasPrice,
    })
  } catch (err) {
    // Final fallback with a larger manual gas limit sized by number of NFTs
    const perItem = 160000
    const base = 300000
    const cap = 3_000_000
    const len = Array.isArray(tokenIds) ? tokenIds.length : 1
    const manualGasLimit = Math.min(base + perItem * len, cap)

    return masterChefContract.unstakeAll(
      ...stakeParams,
      {
        gasPrice,
        gasLimit: manualGasLimit,
      },
    )
  }
}

export const harvestNftFarm = async (masterChefContract, pid, gasPrice, isSmartNftPool) => {
  const stakeParams = isSmartNftPool ? [] : [pid];
  return callWithEstimateGas(masterChefContract, 'harvest', stakeParams, {
    gasPrice,
  })
}
