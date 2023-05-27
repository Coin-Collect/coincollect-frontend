import BigNumber from 'bignumber.js'

import { CardBody, Flex, Text, CardRibbon, Image, Button, Skeleton } from '@pancakeswap/uikit'
import ConnectWalletButton from 'components/ConnectWalletButton'
import { useTranslation } from 'contexts/Localization'
import { BIG_ZERO } from 'utils/bigNumber'
import { DeserializedPool } from 'state/types'
import { TokenPairImage } from 'components/TokenImage'
import AprRow from './AprRow'
import { StyledCard } from './StyledCard'
import ClaimCardHeader, { ClaimCardHeaderTitle } from './ClaimCardHeader'
import CardActions from './CardActions'
import styled from 'styled-components'

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
              ) : (claimData.data[claimId].rewardBalance ?? 0) === 0 ? (
                <Button disabled>{t('Insufficient Balance')}</Button>
              ) : (claimData.data[claimId].weight ?? 0) === 0 ? (
                <Button disabled>{t(`${claim.requiredToken} required!`)}</Button>
              ) : claim.isFinished ? (
                <Button disabled>{t('Claim Closed')}</Button>
              ) : (
                <Button isLoading={true} disabled={claim.isFinished}>
                  {t(`Claim ${claim.baseAmount * (claimData.data[claimId].weight ?? 1)} ${claim.rewardToken}`)}
                </Button>
              )}
            </>
          ) : (
            <>
              <Text mb="10px" textTransform="uppercase" fontSize="12px" color="textSubtle" bold>
                {t('Start earning')}
              </Text>
              <ConnectWalletButton />
            </>
          )}
        </Flex>
      </CardBody>
    </StyledCard>
  )
}

export default ClaimCard