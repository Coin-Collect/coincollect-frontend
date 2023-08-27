import { AutoRenewIcon, Button, Flex, Text, useModal } from '@pancakeswap/uikit'
import BigNumber from 'bignumber.js'
import ConnectWalletButton from 'components/ConnectWalletButton'
import { ToastDescriptionWithTx } from 'components/Toast'
import { useTranslation } from 'contexts/Localization'
import { useErc721CollectionContract } from 'hooks/useContract'
import useToast from 'hooks/useToast'
import useCatchTxError from 'hooks/useCatchTxError'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppDispatch } from 'state'
import { fetchFarmUserDataAsync } from 'state/nftFarms'
import { DeserializedNftFarm } from 'state/types'
import styled from 'styled-components'
import { getAddress } from 'utils/addressHelpers'
import useApproveNftFarm from '../../hooks/useApproveFarm'
import HarvestAction from './HarvestAction'
import StakeAction from './StakeAction'
import nftFarmsConfig from 'config/constants/nftFarms'
import CollectionSelectModal from 'components/CollectionSelectModal/CollectionSelectModal'
import DepositModal from '../DepositModal'
import useStakeFarms from 'views/NftFarms/hooks/useStakeFarms'

const Action = styled.div`
  padding-top: 16px;
`
export interface NftFarmWithStakedValue extends DeserializedNftFarm {
  apr?: number
}

interface FarmCardActionsProps {
  farm: NftFarmWithStakedValue
  account?: string
  addLiquidityUrl?: string
  cakePrice?: BigNumber
  lpLabel?: string
}

