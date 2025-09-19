import { InjectedModalProps, Modal, Flex, Text, Button, Link, Grid, LinkExternal } from '@pancakeswap/uikit'
import useTheme from 'hooks/useTheme'
import styled from 'styled-components'
import { NftToken } from 'state/nftMarket/types'
import { useTranslation } from 'contexts/Localization'
import { getBscScanLinkForNft, getPolygonScanLinkForNft } from 'utils'
import { HorizontalDivider, RoundedImage } from './BuySellModals/shared/styles'
import { nftsBaseUrl, pancakeBunniesAddress } from '../constants'

export const StyledModal = styled(Modal)`
  & > div:last-child {
    padding: 0;
  }
`

interface ProfileNftModalProps extends InjectedModalProps {
  nft: NftToken
}

const ProfileNftModal: React.FC<ProfileNftModalProps> = ({ nft, onDismiss }) => {
  const { t } = useTranslation()
  const { theme } = useTheme()

  const itemPageUrlId =
    nft.collectionAddress === pancakeBunniesAddress ? nft.attributes?.[0]?.value ?? nft.tokenId : nft.tokenId

  return (
    <StyledModal title={t('Details')} onDismiss={onDismiss} headerBackground={theme.colors.gradients.cardHeader}>
      <Flex flexDirection="column" maxWidth="350px">
        <Flex p="16px">
          <RoundedImage src={nft.image.thumbnail} height={68} width={68} mr="16px" />
          <Grid flex="1" gridTemplateColumns="1fr 1fr" alignItems="center">
            <Text bold>{nft.name}</Text>
            <Text fontSize="12px" color="textSubtle" textAlign="right">
              {nft.collectionName}
            </Text>
            {/* TODO: Add lowestPrice when available */}
          </Grid>
        </Flex>
        <Flex justifyContent="space-between" px="16px" mb="16px">
          <Flex flex="2">
            <Text small color="textSubtle">
              {t('Token ID: %id%', { id: nft.tokenId })}
            </Text>
          </Flex>
          <Flex justifyContent="space-between" flex="3">
            <Button
              as={Link}
              p="0px"
              height="16px"
              external
              variant="text"
              href={`${nftsBaseUrl}/collections/${nft.collectionAddress}/${itemPageUrlId}`}
            >
              {t('View Item')}
            </Button>
            <HorizontalDivider />
            <LinkExternal p="0px" height="16px" href={getPolygonScanLinkForNft(nft.collectionAddress, nft.tokenId)}>
              PolygonScan
            </LinkExternal>
          </Flex>
        </Flex>
      </Flex>
    </StyledModal>
  )
}

export default ProfileNftModal
