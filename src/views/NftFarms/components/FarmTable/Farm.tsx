import styled from 'styled-components'
import { useFarmUser } from 'state/nftFarms/hooks'
import { useTranslation } from 'contexts/Localization'
import { Text, TokenImage } from '@pancakeswap/uikit'
import { Token } from '@coincollect/sdk'
import { getBalanceNumber } from 'utils/formatBalance'

export interface FarmProps {
  label: string
  pid: number
  nftAddress: string
}

const Container = styled.div`
  padding-left: 16px;
  display: flex;
  align-items: center;

  ${({ theme }) => theme.mediaQueries.sm} {
    padding-left: 32px;
  }
`

const TokenWrapper = styled.div`
  padding-right: 8px;
  width: 24px;

  ${({ theme }) => theme.mediaQueries.sm} {
    width: 40px;
  }
`

const Farm: React.FunctionComponent<FarmProps> = ({label, pid, nftAddress}) => {
  const { stakedBalance } = useFarmUser(pid)
  const { t } = useTranslation()

  const handleRenderFarming = (): JSX.Element => {
    if (stakedBalance.toNumber()) {
      return (
        <Text color="secondary" fontSize="12px" bold textTransform="uppercase">
          {t('Staking')}
        </Text>
      )
    }

    return null
  }

  return (
    <Container>
      <TokenWrapper>
        <TokenImage src={`/images/tokens/${nftAddress}.svg`} width={40} height={40} />
      </TokenWrapper>
      <div>
        {handleRenderFarming()}
        <Text bold>{label}</Text>
      </div>
    </Container>
  )
}

export default Farm
