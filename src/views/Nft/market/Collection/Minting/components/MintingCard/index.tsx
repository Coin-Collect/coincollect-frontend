import {
    Box,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    ExpandableLabel,
    ExpandableButton,
    useMatchBreakpoints,
} from '@pancakeswap/uikit'
import useWeb3React from 'hooks/useWeb3React'
import BigNumber from 'bignumber.js'
import { ToastDescriptionWithTx } from 'components/Toast'
import { Ifo, Minting, PoolIds } from 'config/constants/types'
import { useTranslation } from "contexts/Localization"
import useCatchTxError from 'hooks/useCatchTxError'
import { useERC20 } from 'hooks/useContract'
import useIsWindowVisible from 'hooks/useIsWindowVisible'
import { useFastRefreshEffect } from 'hooks/useRefreshEffect'
import useToast from 'hooks/useToast'
import { useEffect, useState } from "react"
import { useCurrentBlock } from 'state/block/hooks'
import styled from "styled-components"
import { IfoRibbon } from "views/Nft/market/Collection/Minting/components/MintingCard/IfoRibbon"
import EnableStatus from 'views/Ifos/components/IfoFoldableCard/types'
import useIfoApprove from 'views/Nft/market/Collection/Minting/hooks/useIfoApprove'
import { PublicIfoData, WalletIfoData } from 'views/Nft/market/Collection/Minting/types'
import MintingPoolCard from './Card'


interface IfoFoldableCardProps {
    ifo: Minting
    publicIfoData: PublicIfoData
    walletIfoData: WalletIfoData
  }
  
const StyledCard = styled(Card)<{ $isCurrent?: boolean }>`
  width: 100%;
  margin: auto;
  border-top-left-radius: 32px;
  border-top-right-radius: 32px;

  ${({ $isCurrent }) =>
    $isCurrent &&
    `
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  > div {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }
  `}

  > div {
    background: ${({ theme, $isCurrent }) => ($isCurrent ? theme.colors.gradients.bubblegum : theme.colors.dropdown)};
  }

  ${({ theme }) => theme.mediaQueries.sm} {
    border-top-left-radius: 32px;
    border-top-right-radius: 32px;

    > div {
      border-top-left-radius: 32px;
      border-top-right-radius: 32px;
    }
  }
`

const Header = styled(CardHeader)<{ ifoId: string; $isCurrent?: boolean }>`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  height: ${({ $isCurrent }) => ($isCurrent ? '64px' : '112px')};
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center;
  border-top-left-radius: 32px;
  border-top-right-radius: 32px;
  background-color: ${({ theme }) => theme.colors.dropdown};
  background-image: ${({ ifoId }) => `url('/images/ifos/${ifoId}-bg.svg'), url('/images/ifos/${ifoId}-bg.png')`};
  ${({ theme }) => theme.mediaQueries.md} {
    height: 112px;
  }
`
const CardsWrapper = styled.div<{ singleCard: boolean; shouldReverse: boolean }>`
  display: grid;
  grid-gap: 32px;
  grid-template-columns: 1fr;
  ${({ theme }) => theme.mediaQueries.xxl} {
    grid-template-columns: ${({ singleCard }) => (singleCard ? '1fr' : '1fr 1fr')};
    justify-items: ${({ singleCard }) => (singleCard ? 'center' : 'unset')};
  }

  > div:nth-child(1) {
    order: ${({ shouldReverse }) => (shouldReverse ? 2 : 1)};
  }

  > div:nth-child(2) {
    order: ${({ shouldReverse }) => (shouldReverse ? 1 : 2)};
  }
`

const StyledCardBody = styled(CardBody)`
  padding: 24px 16px;
  ${({ theme }) => theme.mediaQueries.md} {
    padding: 24px;
  }
`

const StyledCardFooter = styled(CardFooter)`
  padding: 0;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  text-align: center;
`


const StyledNoHatBunny = styled.div<{ $isLive: boolean; $isCurrent?: boolean }>`
  position: absolute;
  left: -24px;
  z-index: 1;
  top: 33px;

  > img {
    width: 78px;
  }

  ${({ theme }) => theme.mediaQueries.sm} {
    top: ${({ $isLive }) => ($isLive ? '46px' : '33px')};
  }
  ${({ theme }) => theme.mediaQueries.md} {
    left: auto;
    top: ${({ $isLive }) => ($isLive ? '61px' : '48px')};
    right: ${({ $isCurrent }) => ($isCurrent ? '17px' : '90px')};

    > img {
      width: 123px;
    }
  }
  ${({ theme }) => theme.mediaQueries.lg} {
    right: ${({ $isCurrent }) => ($isCurrent ? '67px' : '90px')};
  }
  ${({ theme }) => theme.mediaQueries.xxl} {
    right: 90px;
  }
`

const NoHatBunny = ({ isLive, isCurrent }: { isLive?: boolean; isCurrent?: boolean }) => {
    const { isXs, isSm, isMd } = useMatchBreakpoints()
    const isSmallerThanTablet = isXs || isSm || isMd
    if (isSmallerThanTablet && isLive) return null
    return (
      <StyledNoHatBunny $isLive={isLive} $isCurrent={isCurrent}>
        <img
          src={`/images/ifos/assets/bunnypop-${!isSmallerThanTablet ? 'right' : 'left'}.png`}
          width={123}
          height={162}
          alt="bunny"
        />
      </StyledNoHatBunny>
    )
  }

