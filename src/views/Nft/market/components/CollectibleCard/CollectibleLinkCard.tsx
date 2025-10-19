import { NextLinkFromReactRouter } from 'components/NextLink'
import { StyledCollectibleCard } from './styles'
import CardBody from './CardBody'
import { CollectibleCardProps } from './types'
import { nftsBaseUrl, pancakeBunniesAddress } from '../../constants'

const CollectibleLinkCard: React.FC<CollectibleCardProps> = ({ nft, nftLocation, currentAskPrice, directLink, showBuyButton, ...props }) => {
  const isPancakeBunny = nft.collectionAddress?.toLowerCase() === pancakeBunniesAddress.toLowerCase()
  const bunnyId = nft.attributes?.[0]?.value
  const urlId = isPancakeBunny && bunnyId ? bunnyId : nft.tokenId
  return (
    <StyledCollectibleCard {...props}>
      <NextLinkFromReactRouter to={directLink ? directLink : `${nftsBaseUrl}/collections/${nft.collectionAddress}/${urlId}`} target="_blank">
        <CardBody nft={nft} nftLocation={nftLocation} currentAskPrice={currentAskPrice} showBuyButton={showBuyButton} directLink={directLink} />
      </NextLinkFromReactRouter>
    </StyledCollectibleCard>
  )
}

export default CollectibleLinkCard
