import {
  Box,
  Card,
  CardBody,
  CardHeader,
  ExpandableButton,
  Flex,
  Skeleton,
  Text,
  useMatchBreakpoints,
  useTooltip,
} from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useState } from 'react'
import { useFarmFromPid, usePriceCakeBusd } from 'state/nftFarms/hooks'
import { useIfoPoolCredit, useIfoPoolVault, useIfoWithApr } from 'state/pools/hooks'
import styled from 'styled-components'
import { getBalanceNumber } from 'utils/formatBalance'
import CardActionsContainer from 'views/NftFarms/components/FarmCard/CardActionsContainer'
import CardHeading from 'views/NftFarms/components/FarmCard/CardHeading'
import PoolCardHeader, { PoolCardHeaderTitle } from 'views/Pools/components/PoolCard/PoolCardHeader'
import StyledCard from 'views/Pools/components/PoolCard/StyledCard'
import { ActionContainer } from 'views/Pools/components/PoolsTable/ActionPanel/styles'
import { getAddress } from 'utils/addressHelpers'
import ExpandableSectionButton from 'components/ExpandableSectionButton'
import DetailsSection from 'views/NftFarms/components/FarmCard/DetailsSection'
import { getPolygonScanLink } from 'utils'
import { getNftFarmApr } from 'utils/apr'
import BigNumber from 'bignumber.js'
import { getDisplayApr } from 'views/NftFarms/Farms'
import nftFarmsConfig from 'config/constants/nftFarms'
import Balance from 'components/Balance'


const StyledCardMobile = styled(Card)`
  max-width: 400px;
  width: 100%;
`

const StyledTokenContent = styled(Flex)`
  ${Text} {
    line-height: 1.2;
    white-space: nowrap;
  }
`

const StyledCardFooter = styled(Box)`
  padding: 16px;
  background-color: ${({ theme }) => theme.colors.dropdown};
`

const StyledCardBody = styled(CardBody)`
  display: grid;
  padding: 16px;
  background-color: ${({ theme }) => theme.colors.dropdown};
  gap: 16px;
  ${ActionContainer} {
    margin: 0;
    background-color: ${({ theme }) => theme.colors.invertedContrast};
  }
`

const FarmCardInnerContainer = styled(Flex)`
  flex-direction: column;
  justify-content: space-around;
  padding: 24px;
`

const ExpandingWrapper = styled.div`
  padding: 24px;
  border-top: 2px solid ${({ theme }) => theme.colors.cardBorder};
  overflow: hidden;
`