// Active Ifo
export const MintingCurrentCard = ({
    ifo,
    publicIfoData,
    walletIfoData,
  }: {
    ifo: Minting
    publicIfoData: PublicIfoData
    walletIfoData: WalletIfoData
  }) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const { t } = useTranslation()
    const { isMobile } = useMatchBreakpoints()
  
    //const shouldShowBunny = ifo.status === 'live' || ifo.status === 'coming_soon'
    const shouldShowBunny = false
  
    return (
      <>
        {isMobile && (
          <Box
            className="sticky-header"
            position="sticky"
            bottom="48px"
            width="100%"
            zIndex={6}
            maxWidth={['400px', '400px', '400px', '100%']}
          >
            {/*<Header $isCurrent ifoId={ifo.id} />*/}
            <IfoRibbon publicIfoData={publicIfoData} />
            {shouldShowBunny && <NoHatBunny isLive={ifo.status === 'live'} />}
          </Box>
        )}
        <Box position="relative" width="100%" maxWidth={['400px', '400px', '400px', '100%']}>
          {!isMobile && shouldShowBunny && <NoHatBunny isCurrent isLive={ifo.status === 'live'} />}
          <StyledCard $isCurrent>
            {!isMobile && (
              <>
                {/*<Header $isCurrent ifoId={ifo.id} />*/}
                <IfoRibbon publicIfoData={publicIfoData} />
              </>
            )}
            <MintingCard ifo={ifo} publicIfoData={publicIfoData} walletIfoData={walletIfoData} />
          </StyledCard>
        </Box>
      </>
    )
  }

  const MintingCard: React.FC<IfoFoldableCardProps> = ({ ifo, publicIfoData, walletIfoData }) => {
    const currentBlock = useCurrentBlock()
    const { fetchIfoData: fetchPublicIfoData, isInitialized: isPublicIfoDataInitialized, secondsUntilEnd } = publicIfoData
    const {
      contract,
      fetchIfoData: fetchWalletIfoData,
      resetIfoData: resetWalletIfoData,
      isInitialized: isWalletDataInitialized,
    } = walletIfoData
    const [enableStatus, setEnableStatus] = useState(EnableStatus.DISABLED)
    const { t } = useTranslation()
    const { account } = useWeb3React()
    const raisingTokenContract = useERC20(ifo.currency.address, false)
    // Continue to fetch 2 more minutes to get latest data
    const isRecentlyActive =
      (ifo.status !== 'finished' || (ifo.status === 'finished' && secondsUntilEnd >= -120)) &&
      ifo.isActive
    const onApprove = useIfoApprove(ifo, contract.address)
    const { toastSuccess } = useToast()
    const { fetchWithCatchTxError } = useCatchTxError()
    const isWindowVisible = useIsWindowVisible()
  
    useEffect(() => {
      if (isRecentlyActive || !isPublicIfoDataInitialized) {
        fetchPublicIfoData(currentBlock, account)
      }
    }, [isRecentlyActive, isPublicIfoDataInitialized, fetchPublicIfoData, currentBlock, account])
  
    useFastRefreshEffect(() => {
      if (isWindowVisible && (isRecentlyActive || !isWalletDataInitialized)) {
        if (account) {
          fetchWalletIfoData()
        }
      }
  
      if (!account && isWalletDataInitialized) {
        resetWalletIfoData()
      }
    }, [isWindowVisible, account, isRecentlyActive, isWalletDataInitialized, fetchWalletIfoData, resetWalletIfoData])
  
    const handleApprove = async () => {
      const receipt = await fetchWithCatchTxError(() => {
        setEnableStatus(EnableStatus.IS_ENABLING)
        return onApprove()
      })
      if (receipt?.status) {
        toastSuccess(
          t('Successfully Enabled!'),
          <ToastDescriptionWithTx txHash={receipt.transactionHash}>
            {t('You can now participate in the %symbol% IFO.', { symbol: ifo.token.symbol })}
          </ToastDescriptionWithTx>,
        )
        setEnableStatus(EnableStatus.ENABLED)
      } else {
        setEnableStatus(EnableStatus.DISABLED)
      }
    }
  
    useEffect(() => {
      const checkAllowance = async () => {
        try {
          const response = await raisingTokenContract.allowance(account, contract.address)
          const currentAllowance = new BigNumber(response.toString())
          setEnableStatus(currentAllowance.lte(0) ? EnableStatus.DISABLED : EnableStatus.ENABLED)
        } catch (error) {
          setEnableStatus(EnableStatus.DISABLED)
        }
      }
  
      if (account) {
        checkAllowance()
      }
    }, [account, raisingTokenContract, contract, setEnableStatus])
  
    return (
      <>
        <StyledCardBody>
          <CardsWrapper
            shouldReverse={ifo.version === 3.1}
            singleCard={!ifo.poolBasic}
          >
            {ifo.poolBasic && (
              <MintingPoolCard
                poolId={PoolIds.poolBasic}
                ifo={ifo}
                publicIfoData={publicIfoData}
                walletIfoData={walletIfoData}
                onApprove={handleApprove}
                enableStatus={enableStatus}
              />
            )}
            <MintingPoolCard
              poolId={PoolIds.poolUnlimited}
              ifo={ifo}
              publicIfoData={publicIfoData}
              walletIfoData={walletIfoData}
              onApprove={handleApprove}
              enableStatus={enableStatus}
            />
          </CardsWrapper>
        </StyledCardBody>
      </>
    )
  }
