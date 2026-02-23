import { useEffect, useState } from 'react'
import styled from 'styled-components'
import {
  Stepper,
  Step,
  StepStatus,
  Card,
  CardBody,
  Heading,
  Text,
  Button,
  Box,
  CheckmarkIcon,
  Flex,
  useTooltip,
  TooltipText,
  LogoRoundIcon,
  Skeleton,
  useModal,
  Link,
} from '@pancakeswap/uikit'
import { NextLinkFromReactRouter as RouterLink } from 'components/NextLink'
import useWeb3React from 'hooks/useWeb3React'
import { Ifo, Minting } from 'config/constants/types'
import { WalletIfoData } from 'views/Nft/market/Collection/Minting/types'
import { useTranslation } from 'contexts/Localization'
import useTokenBalance from 'hooks/useTokenBalance'
import Container from 'components/Layout/Container'
import { useProfile } from 'state/profile/hooks'
import Balance from 'components/Balance'
import { nftsBaseUrl } from 'views/Nft/market/constants'
import ConnectWalletButton from 'components/ConnectWalletButton'
import { FlexGap } from 'components/Layout/Flex'
import { getBalanceNumber } from 'utils/formatBalance'
import VaultStakeModal from 'views/Pools/components/CakeVaultCard/VaultStakeModal'
import { BIG_ZERO } from 'utils/bigNumber'
import BigNumber from 'bignumber.js'
import { useIfoPoolVault, useIfoPoolCredit, useIfoWithApr } from 'state/pools/hooks'
import { useBUSDCakeAmount } from 'hooks/useBUSDPrice'
import { useCheckVaultApprovalStatus, useVaultApprove } from 'views/Pools/hooks/useApprove'

interface Props {
  ifo: Minting
  walletIfoData: WalletIfoData
  isLive?: boolean
}

const Wrapper = styled(Container)`
  margin-left: -16px;
  margin-right: -16px;
  padding-top: 48px;
  padding-bottom: 48px;

  ${({ theme }) => theme.mediaQueries.sm} {
    margin-left: -24px;
    margin-right: -24px;
  }
`

const InlineLink = styled(Link)`
  display: inline;
`

const SmallStakePoolCard = styled(Box)`
  margin-top: 16px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  background-color: ${({ theme }) => theme.colors.background};
`

const AnimatedStepCard = styled(Card)<{ $isActive: boolean }>`
  opacity: ${({ $isActive }) => ($isActive ? 1 : 0.72)};
  transform: ${({ $isActive }) => ($isActive ? 'scale(1.015)' : 'scale(0.985)')};
  transition: opacity 280ms ease, transform 280ms ease, box-shadow 280ms ease;
  box-shadow: ${({ $isActive, theme }) => ($isActive ? theme.shadows.level2 : 'none')};
`

const Step1 = ({ hasProfile }: { hasProfile: boolean }) => {
  const { t } = useTranslation()
  const ifoPoolVault = useIfoPoolVault()
  const credit = useIfoPoolCredit()
  const { pool } = useIfoWithApr()

  const { isVaultApproved, setLastUpdated } = useCheckVaultApprovalStatus(pool.vaultKey)
  const { handleApprove, pendingTx } = useVaultApprove(pool.vaultKey, setLastUpdated)

  const { targetRef, tooltip, tooltipVisible } = useTooltip(
    <Box>
      <span>
        {t('NFT rarity is random. Minting more can improve your chance of getting a stronger one.')}
      </span>{' '}
      <InlineLink
        external
        href="https://docs.coincollect.org"
      >
        {t('Please refer to our docs for more details.')}
      </InlineLink>
    </Box>,
    {},
  )

  const creditDollarValue = useBUSDCakeAmount(getBalanceNumber(credit))

  const stakingTokenBalance = pool?.userData?.stakingTokenBalance
    ? new BigNumber(pool.userData.stakingTokenBalance)
    : BIG_ZERO

  const [onPresentStake] = useModal(
    <VaultStakeModal
      stakingMax={stakingTokenBalance}
      performanceFee={ifoPoolVault.fees.performanceFeeAsDecimal}
      pool={pool}
    />,
  )

  return (
    <CardBody>
      {tooltipVisible && tooltip}
      <Heading as="h4" color="secondary" mb="16px">
        {t('Mint your NFT')}
      </Heading>
      <Box>
        <Text color="textSubtle" small>
          {t('Press Mint, approve the transaction, and your NFT will be sent to your wallet.')}
        </Text>
        <TooltipText as="span" fontWeight={700} ref={targetRef} color="textSubtle" small>
          {t('How to get a stronger NFT')}
        </TooltipText>
      </Box>
      {false && (
        <SmallStakePoolCard borderRadius="default" p="16px">
          <FlexGap justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="16px">
            <Flex>
              <LogoRoundIcon style={{ alignSelf: 'flex-start' }} width={32} height={32} />
              <Box ml="16px">
                <Text bold fontSize="12px" textTransform="uppercase" color="secondary">
                  {t('Your max CAKE entry')}
                </Text>
                <Balance fontSize="20px" bold decimals={5} value={getBalanceNumber(credit)} />
                <Text fontSize="12px" color="textSubtle">
                  {creditDollarValue !== undefined ? (
                    <Balance
                      value={creditDollarValue}
                      fontSize="12px"
                      color="textSubtle"
                      decimals={2}
                      prefix="~"
                      unit=" USD"
                    />
                  ) : (
                    <Skeleton mt="1px" height={16} width={64} />
                  )}
                </Text>
              </Box>
            </Flex>
            {isVaultApproved ? (
              <Button onClick={onPresentStake}>{t('Stake')} CAKE</Button>
            ) : (
              <Button disabled={pendingTx} onClick={handleApprove}>
                {t('Enable pool')}
              </Button>
            )}
          </FlexGap>
        </SmallStakePoolCard>
      )}
    </CardBody>
  )
}

