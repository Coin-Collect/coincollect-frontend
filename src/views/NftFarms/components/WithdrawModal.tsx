import BigNumber from 'bignumber.js'
import { useCallback, useMemo, useState } from 'react'
import { Button, Flex, Modal, Text } from '@pancakeswap/uikit'
import { ModalActions, ModalInput } from 'components/Modal'
import { useTranslation } from 'contexts/Localization'
import { getFullDisplayBalance } from 'utils/formatBalance'
import { RoundedImage } from 'views/Nft/market/Collection/IndividualNFTPage/shared/styles'
import NoNftsImage from 'views/Nft/market/components/Activity/NoNftsImage'
import CircleLoader from 'components/Loader/CircleLoader'
import styled from 'styled-components'
import { useStakedNfts } from 'views/Nft/market/hooks/useStakedNfts'

const NftBox = styled(RoundedImage)`
    border-radius: 6px;
`

const SelectedNftBox = styled(RoundedImage)`
    border-radius: 6px;
    box-shadow: 0 0 10px 4px #e91e63;
`

interface WithdrawModalProps {
  max: BigNumber
  onConfirm: (tokenIds: number[]) => void
  onDismiss?: () => void
  tokenName?: string
  pid?: number
}

const WithdrawModal: React.FC<WithdrawModalProps> = ({ onConfirm, onDismiss, max, tokenName = '', pid }) => {
  const [pendingTx, setPendingTx] = useState(false)
  const [selectedNftList, setSelectedNftList] = useState<number[]>([])
  const { t } = useTranslation()
  const fullBalance = useMemo(() => {
    return getFullDisplayBalance(max)
  }, [max])

  const {nfts, isLoading, errorMessage} = useStakedNfts(pid)

  const nftList = nfts.map((nft)=>selectedNftList.includes(nft.tokenId) ? <SelectedNftBox key={nft.tokenId} onClick={()=>handleSelectNft(nft.tokenId)} src={nft.image} height={90} width={68} m="8px" /> :
                                                                          <NftBox key={nft.tokenId} onClick={()=>handleSelectNft(nft.tokenId)} src={nft.image} height={90} width={68} m="8px" />)

  const handleSelectNft = useCallback((id:number) => {
    const newSelectedNftList = selectedNftList.includes(id) ? selectedNftList.filter(i => i !== id) : [...selectedNftList, id];
    setSelectedNftList(newSelectedNftList)
 }, [selectedNftList, setSelectedNftList])


  return (
    <Modal title={t('Unstake %nftName%', {nftName: tokenName})} onDismiss={onDismiss}>
      
      {nftList.length === 0 && !isLoading && !errorMessage ? (
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
    ) : errorMessage ? (
      <Flex p="24px" flexDirection="column" alignItems="center">
        <Button variant="light" onClick={onDismiss} width="100%">
          {t('Retry')}
        </Button>
        <Text pt="8px" bold>
          {t('%errorMessage%', { errorMessage })}
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
            pendingTx || selectedNftList.length == 0
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

    </Modal>
  )
}

export default WithdrawModal
