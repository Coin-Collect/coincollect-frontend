
import { Heading, Flex, Button, Grid, ChevronRightIcon } from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'
import { NextLinkFromReactRouter } from 'components/NextLink'
import GridPlaceholder from '../components/GridPlaceholder'
import CollectibleLinkCard from '../components/CollectibleCard/CollectibleLinkCard'


const NewestForCollection = ({mintingData}) => {
  const { t } = useTranslation()
  let { showCase, address, name, openSeaUrl } = mintingData
  const nfts = showCase ? showCase.map((item, index) => ({ 'tokenId': item.tokenId, 'collectionAddress': address, 'name': `#${item.tokenId}`, 'collectionName': name, 'image': {'thumbnail': item.image} })) : [];

  return (
    <div>
      <Flex justifyContent="space-between" alignItems="center" mb="26px">
        <Heading data-test="nfts-newest">{t('Buy at OpenSea')}</Heading>
        <Button
          as={NextLinkFromReactRouter}
          to={openSeaUrl}
          variant="secondary"
          scale="sm"
          endIcon={<ChevronRightIcon color="primary" />}
          external={true}
        >
          {t('View All')}
        </Button>
      </Flex>
      {nfts ? (
        <Grid
          gridRowGap="24px"
          gridColumnGap="16px"
          gridTemplateColumns={['1fr', 'repeat(2, 1fr)', 'repeat(2, 1fr)', 'repeat(4, 1fr)']}
        >
          {nfts.map((nft, index) => {
            return (
              <CollectibleLinkCard
                data-test="showcase-nft-card"
                key={nft.tokenId}
                nft={nft}
                directLink={openSeaUrl}
              />
            )
          })}
        </Grid>
      ) : (
        <GridPlaceholder numItems={4} />
      )}
    </div>
  )
}

export default NewestForCollection