const Step2 = ({ hasProfile, isLive, isCommitted }: { hasProfile: boolean; isLive: boolean; isCommitted: boolean }) => {
  const { t } = useTranslation()
  return (
    <CardBody>
      <Heading as="h4" color="secondary" mb="16px">
        {t('Claim Your Tokens!')}
      </Heading>
      <Text color="textSubtle" small>
        {t('When the IFO sales are live, you can “commit” your CAKE to buy the tokens being sold.')} <br />
      </Text>
        <Button external={true} as="a" href="/claim" mt="16px">
          {t('Claim Now')}
        </Button>
      
    </CardBody>
  )
}

const IfoSteps: React.FC<Props> = ({ ifo, walletIfoData, isLive }) => {
  const { poolBasic, poolUnlimited } = walletIfoData
  const { hasActiveProfile } = useProfile()
  const { account } = useWeb3React()
  const { t } = useTranslation()
  const { balance } = useTokenBalance(ifo.currency.address)
  const isCommitted =
    poolBasic.amountTokenCommittedInLP.isGreaterThan(0) || poolUnlimited.amountTokenCommittedInLP.isGreaterThan(0)
  const stepsValidationStatus = [
    hasActiveProfile,
    balance.isGreaterThan(0),
    isCommitted,
    poolBasic.hasClaimed || poolUnlimited.hasClaimed,
  ]
  const [activeAnimatedStep, setActiveAnimatedStep] = useState(0)
  const totalSteps = stepsValidationStatus.length

  useEffect(() => {
    if (totalSteps === 0) {
      return undefined
    }
    const intervalId = window.setInterval(() => {
      setActiveAnimatedStep((prevStep) => (prevStep + 1) % totalSteps)
    }, 2200)

    return () => window.clearInterval(intervalId)
  }, [totalSteps])

  const getStatusProp = (index: number): StepStatus => {
    if (index < 0 || index >= totalSteps) {
      return 'future'
    }
    if (index < activeAnimatedStep) {
      return 'past'
    }
    if (index === activeAnimatedStep) {
      return 'current'
    }

    return 'future'
  }

  const getConnectorStatus = (index: number): StepStatus => {
    if (index < activeAnimatedStep) {
      return 'past'
    }
    return 'future'
  }

  const renderCardBody = (step: number) => {
    const isStepValid = stepsValidationStatus[step]

    const renderAccountStatus = () => {
      if (!account) {
        return <ConnectWalletButton />
      }

      if (isStepValid) {
        return (
          <Flex alignItems="center">
            <Text color="success" bold mr="8px">
              {t('Profile Active!')}
            </Text>
            <CheckmarkIcon color="success" />
          </Flex>
        )
      }

      return (
        <Button as={RouterLink} to={`${nftsBaseUrl}/profile/${account.toLowerCase()}`}>
          {t('Activate your Profile')}
        </Button>
      )
    }

    switch (step) {
      case 0:
        return (
          <CardBody>
            <Heading as="h4" color="secondary" mb="16px">
              {t('Add Some POL')}
            </Heading>
            <Text color="textSubtle" small mb="16px">
              {t('You’ll need an active PancakeSwap Profile to take part in an IFO!')}
            </Text>
            {/*renderAccountStatus()*/}
          </CardBody>
        )
      case 1:
        return <Step1 hasProfile={hasActiveProfile} />
      case 2:
        return <Step2 hasProfile={hasActiveProfile} isLive={isLive} isCommitted={isCommitted} />
      case 3:
        return (
          <CardBody>
            <Heading as="h4" color="secondary" mb="16px">
              {t('Claim your tokens and achievement')}
            </Heading>
            <Text color="textSubtle" small>
              {t(
                'After the IFO sales finish, you can claim any IFO tokens that you bought, and any unspent CAKE tokens will be returned to your wallet.',
              )}
            </Text>
            <Button external={true} as="a" href="/nftpools" mt="16px">
              {t('Stake NFT')}
            </Button>
          </CardBody>
        )
      default:
        return null
    }
  }

  return (
    <Wrapper>
      <Heading id="ifo-how-to" as="h2" scale="xl" color="secondary" mb="24px" textAlign="center">
        {t('How to Take Part in the Public Sale')}
      </Heading>
      <Stepper>
        {stepsValidationStatus.map((_, index) => (
          <Step
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            index={index}
            statusFirstPart={getStatusProp(index)}
            statusSecondPart={getConnectorStatus(index)}
          >
            <AnimatedStepCard $isActive={index === activeAnimatedStep}>{renderCardBody(index)}</AnimatedStepCard>
          </Step>
        ))}
      </Stepper>
    </Wrapper>
  )
}

export default IfoSteps
