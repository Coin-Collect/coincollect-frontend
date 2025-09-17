import { useCallback, useMemo } from 'react'
import BigNumber from 'bignumber.js'
import useWeb3React from 'hooks/useWeb3React'
import { useFarms, usePollFarmsWithUserData } from 'state/nftFarms/hooks'
import { harvestNftFarm } from 'utils/calls'
import { useCoinCollectNftStake } from 'hooks/useContract'
import { useGasPrice } from 'state/user/hooks'
import useCatchTxError from 'hooks/useCatchTxError'
import { useAppDispatch } from 'state'
import { fetchFarmUserDataAsync } from 'state/nftFarms'
import { useTranslation } from 'contexts/Localization'
import useToast from 'hooks/useToast'
import { ToastDescriptionWithTx } from 'components/Toast'
import { BIG_ZERO } from 'utils/bigNumber'
import { getSmartNftStakeContract } from 'utils/contractHelpers'
import { DeserializedNftFarm } from 'state/types'

export interface ProfileDashboardData {
  pendingRewards?: BigNumber | null
  stakedBalance?: BigNumber | null
  isLoading: boolean
  onHarvestAll?: () => Promise<void>
  isHarvestingAll: boolean
  canHarvest: boolean
}

const useProfileDashboardData = (accountAddress?: string): ProfileDashboardData => {
  const { account, library } = useWeb3React()
  const isConnectedAccount = Boolean(
    account && accountAddress && account.toLowerCase() === accountAddress.toLowerCase(),
  )

  usePollFarmsWithUserData()
  const { data: farms, userDataLoaded } = useFarms()
  const coinCollectNftStakeContract = useCoinCollectNftStake()
  const gasPrice = useGasPrice()
  const { fetchWithCatchTxError, loading: isHarvestingAll } = useCatchTxError()
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  const { toastSuccess } = useToast()

  const { pendingRewards, stakedBalance, harvestableFarms } = useMemo(() => {
    if (!isConnectedAccount) {
      return {
        pendingRewards: null,
        stakedBalance: null,
        harvestableFarms: [] as DeserializedNftFarm[],
      }
    }

    let totalPending = new BigNumber(0)
    let totalStaked = new BigNumber(0)
    const farmsWithRewards: DeserializedNftFarm[] = []

    farms.forEach((farm) => {
      const earnings = farm?.userData?.earnings ?? BIG_ZERO
      const staked = farm?.userData?.stakedBalance ?? BIG_ZERO

      totalPending = totalPending.plus(earnings)
      totalStaked = totalStaked.plus(staked)

      if (earnings.gt(0)) {
        farmsWithRewards.push(farm)
      }
    })

    return {
      pendingRewards: totalPending,
      stakedBalance: totalStaked,
      harvestableFarms: farmsWithRewards,
    }
  }, [farms, isConnectedAccount])

  const handleHarvestAll = useCallback(async () => {
    if (!isConnectedAccount || harvestableFarms.length === 0 || !account) {
      return
    }

    const pids: number[] = []

    for (const farm of harvestableFarms) {
      const isSmartPool = Boolean(farm.contractAddresses)
      const contract = isSmartPool
        ? library
          ? getSmartNftStakeContract(farm.pid, library.getSigner())
          : null
        : coinCollectNftStakeContract

      if (!contract) {
        continue
      }

      // eslint-disable-next-line no-await-in-loop
      const receipt = await fetchWithCatchTxError(() =>
        harvestNftFarm(contract, farm.pid, gasPrice, isSmartPool),
      )

      if (receipt?.status) {
        toastSuccess(
          `${t('Harvested')}!`,
          <ToastDescriptionWithTx txHash={receipt.transactionHash}>
            {t('Your %symbol% earnings have been sent to your wallet!', { symbol: 'COLLECT' })}
          </ToastDescriptionWithTx>,
        )
        pids.push(farm.pid)
      }
    }

    if (pids.length > 0) {
      dispatch(fetchFarmUserDataAsync({ account, pids }))
    }
  }, [
    account,
    coinCollectNftStakeContract,
    dispatch,
    fetchWithCatchTxError,
    gasPrice,
    harvestableFarms,
    isConnectedAccount,
    library,
    toastSuccess,
    t,
  ])

  return {
    pendingRewards,
    stakedBalance,
    isLoading: isConnectedAccount ? !userDataLoaded : false,
    onHarvestAll: isConnectedAccount ? handleHarvestAll : undefined,
    isHarvestingAll,
    canHarvest: isConnectedAccount && harvestableFarms.length > 0,
  }
}

export default useProfileDashboardData
