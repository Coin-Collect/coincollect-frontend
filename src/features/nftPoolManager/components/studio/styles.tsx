import styled, { css, keyframes } from 'styled-components'

const floatIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`

export const StudioLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
  gap: 22px;
  align-items: start;
  animation: ${floatIn} 320ms ease-out;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`

export const StudioPreviewColumn = styled.div`
  min-width: 0;
  display: grid;
  gap: 12px;
`

export const StudioEyebrow = styled.div`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`

export const EditablePoolCard = styled.article`
  overflow: hidden;
  border: 1px solid ${({ theme }) => `${theme.colors.primary}55`};
  border-radius: 26px;
  background: ${({ theme }) => `linear-gradient(155deg, ${theme.colors.backgroundAlt}, ${theme.colors.background})`};
  box-shadow: 0 24px 70px ${({ theme }) => `${theme.colors.primary}12`}, 0 12px 32px rgba(0, 0, 0, 0.24);
`

export const ArtworkButton = styled.button<{ $src?: string }>`
  position: relative;
  display: block;
  width: 100%;
  height: clamp(210px, 30vw, 330px);
  overflow: hidden;
  border: 0;
  padding: 0;
  cursor: pointer;
  background: ${({ theme, $src }) =>
    $src
      ? `linear-gradient(120deg, ${theme.colors.backgroundAlt}08, ${theme.colors.backgroundAlt}66), url(${$src}) center/cover`
      : `radial-gradient(circle at 75% 25%, ${theme.colors.primary}55, transparent 34%), linear-gradient(135deg, ${theme.colors.backgroundAlt}, ${theme.colors.background})`};

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(8, 10, 22, 0.04) 20%, rgba(8, 10, 22, 0.82) 100%);
    pointer-events: none;
  }

  &:hover > span:last-child,
  &:focus-visible > span:last-child {
    opacity: 1;
    transform: translateY(0);
  }
`

export const ArtworkEmpty = styled.span`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: ${({ theme }) => `${theme.colors.text}bb`};
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

export const ArtworkEditHint = styled.span`
  position: absolute;
  z-index: 2;
  right: 16px;
  bottom: 16px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 11px;
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.invertedContrast};
  background: ${({ theme }) => `${theme.colors.primary}dd`};
  font-size: 12px;
  font-weight: 800;
  opacity: 0;
  transform: translateY(5px);
  transition: opacity 160ms ease, transform 160ms ease;
`

export const CardStatus = styled.span<{ $tone?: 'draft' | 'ready' | 'active' | 'finished' }>`
  position: absolute;
  z-index: 2;
  top: 16px;
  right: 16px;
  border-radius: 999px;
  padding: 7px 11px;
  color: ${({ theme, $tone }) => ($tone === 'ready' ? theme.colors.invertedContrast : theme.colors.text)};
  background: ${({ theme, $tone }) =>
    $tone === 'ready'
      ? theme.colors.success
      : $tone === 'finished'
      ? `${theme.colors.textSubtle}dd`
      : `${theme.colors.background}dd`};
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
`

export const CardArtworkTitle = styled.span`
  position: absolute;
  z-index: 2;
  left: 22px;
  bottom: 18px;
  max-width: calc(100% - 150px);
  overflow: hidden;
  color: #fff;
  font-size: clamp(22px, 3vw, 34px);
  font-weight: 900;
  letter-spacing: -0.05em;
  text-align: left;
  text-overflow: ellipsis;
  text-shadow: 0 3px 18px rgba(0, 0, 0, 0.68);
  white-space: nowrap;
`

export const PoolCardBody = styled.div`
  padding: 18px 20px 20px;
`

export const CardToolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 52px;
`

export const CollectionStackButton = styled.button`
  display: inline-flex;
  align-items: center;
  min-width: 0;
  border: 0;
  padding: 0;
  color: ${({ theme }) => theme.colors.text};
  background: transparent;
  cursor: pointer;
`

export const CollectionStack = styled.span`
  display: inline-flex;
  align-items: center;
  padding-left: 10px;
`

export const CollectionStackImage = styled.img`
  width: 42px;
  height: 42px;
  margin-left: -10px;
  object-fit: cover;
  border: 3px solid ${({ theme }) => theme.colors.backgroundAlt};
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.background};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
`

