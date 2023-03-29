import { useContext } from 'react'
import { FarmsPageLayout, FarmsContext } from 'views/NftFarms'
import FarmCard from 'views/NftFarms/components/FarmCard/FarmCard'
import { getDisplayApr } from 'views/NftFarms/Farms'
import { usePriceCakeBusd } from 'state/farms/hooks'
import { useWeb3React } from '@web3-react/core'
import { GetStaticProps } from 'next/types'

const FarmsPage = () => {
  const { account } = useWeb3React()
  const { chosenFarmsMemoized } = useContext(FarmsContext)
  const cakePrice = usePriceCakeBusd()

  return (
    <>
      {chosenFarmsMemoized.map((farm) => (
        <FarmCard
          key={farm.pid}
          farm={farm}
          displayApr={getDisplayApr(farm.apr, farm.lpRewardsApr)}
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
