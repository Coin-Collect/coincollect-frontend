import { Flex, Grid, Text, Button, Link, BinanceIcon, LinkExternal } from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'
import { nftsBaseUrl, pancakeBunniesAddress } from 'views/Nft/market/constants'
import { NftToken } from 'state/nftMarket/types'
import { getPolygonScanLinkForNft } from 'utils'
import { Divider, HorizontalDivider, RoundedImage } from '../shared/styles'

interface SellStageProps {
  nftToSell: NftToken
  lowestPrice: number
  continueToNextStage: () => void
  continueToTransferStage: () => void
}

// Initial stage when user wants to put their NFT for sale or transfer to another wallet
const SellStage: React.FC<SellStageProps> = ({
  nftToSell,
  lowestPrice,
  continueToNextStage,
  continueToTransferStage,
}) => {
  const { t } = useTranslation()
  const itemPageUrlId =
    nftToSell.collectionAddress.toLowerCase() === pancakeBunniesAddress.toLowerCase()
      ? nftToSell.attributes?.[0]?.value ?? nftToSell.tokenId
      : nftToSell.tokenId

  return (
    <>
      <Flex p="16px">
        <RoundedImage src={nftToSell.image.thumbnail} height={90} width={68} mr="8px" />
        <Grid flex="1" gridTemplateColumns="1fr 1fr" alignItems="center">
          <Text bold>{nftToSell.name}</Text>
          <Text fontSize="12px" color="textSubtle" textAlign="right">
            {nftToSell.collectionName}
          </Text>
          {lowestPrice && (
            <>
              <Text small color="textSubtle">
                {t('Lowest price')}
              </Text>
              <Flex alignItems="center" justifyContent="flex-end">
                <BinanceIcon width={16} height={16} mr="4px" />
                <Text small>
                  {lowestPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}
                </Text>
              </Flex>
            </>
          )}
        </Grid>
      </Flex>
      <Flex justifyContent="space-between" px="16px" mt="8px">
        <Flex flex="2">
          <Text small color="textSubtle">
            {t('Token ID: %id%', { id: nftToSell.tokenId })}
          </Text>
        </Flex>
        <Flex justifyContent="space-between" flex="3">
        {/* TODO: Activate later
          <Button
            as={Link}
            p="0px"
            height="16px"
            external
            variant="text"
            href={`${nftsBaseUrl}/collections/${nftToSell.collectionAddress}/${itemPageUrlId}`}
          >
            {t('View Item')}
          </Button>
        */}
          <HorizontalDivider />
          <LinkExternal
            p="0px"
            height="16px"
            href={getPolygonScanLinkForNft(nftToSell.collectionAddress, nftToSell.tokenId)}
          >
            PlygnScn
          </LinkExternal>
        </Flex>
      </Flex>
      <Divider />
      <Flex flexDirection="column" px="16px" pb="16px">
        {/*TODO: Activate button below*/}
        <Button disabled={true} mb="8px" onClick={continueToNextStage}>
          {t('Sell')}
        </Button>
        <Button mb="8px" variant="secondary" onClick={continueToTransferStage}>
          {t('Transfer')}
        </Button>
      </Flex>
    </>
  )
}

export default SellStage
