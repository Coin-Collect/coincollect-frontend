import { AddIcon, AutoRenewIcon, Button, Heading, IconButton, MinusIcon, Skeleton, Text, useModal } from '@pancakeswap/uikit'
import { useWeb3React } from '@web3-react/core'
import ConnectWalletButton from 'components/ConnectWalletButton'
import { ToastDescriptionWithTx } from 'components/Toast'
import { useTranslation } from 'contexts/Localization'
import { useErc721CollectionContract } from 'hooks/useContract'
import useToast from 'hooks/useToast'
import useCatchTxError from 'hooks/useCatchTxError'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppDispatch } from 'state'
import { fetchFarmUserDataAsync } from 'state/nftFarms'
import { useFarmUser, useLpTokenPrice, usePriceCakeBusd } from 'state/nftFarms/hooks'
import styled from 'styled-components'
import { getAddress } from 'utils/addressHelpers'
import { NftFarmWithStakedValue } from 'views/NftFarms/components/FarmCard/FarmCard'
import useApproveNftFarm from '../../../hooks/useApproveFarm'
import useStakeFarms from '../../../hooks/useStakeFarms'
import useUnstakeFarms from '../../../hooks/useUnstakeFarms'
import DepositModal from '../../DepositModal'
import WithdrawModal from '../../WithdrawModal'
import { ActionContainer, ActionContent, ActionTitles } from './styles'
import nftFarmsConfig from 'config/constants/nftFarms'
import CollectionSelectModal from 'components/CollectionSelectModal/CollectionSelectModal'

const IconButtonWrapper = styled.div`
  display: flex;
`

interface StackedActionProps extends NftFarmWithStakedValue {
  userDataReady: boolean
  lpLabel?: string
  displayApr?: string
}

