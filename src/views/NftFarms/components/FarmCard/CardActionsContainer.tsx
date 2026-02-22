import { AutoRenewIcon, Button, Flex, HelpIcon, LightningIcon, Text, useModal, useTooltip } from '@pancakeswap/uikit'
import BigNumber from 'bignumber.js'
import ConnectWalletButton from 'components/ConnectWalletButton'
import { ToastDescriptionWithTx } from 'components/Toast'
import { useTranslation } from 'contexts/Localization'
import { useErc721CollectionContract } from 'hooks/useContract'
import useToast from 'hooks/useToast'
import useCatchTxError from 'hooks/useCatchTxError'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import formatRewardAmount from 'utils/formatRewardAmount'
import tokens from 'config/constants/tokens'
import { Token } from '@coincollect/sdk'

const Action = styled.div`
  padding-top: 16px;
`

const EarnedHelpWrap = styled.span`
  display: inline-flex;
  align-items: center;
  cursor: pointer;
`

const TooltipTokenRow = styled(Flex)`
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const TooltipTokenLabel = styled(Flex)`
  align-items: center;
  gap: 6px;
`

const TooltipTokenImage = styled.img`
  width: 13px;
  height: 13px;
  min-width: 13px;
  min-height: 13px;
  border-radius: 50%;
  object-fit: cover;
`

const TooltipTokenFallback = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.14);
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 7px;
  font-weight: 800;
  text-transform: uppercase;
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

const REWARD_SYMBOL_ICON_MAP: Record<string, string> = {
  SHIB: '/images/games/tokens/shib-min.png',
  ELON: '/images/games/tokens/elon-min.png',
  BONK: '/images/games/tokens/bonk.png',
  RADAR: '/images/tokens/0xdCb72AE4d5dc6Ae274461d57E65dB8D50d0a33AD.png',
}

const RewardTooltipTokenIcon: React.FC<{ token: string; tokenMeta?: Token }> = ({ token, tokenMeta }) => {
  const tokenSymbol = String(token).toUpperCase()
  const tokenAddress = tokenMeta?.address
  const iconCandidates = [
    REWARD_SYMBOL_ICON_MAP[tokenSymbol],
    tokenAddress ? `/images/tokens/${tokenAddress}.svg` : '',
    tokenAddress ? `/images/tokens/${tokenAddress}.png` : '',
  ].filter(Boolean)
  const [iconIndex, setIconIndex] = useState(0)
  const iconSrc = iconCandidates[iconIndex]

  if (iconSrc) {
    return <TooltipTokenImage src={iconSrc} alt={`${token} icon`} onError={() => setIconIndex((prev) => prev + 1)} />
  }

  return <TooltipTokenFallback>{String(token).slice(0, 1)}</TooltipTokenFallback>
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
  const dailyRewardAmount = farm.apr !== undefined && farm.apr !== null ? new BigNumber(farm.apr) : new BigNumber(0)
  const dailyRewardDisplay = displayApr ?? formatRewardAmount(dailyRewardAmount)
  const tokenBySymbol = useMemo(
    () =>
      Object.values(tokens).reduce<Record<string, Token>>((acc, token) => {
        if (token?.symbol) {
          acc[String(token.symbol).toUpperCase()] = token as Token
        }
        return acc
      }, {}),
    [],
  )
  const { targetRef, tooltip, tooltipVisible } = useTooltip(
    <>
      <Text bold fontSize="13px" mb="2px">
        Daily Rewards
      </Text>
      <TooltipTokenRow>
        <TooltipTokenLabel>
          <RewardTooltipTokenIcon token={earnLabel} tokenMeta={farm.earningToken as Token} />
          <Text fontSize="12px" lineHeight="1.2">
            {earnLabel}
          </Text>
        </TooltipTokenLabel>
        <Text bold fontSize="12px" lineHeight="1.2">
          {dailyRewardDisplay}
        </Text>
      </TooltipTokenRow>

      {sideRewards.map((reward, index) => (
        <TooltipTokenRow key={index}>
          <TooltipTokenLabel>
            <RewardTooltipTokenIcon token={reward.token} tokenMeta={tokenBySymbol[String(reward.token).toUpperCase()]} />
            <Text fontSize="12px" lineHeight="1.2">
              {reward.token}
            </Text>
          </TooltipTokenLabel>
          <Text bold fontSize="12px" lineHeight="1.2">
            {formatRewardAmount(dailyRewardAmount.multipliedBy(reward.percentage).dividedBy(100))}
          </Text>
        </TooltipTokenRow>
      ))}
      <Text mt="4px" fontSize="10px" color="textSubtle" lineHeight="1.25">
        *Based on the NFT with highest <LightningIcon width="11px" height="11px" /> earning power.
      </Text>
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
      <StyledActionButton mt="-4px"
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
        isFinished={farm.isFinished}
      />
    )
  }


  return (
    <Action>
      {stakedBalance?.gt(0) && (
        <>
          <HarvestAction
            earnings={earnings}
            pid={pid}
            earnLabel={earnLabel}
            sideRewards={sideRewards}
            earningToken={farm.earningToken}
            header={
              <>
                <Text bold textTransform="uppercase" color="secondary" fontSize="12px" pr="4px">
                  {sideRewards.length == 0 ? "COLLECT" : "REWARDS"}
                </Text>
                <Text bold textTransform="uppercase" color="textSubtle" fontSize="12px">
                  {t('Earned')}
                </Text>
                {displayApr && (
                  <Flex>
                    <EarnedHelpWrap ref={targetRef}>
                      <HelpIcon ml="2px" width="18px" height="18px" color="textSubtle" />
                    </EarnedHelpWrap>
                  </Flex>
                )}
                {tooltipVisible && tooltip}
              </>
            }
          />
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
