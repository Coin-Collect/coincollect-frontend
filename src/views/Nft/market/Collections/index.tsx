import { useEffect, useMemo, useState } from 'react'
import { ArrowBackIcon, ArrowForwardIcon, Box, Button, ChevronRightIcon, Flex, Grid, Heading, Text, useMatchBreakpoints } from '@pancakeswap/uikit'
import styled from 'styled-components'
import { FetchStatus } from 'config/constants/types'
import { useGetShuffledCollections } from 'state/nftMarket/hooks'
import Select, { OptionProps } from 'components/Select/Select'
import { useTranslation } from 'contexts/Localization'
import Page from 'components/Layout/Page'
import PageHeader from 'components/PageHeader'
import { nftsBaseUrl } from 'views/Nft/market/constants'
import PageLoader from 'components/Loader/PageLoader'
import { CollectionCard } from '../components/CollectibleCard'
import { BNBAmountLabel } from '../components/CollectibleCard/styles'
import { NextLinkFromReactRouter } from 'components/NextLink'
import { Collection } from 'state/nftMarket/types'
import { CollectionsPageBanner } from 'views/Home/components/Banners/CollectionsPageBanner'

export const ITEMS_PER_PAGE = 9

const SORT_FIELD = {
  createdAt: 'createdAt',
  volumeBNB: 'totalVolumeBNB',
  items: 'numberTokensListed',
  supply: 'totalSupply',
}

export const PageButtons = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.2em;
  margin-bottom: 1.2em;
`

export const Arrow = styled.div`
  color: ${({ theme }) => theme.colors.primary};
  padding: 0 20px;
  :hover {
    cursor: pointer;
  }
