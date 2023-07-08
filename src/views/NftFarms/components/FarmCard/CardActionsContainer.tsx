import { Button, Flex, Text } from '@pancakeswap/uikit'
import BigNumber from 'bignumber.js'
import ConnectWalletButton from 'components/ConnectWalletButton'
import { ToastDescriptionWithTx } from 'components/Toast'
import { useTranslation } from 'contexts/Localization'
import { useErc721CollectionContract } from 'hooks/useContract'
import useToast from 'hooks/useToast'
import useCatchTxError from 'hooks/useCatchTxError'
import { useCallback, useState } from 'react'
import { useAppDispatch } from 'state'
import { fetchFarmUserDataAsync } from 'state/nftFarms'
import { DeserializedNftFarm } from 'state/types'
import styled from 'styled-components'
import { getAddress } from 'utils/addressHelpers'
import useApproveNftFarm from '../../hooks/useApproveFarm'
import HarvestAction from './HarvestAction'
import StakeAction from './StakeAction'
import Select from 'components/Select/Select'
import { useFarmFromPid } from 'state/nftFarms/hooks'
import nftFarmsConfig from 'config/constants/nftFarms'

const Action = styled.div`
  padding-top: 16px;
`
export interface NftFarmWithStakedValue extends DeserializedNftFarm {
  apr?: number
}

interface FarmCardActionsProps {
  farm: NftFarmWithStakedValue
  account?: string
  addLiquidityUrl?: string
  cakePrice?: BigNumber
  lpLabel?: string
}

const CardActions: React.FC<FarmCardActionsProps> = ({ farm, account, addLiquidityUrl, cakePrice, lpLabel }) => {
  const { t } = useTranslation()
  const { toastSuccess } = useToast()
  const { fetchWithCatchTxError, loading: pendingTx } = useCatchTxError()
  const [collectionOption, setCollectionOption] = useState(0)
  const { pid, nftAddresses } = farm
  const { allowance, tokenBalance, stakedBalance, earnings } = farm.userData || {}
  const smartNftPoolAddress = farm.contractAddresses ? getAddress(farm.contractAddresses) : null
  const earnLabel = farm.earningToken ? farm.earningToken.symbol: t('COLLECT')
  const sideRewards = farm.sideRewards ? farm.sideRewards : []
  const isApproved = account && allowance[collectionOption]
  const dispatch = useAppDispatch()

  
  const alternativeCollectionPool = collectionOption > 0 ? nftFarmsConfig.find(farm => farm.pid === collectionOption) : null
  const nftAddress = getAddress(alternativeCollectionPool ? alternativeCollectionPool.nftAddresses : nftAddresses)
  const nftContract = useErc721CollectionContract(nftAddress)


  const { onApprove } = useApproveNftFarm(nftContract, smartNftPoolAddress)

  const handleApprove = useCallback(async () => {
    const receipt = await fetchWithCatchTxError(() => {
      return onApprove()
    })
    if (receipt?.status) {
      toastSuccess(t('Contract Enabled'), <ToastDescriptionWithTx txHash={receipt.transactionHash} />)
      dispatch(fetchFarmUserDataAsync({ account, pids: [pid] }))
    }
  }, [onApprove, dispatch, account, pid, t, toastSuccess, fetchWithCatchTxError])

  const renderApprovalOrStakeButton = () => {
    return isApproved ? (
      <StakeAction
        stakedBalance={stakedBalance}
        tokenBalance={tokenBalance}
        stakingLimit={farm.stakingLimit}
        tokenName={farm.lpSymbol}
        pid={collectionOption > 0 ? collectionOption : pid}
        apr={farm.apr}
        lpLabel={lpLabel}
        cakePrice={cakePrice}
        addLiquidityUrl={addLiquidityUrl}
      />
    ) : (
      <Button mt="8px" width="100%" disabled={pendingTx} onClick={handleApprove}>
        {t('Enable Contract')}
      </Button>
    )
  }

  // TODO: Get data from nftFarms.ts constants
  const dummyCollectionNames = [
                                { name: 'Starter', value: 1 },
                                { name: 'Bronze', value: 2 },
                                { name: 'Silver', value: 3 },
                                { name: 'Gold', value: 4 },
                                { name: 'Use Original NFT', value: 0 },
                              ];

  const handleCollectionOptionChange = (option): void => {
    setCollectionOption(option.value)
  }

  return (
    <Action>
      {smartNftPoolAddress && !farm.isFinished && (
        <Select
          mb={15}
          placeHolderText="Use Coincollect Nfts"
          options={dummyCollectionNames.map((collection) => ({
            label: collection.name,
            value: collection.value,
          }))}
          onOptionChange={handleCollectionOptionChange}
        />
      )}
      <Flex>
        <Text bold textTransform="uppercase" color="secondary" fontSize="12px" pr="4px">
          {sideRewards.length == 0 ? "COLLECT" : "REWARDS"}
        </Text>
        <Text bold textTransform="uppercase" color="textSubtle" fontSize="12px">
          {t('Earned')}
        </Text>
      </Flex>
      <HarvestAction earnings={earnings} pid={pid} earnLabel={earnLabel} sideRewards={sideRewards} />
      <Flex>
        <Text bold textTransform="uppercase" color="secondary" fontSize="12px" pr="4px">
          {farm.lpSymbol.replace('CoinCollect', '')}
        </Text>
        <Text bold textTransform="uppercase" color="textSubtle" fontSize="12px">
          {t('Staked')}
        </Text>
      </Flex>
      {!account ? <ConnectWalletButton mt="8px" width="100%" /> : renderApprovalOrStakeButton()}
    </Action>
  )
}

export default CardActions
