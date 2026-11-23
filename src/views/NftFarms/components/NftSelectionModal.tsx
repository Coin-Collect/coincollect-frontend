import type { ReactNode } from 'react'
import styled, { css } from 'styled-components'
import {
  AutoRenewIcon,
  Button,
  CheckmarkCircleFillIcon,
  Flex,
  Modal,
  ModalBody,
  Text,
  WarningIcon,
} from '@pancakeswap/uikit'
import { ModalActions } from 'components/Modal'
import CircleLoader from 'components/Loader/CircleLoader'
import { useTranslation } from 'contexts/Localization'
import useTheme from 'hooks/useTheme'
import NoNftsImage from 'views/Nft/market/components/Activity/NoNftsImage'
import { RoundedImage } from 'views/Nft/market/Collection/IndividualNFTPage/shared/styles'

const selectedImageStyle = css`
  position: relative;
  background-color: #f8bbd0;
  border: 2px solid #e91e63;

  &:hover {
    border-color: #e91e63;
  }

  &::after {
    content: '✔';
    content: '✔' / '';
    position: absolute;
    top: 20%;
    left: 80%;
    transform: translate(-50%, -50%);
    font-size: 15px;
    color: white;
    background: rgba(233, 30, 99, 0.8);
    border-radius: 50%;
    padding: 5px;
  }
`

export const NftBox = styled(RoundedImage)<{ $selected?: boolean }>`
  width: 90px;
  height: 90px;
  border-radius: 6px;
  background-color: #ffffff;

  &:hover {
    border: 2px solid #cac7c8;
  }

  ${({ $selected }) => $selected && selectedImageStyle}
`

export const SelectedNftBox = styled(NftBox).attrs({ $selected: true })``

export const NftOption = styled(Flex)`
  border: 0;
  padding: 0;
  background: none;
  width: 96px;
  flex-direction: column;
  align-items: center;
  margin: 4px;
  cursor: pointer;
`

export const Wrapper = styled(Flex)`
  background: ${(props) => props.theme.colors.background};
  border-radius: 16px;
  max-height: 400px;
  overflow-y: auto;
  padding: 15px;
`

export const SelectionInfo = styled(Flex)<{ $error: boolean }>`
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid ${({ theme, $error }) => ($error ? theme.colors.failure : theme.colors.primaryBright)};
  background: ${({ $error }) =>
    $error
      ? 'linear-gradient(135deg, rgba(237, 75, 158, 0.18) 0%, rgba(237, 75, 158, 0.08) 100%)'
      : 'linear-gradient(135deg, rgba(49, 208, 170, 0.18) 0%, rgba(49, 208, 170, 0.08) 100%)'};
  margin-bottom: 16px;
`

export const SelectionCountChip = styled(Flex)<{ $error: boolean }>`
  align-items: center;
  justify-content: center;
  min-width: 90px;
  padding: 6px 12px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 16px;
  color: ${({ theme, $error }) => ($error ? theme.colors.failure : theme.colors.success)};
  background: ${({ $error }) => ($error ? 'rgba(237, 75, 158, 0.12)' : 'rgba(49, 208, 170, 0.12)')};
`

type SelectionOption = {
  key: string
  label: string
  image?: string
  selected: boolean
  disabled?: boolean
  accessibleLabel?: string
  onSelect: () => void
}