export const AddCollectionCircle = styled.span`
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  margin-left: -10px;
  border: 1px dashed ${({ theme }) => `${theme.colors.primary}88`};
  border-radius: 50%;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => `${theme.colors.primary}12`};
  font-size: 22px;
  font-weight: 400;
`

export const StackLabel = styled.span`
  margin-left: 8px;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
`

export const EditIcon = styled.span`
  display: inline-grid;
  place-items: center;
  width: 21px;
  height: 21px;
  margin-left: 6px;
  border-radius: 50%;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => `${theme.colors.primary}15`};
  font-size: 11px;
`

export const CardNameButton = styled.button`
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  border: 0;
  padding: 7px 0;
  color: ${({ theme }) => theme.colors.text};
  background: transparent;
  font: inherit;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.04em;
  cursor: pointer;
  text-align: left;
`

export const CardMeta = styled.div`
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 13px;
  line-height: 1.45;
`

export const CardSection = styled.section`
  margin-top: 18px;
`

export const CardSectionHeading = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`

export const RewardAreaButton = styled.button`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  border: 1px solid ${({ theme }) => `${theme.colors.primary}30`};
  border-radius: 14px;
  padding: 10px 12px;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => `${theme.colors.primary}0b`};
  text-align: left;
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease;

  &:hover,
  &:focus-visible {
    border-color: ${({ theme }) => `${theme.colors.primary}88`};
    background: ${({ theme }) => `${theme.colors.primary}16`};
  }
`

export const RewardChip = styled.span<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 6px 9px;
  color: ${({ theme, $primary }) => ($primary ? theme.colors.primary : theme.colors.secondary)};
  background: ${({ theme, $primary }) => ($primary ? `${theme.colors.primary}18` : `${theme.colors.secondary}18`)};
  font-size: 12px;
  font-weight: 800;
`

export const TokenIcon = styled.img`
  width: 19px;
  height: 19px;
  object-fit: cover;
  border-radius: 50%;
`

export const TokenFallback = styled.span`
  display: inline-grid;
  place-items: center;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => `${theme.colors.primary}22`};
  font-size: 9px;
  font-weight: 900;
`

export const CardMetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 18px;

  @media (max-width: 540px) {
    grid-template-columns: 1fr;
  }
`

export const CardMetricButton = styled.button`
  min-width: 0;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 14px;
  padding: 12px;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.background};
  text-align: left;
  cursor: pointer;
  transition: transform 140ms ease, border-color 140ms ease;

  &:hover,
  &:focus-visible {
    transform: translateY(-2px);
    border-color: ${({ theme }) => `${theme.colors.primary}77`};
  }
`

export const MetricLabel = styled.span`
  display: block;
  margin-bottom: 6px;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 11px;
  font-weight: 700;
`

export const MetricValue = styled.strong`
  display: block;
  overflow: hidden;
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const MetricHint = styled.span`
  display: block;
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 10px;
`

export const SharingCallout = styled.div`
  margin-top: 16px;
  border-radius: 15px;
  padding: 13px;
  color: ${({ theme }) => theme.colors.textSubtle};
  background: ${({ theme }) => `${theme.colors.secondary}0e`};
  font-size: 12px;
  line-height: 1.5;
`

export const StudioSidePanel = styled.aside`
  position: sticky;
  top: 18px;
  display: grid;
  gap: 14px;
  min-width: 0;

  @media (max-width: 920px) {
    position: static;
  }
`

export const SidePanel = styled.section`
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 20px;
  padding: 18px;
  background: ${({ theme }) => theme.colors.background};
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.1);
`

export const SidePanelTitle = styled.h2`
  margin: 0 0 14px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 17px;
  letter-spacing: -0.03em;
`

export const SummaryLine = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};
  font-size: 13px;

  &:last-child {
    border-bottom: 0;
  }
  & > span:first-child {
    color: ${({ theme }) => theme.colors.textSubtle};
  }
  & > span:last-child {
    color: ${({ theme }) => theme.colors.text};
    font-weight: 800;
    text-align: right;
  }
