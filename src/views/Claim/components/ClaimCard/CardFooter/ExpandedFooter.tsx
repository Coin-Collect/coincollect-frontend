import { memo } from 'react'
import BigNumber from 'bignumber.js'
import styled from 'styled-components'
import { getBalanceNumber } from 'utils/formatBalance'
import { useTranslation } from 'contexts/Localization'
import {
  Flex,
  MetamaskIcon,
  Text,
  TooltipText,
  LinkExternal,
  TimerIcon,
  Skeleton,
  useTooltip,
  Button,
  Link,
  HelpIcon,
} from '@pancakeswap/uikit'
import { BASE_POLYGON_SCAN_URL } from 'config'
import { useCurrentBlock } from 'state/block/hooks'
import { useVaultPoolByKey, useVaultPools } from 'state/pools/hooks'
import { DeserializedPool } from 'state/types'
import { getAddress, getVaultPoolAddress } from 'utils/addressHelpers'
import { registerToken } from 'utils/wallet'
import { getBscScanLink } from 'utils'
import Balance from 'components/Balance'
import { getPoolBlockInfo } from 'views/Pools/helpers'
import { BIG_ZERO } from 'utils/bigNumber'

interface ExpandedFooterProps {
  claim: any
  account: string
}

const ExpandedWrapper = styled(Flex)`
  svg {
    height: 14px;
    width: 14px;
  }
`

const ExpandedFooter: React.FC<ExpandedFooterProps> = ({ claim, account }) => {
  const { t } = useTranslation()

  const {
    name
  } = claim

  
  const isMetaMaskInScope = !!window.ethereum?.isMetaMask
 

  

  const { targetRef: rewardPerNftTargetRef, tooltip: rewardPerNftTooltip, tooltipVisible: rewardPerNftTooltipVisible } = useTooltip(
    t('Subtracted automatically from each yield harvest and burned.'),
    { placement: 'top-start' },
  )


  const {
    targetRef: totalRewardTargetRef,
    tooltip: totalRewardTooltip,
    tooltipVisible: totalRewardTooltipVisible,
  } = useTooltip(t('The total amount of %symbol% distributed in this claim pool', { symbol: claim.rewardToken }), {
    placement: 'right-start',
  })

  const {
    targetRef: nftLimitTargetRef,
    tooltip: nftLimitTooltip,
    tooltipVisible: nftLimitTooltipVisible,
  } = useTooltip(t('This is the maximum number of NFTs that can be utilized to claim rewards.'), {
    placement: 'bottom',
  })

  return (
    <ExpandedWrapper flexDirection="column">
      <Flex mb="2px" justifyContent="space-between" alignItems="center">
        <Text small>{t('Reward per NFT')}:</Text>
        <Flex alignItems="flex-start">
          {true ? (
            <>
              <Balance small value={100} decimals={0} unit={` Collect`} />
              <span ref={rewardPerNftTargetRef}>
                <HelpIcon color="textSubtle" width="20px" ml="6px" mt="4px" />
              </span>
            </>
          ) : (
            <Skeleton width="90px" height="21px" />
          )}
          {rewardPerNftTooltipVisible && rewardPerNftTooltip}
        </Flex>
      </Flex>

      <Flex mb="2px" justifyContent="space-between" alignItems="center">
        <Text small>{t('Total Reward Pool')}:</Text>
        <Flex alignItems="flex-start">
          {true ? (
            <>
              <Balance small value={claim.totalReward} decimals={0} unit={` Collect`} />
              <span ref={totalRewardTargetRef}>
                <HelpIcon color="textSubtle" width="20px" ml="6px" mt="4px" />
              </span>
            </>
          ) : (
            <Skeleton width="90px" height="21px" />
          )}
          {totalRewardTooltipVisible && totalRewardTooltip}
        </Flex>
      </Flex>



      <Flex mb="2px" justifyContent="space-between" alignItems="center">
        <Text small>{t('Max NFT')}:</Text>
        <Flex alignItems="flex-start">
          {true ? (
            <>
              <Balance small value={claim.nftLimit} decimals={0} unit={` NFT`} />
              <span ref={nftLimitTargetRef}>
                <HelpIcon color="textSubtle" width="20px" ml="6px" mt="4px" />
              </span>
            </>
          ) : (
            <Skeleton width="90px" height="21px" />
          )}
          {nftLimitTooltipVisible && nftLimitTooltip}
        </Flex>
      </Flex>
      

      {
      <Flex mb="2px" justifyContent="flex-end">
        <LinkExternal href={`/info/token/a`} bold={false} small>
          {t('See Token Info')}
        </LinkExternal>
      </Flex>
      }

      <Flex mb="2px" justifyContent="flex-end">
        <LinkExternal href={`/info/token/a`} bold={false} small>
          {t('View Project Site')}
        </LinkExternal>
      </Flex>
      {true && (
        <Flex mb="2px" justifyContent="flex-end">
          <LinkExternal
            href={`${BASE_POLYGON_SCAN_URL}/address/`}
            bold={false}
            small
          >
            {t('View Contract')}
          </LinkExternal>
        </Flex>
      )}
      {account && isMetaMaskInScope && true && (
        <Flex justifyContent="flex-end">
          <Button
            variant="text"
            p="0"
            height="auto"
            onClick={() => registerToken(`/info/token/a`, `TokenSymbol`, 18)} // Put decimal var instead 18
          >
            <Text color="primary" fontSize="14px">
              {t('Add to Metamask')}
            </Text>
            <MetamaskIcon ml="4px" />
          </Button>
        </Flex>
      )}
    </ExpandedWrapper>
  )
}

export default memo(ExpandedFooter)
