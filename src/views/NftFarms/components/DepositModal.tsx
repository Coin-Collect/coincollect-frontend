import BigNumber from 'bignumber.js'
import { useCallback, useMemo, useState } from 'react'
import styled from 'styled-components'
import { Flex, Text, Button, Modal, LinkExternal, CalculateIcon, IconButton, Skeleton } from '@pancakeswap/uikit'
import { ModalActions, ModalInput } from 'components/Modal'
import RoiCalculatorModal from 'components/RoiCalculatorModal'
import { useTranslation } from 'contexts/Localization'
import { getFullDisplayBalance, formatNumber } from 'utils/formatBalance'
import { getInterestBreakdown } from 'utils/compoundApyHelpers'
import { RoundedImage } from 'views/Nft/market/Collection/IndividualNFTPage/shared/styles'
import { useNftsForCollectionAndAddress } from 'views/Nft/market/hooks/useNftsForCollectionAndAddress'
import CircleLoader from 'components/Loader/CircleLoader'
import NoNftsImage from 'views/Nft/market/components/Activity/NoNftsImage'

const AnnualRoiContainer = styled(Flex)`
  cursor: pointer;
`

const AnnualRoiDisplay = styled(Text)`
  width: 72px;
  max-width: 72px;
  overflow: hidden;
  text-align: right;
  text-overflow: ellipsis;
`

const NftBox = styled(RoundedImage)`
    border-radius: 6px;
`

const SelectedNftBox = styled(RoundedImage)`
    border-radius: 6px;
    box-shadow: 0 0 10px 4px #e91e63;
`

interface DepositModalProps {
  max: BigNumber
  stakingLimit: BigNumber
  stakedBalance: BigNumber
  multiplier?: string
  lpPrice: BigNumber
  lpLabel?: string
  onConfirm: (tokenIds: number[]) => void
  onDismiss?: () => void
  tokenName?: string
  apr?: number
  displayApr?: string
  addLiquidityUrl?: string
  cakePrice?: BigNumber
  pid?: number
}

const DepositModal: React.FC<DepositModalProps> = ({
  max,
  stakingLimit,
  stakedBalance,
  onConfirm,
  onDismiss,
  tokenName = '',
  multiplier,
  displayApr,
  lpPrice,
  lpLabel,
  apr,
  addLiquidityUrl,
  cakePrice,
  pid,
}) => {
  const [val, setVal] = useState('')
  const [pendingTx, setPendingTx] = useState(false)
  const [showRoiCalculator, setShowRoiCalculator] = useState(false)
  const [selectedNftList, setSelectedNftList] = useState<number[]>([])
  const { t } = useTranslation()
  const fullBalance = useMemo(() => {
    return getFullDisplayBalance(max)
  }, [max])

  const isStakeLimitReached = stakedBalance.toNumber() + selectedNftList.length > stakingLimit.toNumber()

  const lpTokensToStake = new BigNumber(val)
  const fullBalanceNumber = new BigNumber(fullBalance)
  

  const usdToStake = lpTokensToStake.times(lpPrice)

  const interestBreakdown = getInterestBreakdown({
    principalInUSD: !lpTokensToStake.isNaN() ? usdToStake.toNumber() : 0,
    apr,
    earningTokenPrice: cakePrice.toNumber(),
  })

  const annualRoi = cakePrice.times(interestBreakdown[3])
  const annualRoiAsNumber = annualRoi.toNumber()
  const formattedAnnualRoi = formatNumber(annualRoiAsNumber, annualRoi.gt(10000) ? 0 : 2, annualRoi.gt(10000) ? 0 : 2)

  const {nfts, isLoading, error} = useNftsForCollectionAndAddress(pid)


  const nftList = nfts.map((nft)=>selectedNftList.includes(nft.tokenId) ? <SelectedNftBox key={nft.tokenId} onClick={()=>handleSelectNft(nft.tokenId)} src={nft.image} height={90} width={68} m="8px" /> :
                                                                  <NftBox key={nft.tokenId} onClick={()=>handleSelectNft(nft.tokenId)} src={nft.image} height={90} width={68} m="8px" />)

  const handleSelectNft = useCallback((id:number) => {
     const newSelectedNftList = selectedNftList.includes(id) ? selectedNftList.filter(i => i !== id) : [...selectedNftList, id];
     setSelectedNftList(newSelectedNftList)
  }, [selectedNftList, setSelectedNftList])
  


  if (showRoiCalculator) {
    return (
      <RoiCalculatorModal
        linkLabel={t('Get %symbol%', { symbol: lpLabel })}
        stakingTokenBalance={stakedBalance.plus(max)}
        stakingTokenSymbol={tokenName}
        stakingTokenPrice={lpPrice.toNumber()}
        earningTokenPrice={cakePrice.toNumber()}
        apr={apr}
        multiplier={multiplier}
        displayApr={displayApr}
        linkHref={addLiquidityUrl}
        isFarm
        initialValue={val}
        onBack={() => setShowRoiCalculator(false)}
      />
    )
  }

  return (
    <Modal title={t('Stake %nftName%', {nftName: tokenName})} onDismiss={onDismiss}>

    {stakingLimit.gt(0) && (
        <Text color="secondary" bold mb="5px" style={{ textAlign: 'center' }} fontSize="16px">
          {t('Max stake for this pool: %amount% %token%', {
            amount: stakingLimit.toNumber(),
            token: lpLabel,
          })}
        </Text>
    )}

    {isStakeLimitReached && (
        <Text color="failure" fontSize="12px" style={{ textAlign: 'right' }} mb="10px">
          {t('Stake limit reached. Please unstake some selected NFTs!')}
        </Text>
      )}

    {nftList.length === 0 && !isLoading && !error ? (
      <Flex p="24px" flexDirection="column" alignItems="center">
        <NoNftsImage />
        <Text pt="8px" bold>
          {t('No NFTs found')}
        </Text>
      </Flex>
    ) : nftList.length > 0 ? (
      <Flex flexWrap="wrap" justifyContent="space-evenly">
        {nftList}
      </Flex>
    ) : error ? (
      <Flex p="24px" flexDirection="column" alignItems="center">
        <Button variant="light" onClick={onDismiss} width="100%">
          {t('Retry')}
        </Button>
        <Text pt="8px" bold>
          {t('Network error!')}
        </Text>
      </Flex>
    ) : (
      <Flex p="24px" flexDirection="column" alignItems="center">
        <CircleLoader size="30px" />
      </Flex>
    )}
     
      
      <ModalActions>
        <Button variant="secondary" onClick={onDismiss} width="100%" disabled={pendingTx}>
          {t('Cancel')}
        </Button>
        <Button
          width="100%"
          disabled={
            pendingTx || selectedNftList.length == 0 || isStakeLimitReached
          }
          onClick={async () => {
            setPendingTx(true)
            await onConfirm(selectedNftList)
            onDismiss?.()
            setPendingTx(false)
          }}
        >
          {pendingTx ? t('Confirming') : t('Confirm')}
        </Button>
      </ModalActions>
      <LinkExternal href={addLiquidityUrl} style={{ alignSelf: 'center' }}>
        {t('Get %symbol%', { symbol: tokenName })}
      </LinkExternal>
    </Modal>
  )
}

export default DepositModal
