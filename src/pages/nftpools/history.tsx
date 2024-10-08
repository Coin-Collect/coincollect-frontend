import { useContext } from 'react'
import { FarmsPageLayout, FarmsContext } from 'views/NftFarms'
import FarmCard from 'views/NftFarms/components/FarmCard/FarmCard'
import { getDisplayApr } from 'views/NftFarms/Farms'
import { usePriceCakeBusd } from 'state/nftFarms/hooks'
import useWeb3React from 'hooks/useWeb3React'

const FarmsHistoryPage = () => {
  const { account } = useWeb3React()
  const { chosenFarmsMemoized } = useContext(FarmsContext)
  const cakePrice = usePriceCakeBusd()

  return (
    <>
      {chosenFarmsMemoized.map((farm) => (
        <FarmCard
          key={farm.pid}
          farm={farm}
          displayApr={getDisplayApr(farm.apr)}
          cakePrice={cakePrice}
          account={account}
          removed
        />
      ))}
    </>
  )
}

FarmsHistoryPage.Layout = FarmsPageLayout

export default FarmsHistoryPage
