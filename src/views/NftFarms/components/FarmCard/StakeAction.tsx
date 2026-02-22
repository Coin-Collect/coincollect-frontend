import { useCallback } from 'react'
import useWeb3React from 'hooks/useWeb3React'
import styled from 'styled-components'
import BigNumber from 'bignumber.js'
import { Button, Flex, Heading, useModal, AutoRenewIcon, AddIcon, MinusIcon } from '@pancakeswap/uikit'
import useToast from 'hooks/useToast'
import useCatchTxError from 'hooks/useCatchTxError'
import Balance from 'components/Balance'
import { ToastDescriptionWithTx } from 'components/Toast'
import { useTranslation } from 'contexts/Localization'
import { useAppDispatch } from 'state'
import { fetchFarmUserDataAsync } from 'state/nftFarms'
import { useRouter } from 'next/router'
import { useLpTokenPrice } from 'state/nftFarms/hooks'
import { getBalanceAmount, getBalanceNumber } from 'utils/formatBalance'
import DepositModal from '../DepositModal'
import WithdrawModal from '../WithdrawModal'
import useUnstakeFarms from '../../hooks/useUnstakeFarms'
import useStakeFarms from '../../hooks/useStakeFarms'

interface FarmCardActionsProps {
  stakedBalance?: BigNumber
  tokenBalance?: BigNumber
  stakingLimit?: BigNumber
  tokenName?: string
  pid?: number // pid can be id of pool of alternative collections
  mainPid?: number // mainPid only keeps id of staking pool
  multiplier?: string
  apr?: number
  displayApr?: string
  addLiquidityUrl?: string
  cakePrice?: BigNumber
  lpLabel?: string
  onClickStake?: any
  pendingTx?: boolean
  isFinished?: boolean
}

const IconButtonWrapper = styled.div`
  display: flex;
  gap: 6px;
`

const ActionChipButton = styled(Button)<{ $stake?: boolean }>`
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  border: 1px solid
    ${({ theme, $stake }) => ($stake ? `${theme.colors.primary}55` : `${theme.colors.textSubtle}55`)};
  background: ${({ theme, $stake }) =>
    $stake ? `${theme.colors.primary}22` : `${theme.colors.textSubtle}15`};
  color: ${({ theme, $stake }) => ($stake ? theme.colors.primary : theme.colors.text)};
`

const StakeAction: React.FC<FarmCardActionsProps> = ({
  stakedBalance,
  tokenBalance,
  stakingLimit,
  tokenName,
  pid,
  mainPid,
  multiplier,
  apr,
  displayApr,
  addLiquidityUrl,
  cakePrice,
  lpLabel,
  onClickStake,
  pendingTx,
  isFinished,
}) => {
  const { t } = useTranslation()
  const { onStake } = useStakeFarms(mainPid)
  const { onUnstake } = useUnstakeFarms(mainPid)
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { account } = useWeb3React()
  const lpPrice = useLpTokenPrice(tokenName)
  const { toastSuccess } = useToast()
  const { fetchWithCatchTxError } = useCatchTxError()

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
          {t('Your tokens have been staked in the pool')}
        </ToastDescriptionWithTx>
      );
      dispatch(fetchFarmUserDataAsync({ account, pids: [mainPid] }));
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
      dispatch(fetchFarmUserDataAsync({ account, pids: [mainPid] }))
    }
  }


  const [onPresentDeposit] = useModal(
    <DepositModal
      max={tokenBalance}
      stakingLimit={stakingLimit}
      stakedBalance={stakedBalance}
      onConfirm={handleStake}
      tokenName={tokenName}
      multiplier={multiplier}
      lpPrice={lpPrice}
      lpLabel={lpLabel}
      apr={apr}
      displayApr={displayApr}
      addLiquidityUrl={addLiquidityUrl}
      cakePrice={cakePrice}
      pid={pid}
    />,
  )
  const [onPresentWithdraw] = useModal(
    <WithdrawModal max={stakedBalance} onConfirm={handleUnstake} tokenName={tokenName} pid={mainPid} />,
  )

  const renderStakingButtons = () => {
    const stakingDisabled = ['history', 'archived'].some((item) => router.pathname.includes(item)) || isFinished

    return stakedBalance.eq(0) ? (
      <Button
        onClick={onClickStake ?? onPresentDeposit}
        endIcon={pendingTx ? <AutoRenewIcon spin color="currentColor" /> : null}
        isLoading={pendingTx}
        disabled={stakingDisabled}
      >
        {pendingTx ? t('Confirming') : t('Stake NFT')}
      </Button>
    ) : (
      <IconButtonWrapper>
        <ActionChipButton variant="tertiary" onClick={onPresentWithdraw}>
          <MinusIcon width="13px" mr="4px" color="currentColor" />
          {t('Unstake')}
        </ActionChipButton>
        <ActionChipButton
          $stake
          variant="tertiary"
          onClick={onClickStake ?? onPresentDeposit}
          disabled={stakingDisabled}
        >
          <AddIcon width="13px" mr="4px" color="currentColor" />
          {t('Stake More')}
        </ActionChipButton>
      </IconButtonWrapper>
    )
  }

  return (
    <Flex justifyContent="space-between" alignItems="center">
      <Flex flexDirection="column" alignItems="flex-start">
        <Heading color={stakedBalance.eq(0) ? 'textDisabled' : 'text'}>{stakedBalance.toNumber()}</Heading>
      </Flex>
      {renderStakingButtons()}
    </Flex>
  )
}

export default StakeAction