export function NftSelectionLimit({ current, max }: { current: number; max: number }) {
  const { t } = useTranslation()
  const overLimit = current > max
  return (
    <SelectionInfo $error={overLimit}>
      <Flex alignItems="center" justifyContent="space-between" width="100%" flexWrap="wrap" style={{ gap: '12px' }}>
        <Flex alignItems="center" style={{ gap: '8px' }}>
          {overLimit ? (
            <WarningIcon width="22px" color="failure" />
          ) : (
            <CheckmarkCircleFillIcon width="22px" color="success" />
          )}
          <Text fontSize="14px" fontWeight={600} color="textSubtle">
            {t('Selected NFTs')}
          </Text>
        </Flex>
        <SelectionCountChip $error={overLimit}>
          {t('%selectedCount%/%amount%', { selectedCount: current, amount: max })}
        </SelectionCountChip>
      </Flex>
      <Text color={overLimit ? 'failure' : 'textSubtle'} fontSize="14px">
        {overLimit
          ? t('Stake limit reached! Please remove extra NFTs to proceed.')
          : t('This selection brings you to %total%/%amount%. Slots remaining: %remaining%.', {
              total: current,
              amount: max,
              remaining: Math.max(max - current, 0),
            })}
      </Text>
    </SelectionInfo>
  )
}

export default function NftSelectionModal({
  title,
  options,
  loading,
  error,
  onRetry,
  onDismiss,
  onConfirm,
  disabled,
  pending,
  before,
  after,
  confirmLabel,
  initialFocus = false,
}: {
  title: string
  options: SelectionOption[]
  loading?: boolean
  error?: boolean
  onRetry: () => void
  onDismiss?: () => void
  onConfirm: () => void
  disabled?: boolean
  pending?: boolean
  before?: ReactNode
  after?: ReactNode
  confirmLabel?: string
  initialFocus?: boolean
}) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  return (
    <Modal
      minWidth="346px"
      bodyPadding="24px 24px 10px 24px"
      title={title}
      headerBackground={theme.colors.gradients.bubblegum}
      onDismiss={onDismiss}
    >
      <ModalBody maxWidth="620px">
        {before}
        <Wrapper>
          {options.length > 0 ? (
            <Flex flexWrap="wrap" justifyContent="center">
              {options.map(({ key, label, image, selected, accessibleLabel, onSelect, disabled: optionDisabled }) => {
                return (
                  <NftOption
                    as="button"
                    type="button"
                    key={key}
                    onClick={onSelect}
                    aria-pressed={selected}
                    aria-label={accessibleLabel || label}
                    disabled={optionDisabled || pending}
                  >
                    <NftBox
                      $selected={selected}
                      src={image || '/images/nfts/no-profile-md.png'}
                      alt=""
                      height={90}
                      width={90}
                    />
                    <Text
                      fontSize="11px"
                      color="textSubtle"
                      mt="6px"
                      textAlign="center"
                      width="100%"
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={label}
                    >
                      {label}
                    </Text>
                  </NftOption>
                )
              })}
            </Flex>
          ) : error ? (
            <Flex p="24px" flexDirection="column" alignItems="center">
              <Button variant="light" onClick={onRetry} width="100%">
                {t('Retry')}
              </Button>
              <Text pt="8px" fontSize="15px">
                {t('There was a temporary network issue while fetching NFTs.')}
              </Text>
              <Text pt="8px" fontSize="15px">
                {t('Please wait a few seconds and press the retry button.')}
              </Text>
            </Flex>
          ) : loading ? (
            <Flex p="24px" margin="0 auto" flexDirection="column" alignItems="center">
              <CircleLoader size="30px" />
              <Text mt={1}>{t('NFTs will be listed shortly...')}</Text>
            </Flex>
          ) : (
            <Flex p="24px" flexDirection="column" alignItems="center">
              <NoNftsImage />
              <Text pt="8px" bold>
                {t('No NFTs found')}
              </Text>
            </Flex>
          )}
        </Wrapper>
        {after}
        <ModalActions>
          <Button variant="secondary" onClick={onDismiss} width="100%" disabled={pending} autoFocus={initialFocus}>
            {t('Cancel')}
          </Button>
          <Button
            width="100%"
            isLoading={pending}
            endIcon={pending ? <AutoRenewIcon spin color="currentColor" /> : null}
            disabled={disabled || pending}
            onClick={onConfirm}
          >
            {pending ? t('Confirming') : confirmLabel ?? t('Confirm')}
          </Button>
        </ModalActions>
      </ModalBody>
    </Modal>
  )
}
