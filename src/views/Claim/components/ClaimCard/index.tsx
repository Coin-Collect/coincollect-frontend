import { CardBody, Flex, Text, CardRibbon, Image, Button, Skeleton } from '@pancakeswap/uikit'
import ConnectWalletButton from 'components/ConnectWalletButton'
import { useTranslation } from 'contexts/Localization'
import { StyledCard } from './StyledCard'
import ClaimCardHeader, { ClaimCardHeaderTitle } from './ClaimCardHeader'
import styled from 'styled-components'
import ClaimAction from './CardActions/ClaimAction'
import { NotEligibleWarning } from '../NotEligibleWarning'
import CardFooter from './CardFooter'

export const RoundedImage = styled(Image)`
  border-radius: ${({ theme }) => theme.radii.default};
  overflow: hidden;
`

const ClaimCard: React.FC<{ claimId: number; claim: any; claimData: any; account: string }> = ({ claimId, claim, claimData, account }) => {
  const { t } = useTranslation()

  return (
    <StyledCard
      isFinished={claim.isFinished}
      ribbon={claim.isFinished && <CardRibbon variantColor="textDisabled" text={t('Finished')} />}
    >
      <ClaimCardHeader isFinished={claim.isFinished}>
      <RoundedImage width={400} height={400} src={claim.imageLink} />
      </ClaimCardHeader>

      <CardBody p={24} pt={10}>
      {claimData.data !== undefined && (claimData.data[claimId].userWeight || 0) === 0 && 
                                      (<NotEligibleWarning requiredToken={claim.requiredToken} nftCount={claimData.data[claimId].nftsToClaim[1].length || 0} remainingClaims={claimData.data[claimId].remainingClaims || 0}  />)}
      <ClaimCardHeaderTitle
          title={claim.name}
          subTitle={claim.description}
          isFinished={claim.isFinished}
        />
        <Flex mt="24px" flexDirection="column">
          {account ? (
            <>
              {claimData.isLoading || claimData.data === undefined ? (
                <Skeleton width="100%" height="52px" />
              ) : claim.isFinished ? (
                <Button disabled>{t('Claim Closed')}</Button>
              ) : claimData.data[claimId].remainingClaims <= 0 ? (
                <Button disabled>{t('Claim Limit Reached')}</Button>
              ) : (claimData.data[claimId].userWeight || 0) === 0 ? (
                <Button disabled>{t(`${claim.requiredToken} required!`)}</Button>
              ) : (claimData.data[claimId].rewardBalance ?? 0) < (claim.baseAmount * (claimData.data[claimId].userWeight || 1)) * (10**18) ? (
                <Button disabled>{t('No Rewards Available')}</Button>
              ) : (
                <ClaimAction claimId={claimId} claim={claim} claimData={claimData} />
              )}
            </>
          ) : (
              <ConnectWalletButton />
          )}
        </Flex>
      </CardBody>
      <CardFooter claim={claim} account={account} />
    </StyledCard>
  )
}

export default ClaimCard
