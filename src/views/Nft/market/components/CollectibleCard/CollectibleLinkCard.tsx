import { NextLinkFromReactRouter } from 'components/NextLink'
import { StyledCollectibleCard } from './styles'
import CardBody from './CardBody'
import { CollectibleCardProps } from './types'
import { nftsBaseUrl, pancakeBunniesAddress } from '../../constants'

const CollectibleLinkCard: React.FC<CollectibleCardProps> = ({ nft, nftLocation, currentAskPrice, directLink, ...props }) => {
  const urlId =
    nft.collectionAddress.toLowerCase() === pancakeBunniesAddress.toLowerCase() ? nft.attributes[0].value : nft.tokenId
  return (
    <StyledCollectibleCard {...props}>
      <NextLinkFromReactRouter to={directLink ? directLink : `${nftsBaseUrl}/collections/${nft.collectionAddress}/${urlId}`} target="_blank">
        <CardBody nft={nft} nftLocation={nftLocation} currentAskPrice={currentAskPrice} />
      </NextLinkFromReactRouter>
    </StyledCollectibleCard>
  )
}

export default CollectibleLinkCard