const CardActions: React.FC<FarmCardActionsProps> = ({ farm, account, addLiquidityUrl, cakePrice, lpLabel }) => {
  const { t } = useTranslation()
  const { toastSuccess } = useToast()
  const { fetchWithCatchTxError, loading: pendingTx } = useCatchTxError()
  const [collectionOption, setCollectionOption] = useState(null)
  const [task, setTask] = useState(null)
  const { pid, nftAddresses } = farm
  const { allowance, tokenBalance, stakedBalance, earnings } = farm.userData || {}
  const smartNftPoolAddress = farm.contractAddresses ? getAddress(farm.contractAddresses) : null
  const earnLabel = farm.earningToken ? farm.earningToken.symbol : t('COLLECT')
  const sideRewards = farm.sideRewards ? farm.sideRewards : []
  const atLeastOneApproved = allowance.some((allowance) => allowance)
  const isApproved = account && atLeastOneApproved
  const dispatch = useAppDispatch()

  const useDidMountEffect = (func, deps) => {
    const didMount = useRef(false);

    useEffect(() => {
      if (didMount.current) func();
      else didMount.current = true;
    }, deps)

  }

  const alternativeCollectionPool = collectionOption ?? 0 > 0 ? nftFarmsConfig.find(farm => farm.pid === collectionOption) : null
  const nftAddress = getAddress(alternativeCollectionPool ? alternativeCollectionPool.nftAddresses : nftAddresses)
  const nftContract = useErc721CollectionContract(nftAddress)


  const { onApprove } = useApproveNftFarm(nftContract, smartNftPoolAddress)


  const handleApprove = useCallback(async () => {
    const receipt = await fetchWithCatchTxError(() => {
      return onApprove()
    })
    if (receipt?.status) {
      toastSuccess(t('Contract Enabled'), <ToastDescriptionWithTx txHash={receipt.transactionHash} />)
      dispatch(fetchFarmUserDataAsync({ account, pids: [pid] }))
      
      if (smartNftPoolAddress) {
        // Open stake panel automatically
        onPresentDeposit()
      }
      
    }
  }, [onApprove, dispatch, account, pid, t, toastSuccess, fetchWithCatchTxError])


  useDidMountEffect(() => {
    if (collectionOption == null)
      return

    if (task == "approve") {
      handleApprove()
    } else {
      onPresentDeposit()
    }
    setCollectionOption(null)
  }, [collectionOption, task])



  const handleCollectionChange = useCallback(
    (collectionId: number, task: string) => {
      const optionId = (collectionId > 4 && collectionId !== 14) ? 0 : collectionId
      setTask(task)
      setCollectionOption(optionId)
    },
    [pid, collectionOption],
  )

  const [onPresentCollectionModal] = useModal(
    <CollectionSelectModal
      onCollectionSelect={handleCollectionChange}
      pid={pid}
    />,
  )

  // TODO: Duplicate Use Codes
  const { onStake } = useStakeFarms(pid)
  const handleStake = async (selectedNftList: { collectionAddress: string; tokenId: number }[]) => {
    const receipt = await fetchWithCatchTxError(() => {
      const tokenIds = selectedNftList.map((selectedNft) => selectedNft.tokenId);
      const collectionAddresses = selectedNftList.map((selectedNft) => selectedNft.collectionAddress);
      return onStake(collectionAddresses, tokenIds);
    });
    if (receipt?.status) {
      toastSuccess(
        `${t('Staked')}!`,
        <ToastDescriptionWithTx txHash={receipt.transactionHash}>
          {t('Your NFTs have been staked in the pool')}
        </ToastDescriptionWithTx>
      );
      dispatch(fetchFarmUserDataAsync({ account, pids: [pid] }));
    }
  };
  const [onPresentDeposit] = useModal(
    <DepositModal
      max={tokenBalance}
      stakingLimit={farm.stakingLimit}
      stakedBalance={stakedBalance}
      onConfirm={handleStake}
      tokenName={farm.lpSymbol}
      lpPrice={new BigNumber(0)}
      lpLabel={lpLabel}
      apr={farm.apr}
      addLiquidityUrl={addLiquidityUrl}
      cakePrice={cakePrice}
      pid={collectionOption ? collectionOption : pid}
    />,
  )
  

  // =====/Duplicate Use Codes=====

  const renderApprovalOrStakeButton = () => {
    return isApproved && !pendingTx ? (
      <StakeAction
        stakedBalance={stakedBalance}
        tokenBalance={tokenBalance}
        stakingLimit={farm.stakingLimit}
        tokenName={farm.lpSymbol}
        pid={collectionOption ?? 0 > 0 ? collectionOption : pid}
        mainPid={pid}
        apr={farm.apr}
        lpLabel={lpLabel}
        cakePrice={cakePrice}
        addLiquidityUrl={addLiquidityUrl}
        onClickStake={smartNftPoolAddress ? onPresentCollectionModal : null}
        pendingTx={pendingTx}
      />
    ) : (
      <Button mt="8px" 
              width="100%" 
              isLoading={pendingTx} 
              endIcon={pendingTx ? <AutoRenewIcon spin color="currentColor" /> : null}
              onClick={smartNftPoolAddress ? onPresentCollectionModal : handleApprove}
        >
        {smartNftPoolAddress ? pendingTx ? task === "approve" ? "Confirming" : "Staking" : t('Click to Stake Now') : t('Enable Contract')}
      </Button>
    )
  }


  return (
    <Action>
      <Flex>
        <Text bold textTransform="uppercase" color="secondary" fontSize="12px" pr="4px">
          {sideRewards.length == 0 ? "COLLECT" : "REWARDS"}
        </Text>
        <Text bold textTransform="uppercase" color="textSubtle" fontSize="12px">
          {t('Earned')}
        </Text>
      </Flex>
      <HarvestAction earnings={earnings} pid={pid} earnLabel={earnLabel} sideRewards={sideRewards} earningToken={farm.earningToken} />
      <Flex>
        {smartNftPoolAddress ? (
          <Text bold textTransform="uppercase" color="secondary" fontSize="12px">
            Staked NFT Count
          </Text>
        ) : (
          <>
            <Text bold textTransform="uppercase" color="secondary" fontSize="12px" pr="4px">
              {farm.lpSymbol.replace('CoinCollect', '')}
            </Text>
            <Text bold textTransform="uppercase" color="textSubtle" fontSize="12px">
              {t('Staked')}
            </Text>
          </>
        )}
      </Flex>

      {!account ? <ConnectWalletButton mt="8px" width="100%" /> : renderApprovalOrStakeButton()}
    </Action>
  )
}

export default CardActions