const NftStakeCardBody = ({ farm, account }) => {
  const { t } = useTranslation()
  const [showExpandableSection, setShowExpandableSection] = useState(false)
  const lpLabel = farm.lpSymbol && farm.lpSymbol.replace('CoinCollect', '')
  const earnLabel = farm.earningToken ? farm.earningToken.symbol: t('COLLECT')
  const apyModalLink = "/nfts/collections"
  const nftAddress = getAddress(farm.nftAddresses)
  const isPromotedFarm = true //farm.token.symbol === 'COLLECT' Caution: Fix
  const cakePrice = usePriceCakeBusd()
  const removed = false
  const sideRewards = farm.sideRewards ? farm.sideRewards : []

  // We use staked nft count for regular pools
  const totalStaked = farm.totalStaked
  // We use sum of weights for smart pools
  const totalShares = farm.totalShares
  const mainCollectionWeight = nftFarmsConfig.filter((f) => f.pid == farm.pid)[0]["mainCollectionWeight"]
  const projectLink = nftFarmsConfig.filter((f) => f.pid == farm.pid)[0]["projectLink"]
  const isSmartNftStakePool = Boolean(farm.contractAddresses)
  const totalLiquidityWithThreshold = new BigNumber(Math.max(farm.participantThreshold ?? 0, isSmartNftStakePool ? totalShares.toNumber() : totalStaked.toNumber()))
  const { cakeRewardsApr, lpRewardsApr } = getNftFarmApr(new BigNumber(farm.poolWeight), farm.tokenPerBlock ? parseFloat(farm.tokenPerBlock) : null, totalLiquidityWithThreshold, mainCollectionWeight)

  return (
    <>
      <StyledCardBody>
        <FarmCardInnerContainer>
          <CardHeading
            lpLabel={lpLabel}
            multiplier={farm.multiplier}
            nftToken={nftAddress}
            pid={farm.pid}
          />
          {!removed && (
            <>
              {sideRewards.length === 0 ? (
                <Flex justifyContent="space-between" alignItems="center">
                  <Text>{t('Daily Reward')}:</Text>
                  <Text bold style={{ display: 'flex', alignItems: 'center' }}>
                    {getDisplayApr(cakeRewardsApr)}
                  </Text>
                </Flex>
              ) : (
                <>
                  <Flex justifyContent="center" alignItems="center">
                    <Text>{t('Daily Rewards')}</Text>
                  </Flex>
                  <Flex justifyContent="space-between">
                    <Text>{earnLabel}</Text>
                    <Text bold>{getDisplayApr(cakeRewardsApr)}</Text>
                  </Flex>
                  {sideRewards.map((reward, index) => (
                    <Flex key={index} justifyContent="space-between">
                      <Text>{reward.token}</Text>
                      <Text bold><Balance value={Number(getDisplayApr(cakeRewardsApr)) * (reward.percentage / 100)} /></Text>
                    </Flex>
                  ))}
                </>
              )}
            </>
          )}

          {sideRewards.length === 0 && (
            <Flex justifyContent="space-between">
              <Text>{t('Earn')}:</Text>
              <Text bold>{earnLabel}</Text>
            </Flex>
          )}

          <CardActionsContainer
            farm={farm}
            lpLabel={lpLabel}
            account={account}
            cakePrice={cakePrice}
            addLiquidityUrl={apyModalLink}
          />
        </FarmCardInnerContainer>
      </StyledCardBody>
      <ExpandingWrapper>
        <ExpandableSectionButton
          onClick={() => setShowExpandableSection(!showExpandableSection)}
          expanded={showExpandableSection}
        />
        {showExpandableSection && (
          <DetailsSection
            removed={removed}
            bscScanAddress={getPolygonScanLink(nftAddress, 'address')}
            earningToken={farm.earningToken}
            totalStaked={farm.totalStaked}
            startBlock={farm.startBlock}
            endBlock={farm.endBlock}
            stakingLimit={farm.stakingLimit}
            stakingLimitEndBlock={farm.stakingLimitEndBlock}
            lpLabel={lpLabel}
            addLiquidityUrl={apyModalLink}
            projectLink={projectLink}
          />
        )}
      </ExpandingWrapper>
    </>
  )
}

const NftStakeCardMobile = ({ farm }) => {
  const { account } = useActiveWeb3React()
  const { t } = useTranslation()
  const credit = useIfoPoolCredit()
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <StyledCardMobile isActive>
      <CardHeader p="16px">
        <Flex justifyContent="space-between" alignItems="center">
          <PoolCardHeaderTitle
            title={`Do you have ${farm.lpSymbol}?`}
            subTitle="Stake now and start earning"
          />
          <ExpandableButton expanded={isExpanded} onClick={() => setIsExpanded((prev) => !prev)} />
        </Flex>
      </CardHeader>
      {isExpanded && (
        <>
          <NftStakeCardBody farm={farm} account={account} />
        </>
      )}
    </StyledCardMobile>
  )
}

const NftStakeCard = ({ farm, account }) => {
  const { isMd, isXs, isSm } = useMatchBreakpoints()
  const isSmallerThanTablet = isMd || isXs || isSm

  if (isSmallerThanTablet) {
    return <NftStakeCardMobile farm={farm} />
  }

  return (
    <StyledCard isActive>
      <PoolCardHeader isStaking={true}>
        <PoolCardHeaderTitle
          title={`Do you have ${farm.lpSymbol}?`}
          subTitle="Stake now and start earning"
        />
        {/*<TokenPairImage {...vaultPoolConfig[pool.vaultKey].tokenImage} width={64} height={64} />*/}
      </PoolCardHeader>
      <NftStakeCardBody farm={farm} account={account} />
    </StyledCard>
  )
}

export default NftStakeCard