const Staked: React.FunctionComponent<StackedActionProps> = ({
  pid,
  stakingLimit,
  apr,
  multiplier,
  lpSymbol,
  lpLabel,
  nftAddresses,
  userDataReady,
  displayApr,
  contractAddresses,
}) => {
  const { t } = useTranslation()
  const { toastSuccess } = useToast()
  const { fetchWithCatchTxError, loading: pendingTx } = useCatchTxError()
  const [collectionOption, setCollectionOption] = useState(null)
  const [task, setTask] = useState(null)
  const { account } = useWeb3React()
  const { allowance, tokenBalance, stakedBalance } = useFarmUser(pid)
  const smartNftPoolAddress = contractAddresses ? getAddress(contractAddresses) : null
  const { onStake } = useStakeFarms(pid)
  const { onUnstake } = useUnstakeFarms(pid)
  const router = useRouter()
  const lpPrice = useLpTokenPrice(lpSymbol)
  const cakePrice = usePriceCakeBusd()

  const atLeastOneApproved = allowance.some((allowance) => allowance)
  const isApproved = account && atLeastOneApproved

  const apyModalLink = "/nfts/collections"

  const useDidMountEffect = (func, deps) => {
    const didMount = useRef(false);

    useEffect(() => {
      if (didMount.current) func();
      else didMount.current = true;
    }, deps)

  }

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

  const handleUnstake = async (selectedNftList: { collectionAddress: string; tokenId: number }[]) => {
    const receipt = await fetchWithCatchTxError(() => {
      const tokenIds = selectedNftList.map((selectedNft) => selectedNft.tokenId);
      const collectionAddresses = selectedNftList.map((selectedNft) => selectedNft.collectionAddress);
      return onUnstake(collectionAddresses, tokenIds)
    })
    if (receipt?.status) {
      toastSuccess(
        `${t('Unstaked')}!`,
        <ToastDescriptionWithTx txHash={receipt.transactionHash}>
          {t('Your earnings have also been harvested to your wallet')}
        </ToastDescriptionWithTx>,
      )
      dispatch(fetchFarmUserDataAsync({ account, pids: [pid] }))
    }
  }


  const [onPresentDeposit] = useModal(
    <DepositModal
      max={tokenBalance}
      stakingLimit={stakingLimit}
      lpPrice={lpPrice}
      lpLabel={lpLabel}
      apr={apr}
      displayApr={displayApr}
      stakedBalance={stakedBalance}
      onConfirm={handleStake}
      tokenName={lpSymbol}
      multiplier={multiplier}
      addLiquidityUrl={apyModalLink}
      cakePrice={cakePrice}
      pid={collectionOption ? collectionOption : pid}
    />,
  )
  const [onPresentWithdraw] = useModal(
    <WithdrawModal max={stakedBalance} onConfirm={handleUnstake} tokenName={lpSymbol} pid={pid} />,
  )

  const alternativeCollectionPool = collectionOption ?? 0 > 0 ? nftFarmsConfig.find(farm => farm.pid === collectionOption) : null
  const nftAddress = getAddress(alternativeCollectionPool ? alternativeCollectionPool.nftAddresses : nftAddresses)
  const nftContract = useErc721CollectionContract(nftAddress)

  const dispatch = useAppDispatch()
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
      const optionId = collectionId > 4 ? 0 : collectionId
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

  if (!account) {
    return (
      <ActionContainer>
        <ActionTitles>
          <Text bold textTransform="uppercase" color="textSubtle" fontSize="12px">
            {t('Start Staking')}
          </Text>
        </ActionTitles>
        <ActionContent>
          <ConnectWalletButton width="100%" />
        </ActionContent>
      </ActionContainer>
    )
  }

  if (isApproved && !pendingTx) {
    if (stakedBalance.gt(0)) {
      return (
        <ActionContainer>
          <ActionTitles>

            {smartNftPoolAddress ? (
              <Text bold textTransform="uppercase" color="secondary" fontSize="12px">
                Staked NFT Count
              </Text>
            ) : (
              <>
                <Text bold textTransform="uppercase" color="secondary" fontSize="12px" pr="4px">
                  {lpSymbol.replace('CoinCollect', '')}
                </Text>
                <Text bold textTransform="uppercase" color="textSubtle" fontSize="12px">
                  {t('Staked')}
                </Text>
              </>
            )}

          </ActionTitles>
          <ActionContent>
            <div>
              <Heading>{stakedBalance.toNumber()}</Heading>
            </div>
            <IconButtonWrapper>
              <IconButton variant="secondary" onClick={onPresentWithdraw} mr="6px">
                <MinusIcon color="primary" width="14px" />
              </IconButton>
              <IconButton
                variant="secondary"
                onClick={smartNftPoolAddress ? onPresentCollectionModal : onPresentDeposit}
                disabled={['history', 'archived'].some((item) => router.pathname.includes(item))}
              >
                <AddIcon color="primary" width="14px" />
              </IconButton>
            </IconButtonWrapper>
          </ActionContent>
        </ActionContainer>
      )
    }

    return (
      <ActionContainer>
        <ActionTitles>
          <Text bold textTransform="uppercase" color="textSubtle" fontSize="12px" pr="4px">
            {t('Stake')}
          </Text>
          <Text bold textTransform="uppercase" color="secondary" fontSize="12px">
            {lpSymbol}
          </Text>
        </ActionTitles>
        <ActionContent>
          <Button
            width="100%"
            onClick={smartNftPoolAddress ? onPresentCollectionModal : onPresentDeposit}
            variant="secondary"
            isLoading={pendingTx}
            endIcon={pendingTx ? <AutoRenewIcon spin color="currentColor" /> : null}
            disabled={['history', 'archived'].some((item) => router.pathname.includes(item))}
          >
            {smartNftPoolAddress ? pendingTx ? task === "approve" ? "Confirming" : "Staking" : t('Click to Stake Now') : t('Enable Contract')}
          </Button>
        </ActionContent>
      </ActionContainer>
    )
  }

  if (!userDataReady) {
    return (
      <ActionContainer>
        <ActionTitles>
          <Text bold textTransform="uppercase" color="textSubtle" fontSize="12px">
            {t('Start Staking')}
          </Text>
        </ActionTitles>
        <ActionContent>
          <Skeleton width={180} marginBottom={28} marginTop={14} />
        </ActionContent>
      </ActionContainer>
    )
  }

  return (
    <ActionContainer>
      <ActionTitles>
        <Text bold textTransform="uppercase" color="textSubtle" fontSize="12px">
          {t('Enable and Stake')}
        </Text>
      </ActionTitles>
      <ActionContent>
        <Button
          width="100%"
          isLoading={pendingTx}
          endIcon={pendingTx ? <AutoRenewIcon spin color="currentColor" /> : null}
          onClick={smartNftPoolAddress ? onPresentCollectionModal : handleApprove}
          variant="secondary"
        >
          {smartNftPoolAddress ? pendingTx ? task === "approve" ? "Confirming" : "Staking" : t('Click to Stake Now') : t('Enable Contract')}
        </Button>
      </ActionContent>
    </ActionContainer>
  )
}

export default Staked
