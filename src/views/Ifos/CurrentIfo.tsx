import type { Ifo as IfoConfig } from 'config/constants/types'
import { ifosConfig } from 'config/constants'
import styled from 'styled-components'
import { Box } from '@pancakeswap/uikit'

import useGetPublicIfoV2Data from 'views/Ifos/hooks/v2/useGetPublicIfoData'
import useGetWalletIfoV3Data from 'views/Ifos/hooks/v3/useGetWalletIfoData'
import Container from 'components/Layout/Container'

import { IfoCurrentCard } from './components/IfoFoldableCard'
import IfoLayout, { IfoLayoutWrapper } from './components/IfoLayout'
import IfoPoolVaultCard from './components/IfoPoolVaultCard'
import IfoQuestions from './components/IfoQuestions'
import IfoSteps from './components/IfoSteps'

const IfoStepBackground = styled(Box)`
  background: ${({ theme }) => theme.colors.gradients.bubblegum};
`

/**
 * Note: currently there should be only 1 active IFO at a time
 */
const activeIfo = ifosConfig.find((ifo) => ifo.isActive)

const CurrentIfo = ({ ifo }: { ifo: IfoConfig }) => {
  const publicIfoData = useGetPublicIfoV2Data(ifo)
  const walletIfoData = useGetWalletIfoV3Data(ifo)

  return (
    <IfoLayout id="current-ifo" py={['24px', '24px', '40px']}>
      <Container>
        <IfoLayoutWrapper>
          <IfoPoolVaultCard />
          <IfoCurrentCard ifo={ifo} publicIfoData={publicIfoData} walletIfoData={walletIfoData} />
        </IfoLayoutWrapper>
      </Container>
      <IfoStepBackground>
        <Container>
          <IfoSteps isLive={publicIfoData.status === 'live'} ifo={ifo} walletIfoData={walletIfoData} />
        </Container>
      </IfoStepBackground>
      <Container>
        <IfoQuestions />
      </Container>
    </IfoLayout>
  )
}

const Ifo = () => activeIfo ? <CurrentIfo ifo={activeIfo} /> : <IfoQuestions />

export default Ifo
