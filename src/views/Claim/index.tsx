import { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import BigNumber from 'bignumber.js'
import useWeb3React from 'hooks/useWeb3React'
import { Heading, Flex, Image, Text, Box } from '@pancakeswap/uikit'
import orderBy from 'lodash/orderBy'
import partition from 'lodash/partition'
import { useTranslation } from 'contexts/Localization'
import useIntersectionObserver from 'hooks/useIntersectionObserver'
import {
  useFetchPublicPoolsData,
  usePools,
  useFetchUserPools,
  useFetchCakeVault,
  useVaultPools,
} from 'state/pools/hooks'
import { latinise } from 'utils/latinise'
import FlexLayout from 'components/Layout/Flex'
import Page from 'components/Layout/Page'
import PageHeader from 'components/PageHeader'
import { DeserializedPool } from 'state/types'
import { useUserPoolStakedOnly, useUserPoolsViewMode } from 'state/user/hooks'
import { usePoolsWithVault } from 'views/Home/hooks/useGetTopPoolsByApr'
import { BIG_ZERO } from 'utils/bigNumber'
import { useRouter } from 'next/router'
import Loading from 'components/Loading'
import ClaimCard from './components/ClaimCard'
import HelpButton from './components/HelpButton'
import claimConfig from 'config/constants/claim'
import { useClaimInfo } from './hooks/useClaimInfo'
import { ClaimPageBanner } from 'views/Home/components/Banners/ClaimPageBanner'


const CardLayout = styled(FlexLayout)`
  justify-content: center;
`

const NUMBER_OF_POOLS_VISIBLE = 12

const Pools: React.FC = () => {
  const { t } = useTranslation()
  const { account } = useWeb3React()
  const { observerRef, isIntersecting } = useIntersectionObserver()


  const claimData  = useClaimInfo()

  const cardLayout = (
    <CardLayout>
      {claimConfig.map((claim, index) =>
        <ClaimCard key={index} claimId={index} claim={claim} claimData={claimData} account={account} />
      ).reverse()}
    </CardLayout>
  )


  return (
    <>
      <PageHeader>
        <Box mb="32px" mt="16px">
          <ClaimPageBanner />
        </Box>
      {/*  
        <Flex justifyContent="space-between" flexDirection={['column', null, null, 'row']}>
          <Flex flex="1" flexDirection="column" mr={['8px', 0]}>
            <Heading as="h1" scale="xxl" color="secondary" mb="24px">
              {t('Claim Rewards')}
            </Heading>
            <Heading scale="md" color="text" mb="24px">
              {t('As a CoinCollect NFT owner, unlock a cascade of curated airdrops, gifts, giveaways, and surprises.')}
            </Heading>
          </Flex>
          <Flex flex="1" height="fit-content" justifyContent="center" alignItems="center" mt={['24px', null, '0']}>
            <HelpButton />
          </Flex>
        </Flex>
      */}
      </PageHeader>
      <Page>
        
        {cardLayout}
        <div ref={observerRef} />
        <Box mx="auto" mt="12px" width="192px" height="184.5px">
          <Box
            as="video"
            src="/sheep.webm"
            autoPlay
            loop
            muted
            playsInline
            width="100%"
            height="100%"
            style={{ borderRadius: '16px', objectFit: 'cover' }}
          />
        </Box>
      </Page>
    </>
  )
}

export default Pools
