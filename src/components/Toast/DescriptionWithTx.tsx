import { Link, Text } from '@pancakeswap/uikit'
import { getBscScanLink, getPolygonScanLink } from 'utils'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useTranslation } from 'contexts/Localization'
import truncateHash from 'utils/truncateHash'

interface DescriptionWithTxProps {
  description?: string
  txHash?: string
}

const DescriptionWithTx: React.FC<DescriptionWithTxProps> = ({ txHash, children }) => {
  const { chainId } = useActiveWeb3React()
  const { t } = useTranslation()

  return (
    <>
      {typeof children === 'string' ? <Text as="p">{children}</Text> : children}
      {txHash && (
        <Link external href={getPolygonScanLink(txHash, 'transaction', chainId.toString())}>
          {t('View on PolygonScan')}: {truncateHash(txHash, 8, 0)}
        </Link>
      )}
    </>
  )
}

export default DescriptionWithTx
