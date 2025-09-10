import { AutoRenewIcon, Button, Flex, HelpIcon, LightningIcon, Text, useModal, useTooltip } from '@pancakeswap/uikit'
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
import { getDisplayApr } from 'views/NftFarms/Farms'
import Balance from 'components/Balance'

const Action = styled.div`
  padding-top: 16px;
`

const StyledActionButton = styled(Button)`
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  height: 48px;
  background: ${({ theme, variant }) => 
    variant === 'primary' 
      ? `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryBright} 100%)`
      : theme.colors.tertiary
  };
  border: 2px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-color: ${({ theme }) => theme.colors.primary};
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
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
  const [collectionOption, setCollectionOption] = useState<number | null>(null)
  const [task, setTask] = useState<string | null>(null)
  const { pid, nftAddresses } = farm
  const { allowance, tokenBalance, stakedBalance, earnings } = farm.userData || {}
  const smartNftPoolAddress = farm.contractAddresses ? getAddress(farm.contractAddresses) : null
  const earnLabel = farm.earningToken ? farm.earningToken.symbol : t('COLLECT')
  const sideRewards = farm.sideRewards ? farm.sideRewards : []
  const atLeastOneApproved = allowance?.some((allowance) => allowance) ?? false
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


  const { onApprove } = useApproveNftFarm(nftContract, smartNftPoolAddress || undefined)


  const handleApprove = useCallback(async () => {
    const receipt = await fetchWithCatchTxError(() => {
      return onApprove()
    })
    if (receipt?.status) {
      toastSuccess(t('Contract Enabled'), <ToastDescriptionWithTx txHash={receipt.transactionHash} />)
      dispatch(fetchFarmUserDataAsync({ account: account!, pids: [pid] }) as any)

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
      setTask(task)
      setCollectionOption(collectionId)
    },
    [pid, collectionOption],
  )

  const [onPresentCollectionModal] = useModal(
    <CollectionSelectModal
      onCollectionSelect={handleCollectionChange}
      pid={pid}
    />,
  )

  const displayApr = getDisplayApr(farm.apr)
  const { targetRef, tooltip, tooltipVisible } = useTooltip(
    <>
      <Text bold>Daily Rewards</Text>
      <Text>
        {earnLabel}:
        <Text ml="3px" style={{ display: 'inline-block' }} bold>
          {displayApr}
        </Text>
      </Text>

      {sideRewards.map((reward, index) => (
        <Text key={index}>
          {reward.token}:
          <Text ml="3px" style={{ display: 'inline-block' }} bold>
            <Balance bold value={Number(displayApr) * (reward.percentage / 100)} />
          </Text>
        </Text>
      ))}
      <Text mt={1} small color='primary'>*Calculated based on the NFT with the highest <LightningIcon />earning power</Text>
    </>,
    {
      placement: 'top',
    },
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
      dispatch(fetchFarmUserDataAsync({ account: account!, pids: [pid] }) as any);
    }
  };
  const [onPresentDeposit] = useModal(
    <DepositModal
      max={tokenBalance ?? new BigNumber(0)}
      stakingLimit={farm.stakingLimit ?? new BigNumber(0)}
      stakedBalance={stakedBalance || new BigNumber(0)}
      onConfirm={handleStake}
      tokenName={farm.lpSymbol}
      lpPrice={new BigNumber(0)}
      lpLabel={lpLabel}
      apr={farm.apr || 0}
      addLiquidityUrl={addLiquidityUrl}
      cakePrice={cakePrice}
      pid={collectionOption ? collectionOption : pid}
    />,
  )


  // =====/Duplicate Use Codes=====

  const renderApprovalOrStakeButton = () => {
    return stakedBalance?.eq(0) || pendingTx ? (
      <StyledActionButton mt="8px"
        width="100%"
        variant="primary"
        isLoading={pendingTx}
        endIcon={pendingTx ? <AutoRenewIcon spin color="currentColor" /> : null}
        onClick={smartNftPoolAddress ? onPresentCollectionModal : handleApprove}
        disabled={farm.isFinished}
      >
        {smartNftPoolAddress ? pendingTx ? task === "approve" ? "Confirming" : "Staking" : t('Click to Stake Now') : t('Enable Contract')}
      </StyledActionButton>
    ) : (
      <StakeAction
        stakedBalance={stakedBalance}
        tokenBalance={tokenBalance}
        stakingLimit={farm.stakingLimit}
        tokenName={farm.lpSymbol}
        pid={collectionOption && collectionOption > 0 ? collectionOption : pid}
        mainPid={pid}
        apr={farm.apr}
        lpLabel={lpLabel}
        cakePrice={cakePrice}
        addLiquidityUrl={addLiquidityUrl}
        onClickStake={smartNftPoolAddress ? onPresentCollectionModal : null}
        pendingTx={pendingTx}
      />
    )
  }


  return (
    <Action>
      {stakedBalance?.gt(0) && (
        <>
          <Flex>
            <Text bold textTransform="uppercase" color="secondary" fontSize="12px" pr="4px">
              {sideRewards.length == 0 ? "COLLECT" : "REWARDS"}
            </Text>
            <Text bold textTransform="uppercase" color="textSubtle" fontSize="12px">
              {t('Earned')}
            </Text>
            {displayApr && (
              <Flex>
                <span ref={targetRef}>
                  <HelpIcon ml="4px" width="20px" height="20px" color="textSubtle" />
                </span>
              </Flex>
            )}
            {tooltipVisible && tooltip}
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
        </>
      )}
      {!account ? <ConnectWalletButton mt="8px" width="100%" /> : renderApprovalOrStakeButton()}
    </Action>
  );

}

export default CardActions