`

export const StudioButton = styled.button<{ $secondary?: boolean; $quiet?: boolean }>`
  min-height: 44px;
  border: 1px solid ${({ theme, $secondary }) => ($secondary ? theme.colors.cardBorder : theme.colors.primary)};
  border-radius: 13px;
  padding: 0 15px;
  color: ${({ theme, $secondary }) => ($secondary ? theme.colors.text : theme.colors.invertedContrast)};
  background: ${({ theme, $secondary, $quiet }) =>
    $quiet ? 'transparent' : $secondary ? theme.colors.backgroundAlt : theme.colors.primary};
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};

  &:disabled {
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    filter: brightness(1.06);
  }
`

export const ButtonCluster = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  align-items: center;
`

export const Hint = styled.p`
  margin: 8px 0 0;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 12px;
  line-height: 1.5;
`

export const ModalBackdrop = styled.div`
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(4, 6, 15, 0.72);
  backdrop-filter: blur(8px);
`

export const StudioModal = styled.section`
  width: min(100%, 700px);
  max-height: min(760px, calc(100vh - 40px));
  overflow: auto;
  border: 1px solid ${({ theme }) => `${theme.colors.primary}44`};
  border-radius: 22px;
  padding: 22px;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  box-shadow: 0 30px 100px rgba(0, 0, 0, 0.45);
  animation: ${floatIn} 180ms ease-out;

  @media (max-width: 600px) {
    align-self: end;
    width: 100%;
    max-height: calc(100vh - 16px);
    border-radius: 22px 22px 0 0;
    padding: 18px;
  }
`

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
`

export const ModalTitle = styled.h2`
  margin: 0 0 5px;
  font-size: 22px;
  letter-spacing: -0.04em;
`

export const CloseButton = styled.button`
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 50%;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.background};
  font-size: 20px;
  cursor: pointer;
`

export const ModalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 540px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

export const ArtworkOption = styled.button<{ $selected?: boolean }>`
  overflow: hidden;
  border: 2px solid ${({ theme, $selected }) => ($selected ? theme.colors.primary : theme.colors.cardBorder)};
  border-radius: 13px;
  padding: 0;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.background};
  cursor: pointer;
  text-align: left;

  img {
    display: block;
    width: 100%;
    height: 82px;
    object-fit: cover;
  }
  span {
    display: block;
    padding: 7px 8px;
    font-size: 11px;
    font-weight: 700;
  }
`

export const PickerRow = styled.div<{ $selected?: boolean }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 11px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};
  color: ${({ theme }) => theme.colors.text};

  ${({ $selected, theme }) =>
    $selected &&
    css`
      background: ${theme.colors.primary}08;
    `}
  &:last-child {
    border-bottom: 0;
  }
`

export const PickerIcon = styled.img`
  width: 42px;
  height: 42px;
  object-fit: cover;
  border: 2px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.background};
`

export const PickerAction = styled.button<{ $active?: boolean }>`
  min-height: 34px;
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.cardBorder)};
  border-radius: 10px;
  padding: 0 10px;
  color: ${({ theme, $active }) => ($active ? theme.colors.invertedContrast : theme.colors.text)};
  background: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.background)};
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
`

export const ModalInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 11px;
  padding: 11px 12px;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.input};
  font: inherit;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    outline: 0;
    box-shadow: 0 0 0 3px ${({ theme }) => `${theme.colors.primary}20`};
  }
`

export const ModalSelect = styled.select`
  width: 100%;
  box-sizing: border-box;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 11px;
  padding: 11px 12px;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.input};
  font: inherit;
`

export const ModalField = styled.label`
  display: grid;
  gap: 7px;
  margin-top: 14px;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 12px;
  font-weight: 800;
`

export const ModalDivider = styled.div`
  height: 1px;
  margin: 18px 0;
  background: ${({ theme }) => theme.colors.cardBorder};
`

export const ReviewChecks = styled.div`
  display: grid;
  gap: 6px;
  margin-top: 14px;
`

export const ReviewCheck = styled.div<{ $pass?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0;
  color: ${({ theme, $pass }) => ($pass ? theme.colors.success : theme.colors.failure)};
  font-size: 12px;
  line-height: 1.4;
`
