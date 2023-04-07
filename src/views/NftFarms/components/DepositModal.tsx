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

const SelectedNft = styled(RoundedImage)`
  box-shadow:0px 0px 5px 1px azure;
`

interface DepositModalProps {
  max: BigNumber
  stakedBalance: BigNumber
  multiplier?: string
  lpPrice: BigNumber
  lpLabel?: string
  onConfirm: (amount: string) => void
  onDismiss?: () => void
  tokenName?: string
  apr?: number
  displayApr?: string
  addLiquidityUrl?: string
  cakePrice?: BigNumber
}

const DepositModal: React.FC<DepositModalProps> = ({
  max,
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
}) => {
  const [val, setVal] = useState('')
  const [pendingTx, setPendingTx] = useState(false)
  const [showRoiCalculator, setShowRoiCalculator] = useState(false)
  const [selectedNftList, setSelectedNftList] = useState<number[]>([])
  const { t } = useTranslation()
  const fullBalance = useMemo(() => {
    return getFullDisplayBalance(max)
  }, [max])

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

  const handleChange = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      if (e.currentTarget.validity.valid) {
        setVal(e.currentTarget.value.replace(/,/g, '.'))
      }
    },
    [setVal],
  )

  const nftList = [
                    {"id":1, "name":"Goal Nft 1", "image":"https://ipfs.io/ipfs/QmbmhwszW3dAST7vkeVS7KwtPDZtfHuhVxvnts5n44oyYs/450.png"},
                    {"id":2, "name":"Goal Nft 1", "image":"https://ipfs.io/ipfs/QmbmhwszW3dAST7vkeVS7KwtPDZtfHuhVxvnts5n44oyYs/451.png"},
                    {"id":3, "name":"Goal Nft 1", "image":"https://ipfs.io/ipfs/QmbmhwszW3dAST7vkeVS7KwtPDZtfHuhVxvnts5n44oyYs/452.png"},
                    {"id":4, "name":"Goal Nft 1", "image":"https://ipfs.io/ipfs/QmbmhwszW3dAST7vkeVS7KwtPDZtfHuhVxvnts5n44oyYs/453.png"},
                    {"id":5, "name":"Goal Nft 1", "image":"https://ipfs.io/ipfs/QmbmhwszW3dAST7vkeVS7KwtPDZtfHuhVxvnts5n44oyYs/454.png"},
                    {"id":6, "name":"Goal Nft 1", "image":"https://ipfs.io/ipfs/QmbmhwszW3dAST7vkeVS7KwtPDZtfHuhVxvnts5n44oyYs/455.png"},
                    {"id":7, "name":"Goal Nft 1", "image":"https://ipfs.io/ipfs/QmbmhwszW3dAST7vkeVS7KwtPDZtfHuhVxvnts5n44oyYs/456.png"},
                    {"id":8, "name":"Goal Nft 1", "image":"https://ipfs.io/ipfs/QmbmhwszW3dAST7vkeVS7KwtPDZtfHuhVxvnts5n44oyYs/457.png"},
                    
                  ].map((nft)=>selectedNftList.includes(nft.id) ? <SelectedNft onClick={()=>handleSelectNft(nft.id)} src={nft.image} height={90} width={68} m="8px" /> :
                                                                  <RoundedImage onClick={()=>handleSelectNft(nft.id)} src={nft.image} height={90} width={68} m="8px" />)

  const handleSelectNft = useCallback((id:number) => {
     const newSelectedNftList = selectedNftList.includes(id) ? selectedNftList.filter(i => i !== id) : [...selectedNftList, id];
     setSelectedNftList(newSelectedNftList)
  }, [selectedNftList, setSelectedNftList])
  

  const handleSelectMax = useCallback(() => {
    setVal(fullBalance)
  }, [fullBalance, setVal])

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
     
      <Flex flexWrap="wrap" justifyContent= "space-evenly">
        {(nftList)}
      </Flex>
      <ModalActions>
        <Button variant="secondary" onClick={onDismiss} width="100%" disabled={pendingTx}>
          {t('Cancel')}
        </Button>
        <Button
          width="100%"
          disabled={
            pendingTx || !lpTokensToStake.isFinite() || lpTokensToStake.eq(0) || lpTokensToStake.gt(fullBalanceNumber)
          }
          onClick={async () => {
            setPendingTx(true)
            await onConfirm(val)
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