`

const Collectible = () => {
  const { t } = useTranslation()
  const { data: collections, status } = useGetShuffledCollections()
  const { isMobile } = useMatchBreakpoints()
  const [sortField, setSortField] = useState(null)
  const [page, setPage] = useState(1)
  const [maxPage, setMaxPage] = useState(1)

  useEffect(() => {
    if (isMobile) {
      setTimeout(() => {
        window.scroll({
          top: 50,
          left: 0,
          behavior: 'smooth',
        })
      }, 50)
    }
  }, [isMobile, page])

  useEffect(() => {
    let extraPages = 1
    const collectionValues = collections ? Object.values(collections) : []
    if (collectionValues.length % ITEMS_PER_PAGE === 0) {
      extraPages = 0
    }
    setMaxPage(Math.max(Math.floor(collectionValues.length / ITEMS_PER_PAGE) + extraPages, 1))
  }, [collections])

  const sortedCollections = useMemo(() => {
    const collectionValues = collections ? Object.values(collections) : []

    return collectionValues.sort((a, b) => {
      if (a && b) {
        if (sortField === SORT_FIELD.createdAt) {
          if (a.createdAt && b.createdAt) {
            return Date.parse(a.createdAt) - Date.parse(b.createdAt) ? -1 : 1
          }
          return -1
        }
        return parseFloat(a[sortField]) > parseFloat(b[sortField]) ? -1 : 1
      }
      return -1
    })
  }, [collections, sortField])

  // CC - Filtering
  const finishedMintings = useMemo(() => {
    const collectionValues = collections ? Object.values(collections) : []
    // @ts-ignore
    return collectionValues.filter((collection) => collection.status == 'finished')
  }, [collections])

  // CC - Filtering
  const activePublicMintings = useMemo(() => {
    const collectionValues = collections ? Object.values(collections) : []
    // @ts-ignore
    return collectionValues.filter((collection) => collection.status == 'livepublic')
  }, [collections])

  // CC - Filtering
  const activePrivateMintings = useMemo(() => {
    const collectionValues = collections ? Object.values(collections) : []
    // @ts-ignore
    return collectionValues.filter((collection) => collection.status == 'liveprivate')
  }, [collections])


  const handleSortOptionChange = (option: OptionProps): void => {
    setSortField(option.value)
  }

  return (
    <>
      <PageHeader>
        <Box mb="32px" mt="16px">
          <CollectionsPageBanner />
        </Box>
        {/*<Heading as="h1" scale="xxl" color="secondary" data-test="nft-collections-title">
          {t('Collections')}
        </Heading>*/}

      </PageHeader>
      <Page>
        {status !== FetchStatus.Fetched ? (
          <PageLoader />
        ) : (
          <>
            <Flex
              justifyContent={['flex-start', null, 'flex-end']}
              pr={[null, null, '4px']}
              pl={['4px', null, '0']}
              mb="8px"
            >
              {/*
              <Flex width="max-content" style={{ gap: '4px' }} flexDirection="column">
                <Text fontSize="12px" textTransform="uppercase" color="textSubtle" fontWeight={600}>
                  {t('Sort By')}
                </Text>
                <Select
                  options={[
                    {
                      label: t('Collection'),
                      value: SORT_FIELD.createdAt,
                    },
                    {
                      label: t('Volume'),
                      value: SORT_FIELD.volumeBNB,
                    },
                    {
                      label: t('Items'),
                      value: SORT_FIELD.items,
                    },
                    {
                      label: t('Supply'),
                      value: SORT_FIELD.supply,
                    },
                  ]}
                  placeHolderText={t('Select')}
                  onOptionChange={handleSortOptionChange}
                />
              </Flex>
                */}
            </Flex>
            
            {activePrivateMintings.length > 0 && <Collections
              key="active-private-mintings"
              title={t('🔥New & Hot')}
              testId="active-private-mintings"
              collections={activePrivateMintings}
            />}

            {activePublicMintings.length > 0 && <Collections
              key="active-public-mintings"
              title={t('Live Public Mintings')}
              testId="active-public-mintings"
              collections={activePublicMintings}
            />}


            <Collections
              key="coming-soon-collections"
              title={t('Coming Soon')}
              testId="nfts-coming-soon-collections"
              collections={null}
            />

            {finishedMintings.length > 0 && <Collections
              key="finished-mintings"
              title={t('Finished Mintings')}
              testId="finished-mintings"
              collections={finishedMintings}
            />}


            {/*
            <PageButtons>
              <Arrow
                onClick={() => {
                  setPage(page === 1 ? page : page - 1)
                }}
              >
                <ArrowBackIcon color={page === 1 ? 'textDisabled' : 'primary'} />
              </Arrow>
              <Text>{t('Page %page% of %maxPage%', { page, maxPage })}</Text>
              <Arrow
                onClick={() => {
                  setPage(page === maxPage ? page : page + 1)
                }}
              >
                <ArrowForwardIcon color={page === maxPage ? 'textDisabled' : 'primary'} />
              </Arrow>
            </PageButtons>
              */}
          </>
        )}
      </Page>
    </>
  )
}

export default Collectible

// This function cloned from Market/Home/Collections.tsx
//TODO: Using temporarily
const Collections: React.FC<{ title: string; testId: string; collections: Collection[] }> = ({
  title,
  testId,
  collections,
}) => {
  const { t } = useTranslation()

  const CardRender = () => {

    if (collections) {


      return (<Grid gridGap="16px" gridTemplateColumns={['1fr', '1fr', 'repeat(2, 1fr)', 'repeat(3, 1fr)']} mb="64px">


        {collections.slice(0, 9).map((collection) => {
          return (
            <CollectionCard
              key={collection.address}
              bgSrc={collection.banner.small}
              avatarSrc={collection.avatar}
              collectionName={collection.name}
              url={`${nftsBaseUrl}/collections/mint/${collection.address}`}
            >
              <Flex alignItems="center">
                <Text fontSize="12px" color="textSubtle">
                  {t('Volume')}
                </Text>
                <BNBAmountLabel amount={collection.totalSupply ? parseFloat(collection.totalSupply) : 0} />
              </Flex>
            </CollectionCard>
          )
        })}


      </Grid>)
    } else {
      return (<Grid gridGap="16px" gridTemplateColumns={['1fr', '1fr', 'repeat(2, 1fr)', 'repeat(3, 1fr)']} mb="64px">


        {/* ======Dummy Collections====== */}

        <CollectionCard
          key="dummy"
          bgSrc="https://coincollect.org/assets/images/partners/questgalaxy/questgalaxySM.jpg"
          avatarSrc="https://coincollect.org/assets/images/partners/questgalaxy/qlogo.jpg"
          collectionName="QuestGalaxy"
          url="https://questgalaxy.com/"
          openInNewTab
        >
          <Flex alignItems="center">
            <Text fontSize="12px" color="textSubtle">
              MaxSupply
            </Text>
            <BNBAmountLabel amount={5000} />
          </Flex>
        </CollectionCard>


        <CollectionCard
          key="dummy"
          bgSrc="https://coincollect.org/assets/images/partners/cyberpunk/bannersm-min.png"
          avatarSrc="https://coincollect.org/assets/images/partners/cyberpunk/logo300-min.png"
          collectionName="CyberPunk Space"
          url="https://cyberpunk3.com/"
          openInNewTab
        >
          <Flex alignItems="center">
            <Text fontSize="12px" color="textSubtle">
              MaxSupply
            </Text>
            <BNBAmountLabel amount={4000} />
          </Flex>
        </CollectionCard>

        <CollectionCard
          key="dummy"
          bgSrc="https://coincollect.org/assets/images/clone/web3sports.png"
          avatarSrc="https://coincollect.org/assets/images/clone/web3slogo128.png"
          collectionName="Web3Sports"
          url="https://web3sports.app"
        >
          <Flex alignItems="center">
            <Text fontSize="12px" color="textSubtle">
              MaxSupply
            </Text>
            <BNBAmountLabel amount={1000} />
          </Flex>
        </CollectionCard>

        {/* ======Dummy Collections====== */}


      </Grid>)
    }
  }

  return (
    <>
      <Flex alignItems="center" justifyContent="space-between" mb="32px">
        <Heading as="h3" scale="lg" data-test={testId}>
          {title}
        </Heading>
        {/*
        <Button
          as={NextLinkFromReactRouter}
          to={`${nftsBaseUrl}/collections/`}
          variant="secondary"
          scale="sm"
          endIcon={<ChevronRightIcon color="primary" width="24px" />}
        >
          {t('View All')}
        </Button>
        */}

      </Flex>
      <CardRender />
    </>
  )
}
