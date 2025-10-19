import { Box, CardBody, Flex, Text, Button } from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'
import { useBNBBusdPrice } from 'hooks/useBUSDPrice'
import PreviewImage from './PreviewImage'
import { CostLabel, LowestPriceMetaRow, MetaRow } from './styles'
import LocationTag from './LocationTag'
import { CollectibleCardProps } from './types'
import { useGetLowestPriceFromNft } from '../../hooks/useGetLowestPrice'
import { pancakeBunniesAddress } from '../../constants'
import NFTMedia from '../NFTMedia'

const CollectibleCardBody: React.FC<CollectibleCardProps> = ({ nft, nftLocation, currentAskPrice, isUserNft, showBuyButton, directLink }) => {
  const { t } = useTranslation()
  const { name } = nft
  const bnbBusdPrice = useBNBBusdPrice()
  const isPancakeBunny = nft.collectionAddress?.toLowerCase() === pancakeBunniesAddress.toLowerCase()
  const { isFetching, lowestPrice } = useGetLowestPriceFromNft(nft)

  //TODO: added style={{backgroundPosition:"center"}} to NFTMedia temporarily
  return (
    <CardBody p="8px">
      <Box position="relative" mb="8px" pb="8px">
        <NFTMedia style={{backgroundPosition:"center"}} as={PreviewImage} nft={nft} height={320} width={320} borderRadius="12px" />
        {/* NFT Title Overlay */}
        <Box
          position="absolute"
          top="12px"
          left="12px"
          background="rgba(0, 0, 0, 0.7)"
          borderRadius="8px"
          px="8px"
          py="4px"
        >
          <Text color="white" fontSize="14px" fontWeight="600">
            {name}
          </Text>
        </Box>
        {showBuyButton && directLink && (
          <Flex
            position="absolute"
            left="12px"
            right="12px"
            bottom="12px"
            justifyContent="center"
          >
            <Button
              as="a"
              href={directLink}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
              scale="sm"
              style={{ pointerEvents: 'auto' }}
            >
              {t('Buy')}
            </Button>
          </Flex>
        )}
      </Box>
    </CardBody>
  )
}

export default CollectibleCardBody
