import { useContext } from 'react'
import { FarmsPageLayout, FarmsContext } from 'views/NftFarms'
import FarmCard from 'views/NftFarms/components/FarmCard/FarmCard'
import StakeableNftsPanel from 'views/NftFarms/components/StakeableNftsPanel'
import { getDisplayApr } from 'views/NftFarms/Farms'
import useDashboard from 'views/NftFarms/hooks/useDashboard'
import { usePriceCakeBusd } from 'state/nftFarms/hooks'
import useWeb3React from 'hooks/useWeb3React'

const FarmsPage = () => {
  const { account } = useWeb3React()
  const { chosenFarmsMemoized } = useContext(FarmsContext)
  const { stakeableFarms, isLoading, totalEligibleNfts, error, refreshWalletNfts } = useDashboard()
  const cakePrice = usePriceCakeBusd()

  return (
    <>
      <StakeableNftsPanel
        account={account}
        isLoading={isLoading}
        stakeableFarms={stakeableFarms}
        totalEligibleNfts={totalEligibleNfts}
        error={error}
        onRetry={refreshWalletNfts}
      />
      {chosenFarmsMemoized.map((farm) => (
        <FarmCard
          key={farm.pid}
          farm={farm}
          displayApr={getDisplayApr(farm.apr)}
          cakePrice={cakePrice}
          account={account}
          removed={false}
        />
      ))}
    </>
  )
}

FarmsPage.Layout = FarmsPageLayout

export default FarmsPage
