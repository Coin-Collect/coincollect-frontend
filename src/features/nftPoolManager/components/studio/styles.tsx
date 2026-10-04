import styled, { css, keyframes } from 'styled-components'

const floatIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`

export const StudioLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(310px, 0.6fr);
  gap: 22px;
  align-items: start;
  animation: ${floatIn} 320ms ease-out;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`

export const StudioModeBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin: 0 0 18px;
  padding: 6px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 18px;
  background: ${({ theme }) => `${theme.colors.backgroundAlt}cc`};

  @media (max-width: 560px) {
    align-items: stretch;
    flex-direction: column;
  }
`

export const StudioModeOptions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`

export const StudioModeButton = styled.button<{ $active: boolean }>`
  display: grid;
  gap: 2px;
  min-width: 150px;
  border: 1px solid ${({ theme, $active }) => ($active ? `${theme.colors.primary}44` : 'transparent')};
  border-radius: 13px;
  padding: 9px 13px;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme, $active }) => ($active ? theme.colors.background : 'transparent')};
  text-align: left;
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease;

  strong {
    font-size: 13px;
    line-height: 1.25;
  }

  small {
    color: ${({ theme }) => theme.colors.textSubtle};
    font-size: 10px;
    line-height: 1.3;
  }

  &:hover,
  &:focus-visible {
    border-color: ${({ theme }) => `${theme.colors.primary}77`};
  }

  @media (max-width: 420px) {
    min-width: 0;
  }
`

export const StudioAutosave = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;

  &::before {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.success};
    box-shadow: 0 0 0 4px ${({ theme }) => `${theme.colors.success}18`};
    content: '';
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

export const SharingCallout = styled.details`
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 16px;
  color: ${({ theme }) => theme.colors.textSubtle};
  background: ${({ theme }) => `${theme.colors.secondary}0e`};
  font-size: 12px;
  line-height: 1.5;
`

export const SharingSummary = styled.summary`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 54px;
  padding: 10px 14px;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  list-style: none;

  &::-webkit-details-marker {
    display: none;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -3px;
  }

  &::after {
    color: ${({ theme }) => theme.colors.primary};
    content: '+';
    font-size: 20px;
    font-weight: 600;
  }

  details[open] &::after {
    content: '−';
  }
`

export const SharingSummaryCopy = styled.span`
  display: grid;
  gap: 2px;

  strong {
    font-size: 13px;
  }

  small {
    color: ${({ theme }) => theme.colors.textSubtle};
    font-size: 11px;
  }
`

export const SharingContent = styled.div`
  padding: 0 14px 14px;
`

export const StudioSidePanel = styled.aside`
  position: sticky;
  top: 18px;
  min-width: 0;

  @media (max-width: 920px) {
    position: static;
  }
`

export const LaunchInspector = styled.section`
  overflow: hidden;
  border: 1px solid ${({ theme }) => `${theme.colors.primary}30`};
  border-radius: 22px;
  padding: 18px;
  color: ${({ theme }) => theme.colors.text};
  background: linear-gradient(
    155deg,
    ${({ theme }) => `${theme.colors.backgroundAlt}f5`},
    ${({ theme }) => theme.colors.background}
  );
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.14);
`

export const InspectorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 17px;

  h2 {
    margin: 3px 0 0;
    font-size: 19px;
    letter-spacing: -0.04em;
  }

  p {
    margin: 5px 0 0;
    color: ${({ theme }) => theme.colors.textSubtle};
    font-size: 11px;
    line-height: 1.45;
  }
`

export const InspectorEyebrow = styled.span`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`

export const InspectorStatus = styled.span<{ $ready: boolean }>`
  flex: 0 0 auto;
  border: 1px solid ${({ theme, $ready }) => `${$ready ? theme.colors.success : theme.colors.warning}55`};
  border-radius: 999px;
  padding: 6px 9px;
  color: ${({ theme, $ready }) => ($ready ? theme.colors.success : theme.colors.warning)};
  background: ${({ theme, $ready }) => `${$ready ? theme.colors.success : theme.colors.warning}12`};
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

export const InspectorMetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 16px;
`

export const InspectorMetric = styled.div`
  min-width: 0;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 14px;
  padding: 10px 11px;
  background: ${({ theme }) => `${theme.colors.background}bb`};

  span {
    display: block;
    overflow: hidden;
    color: ${({ theme }) => theme.colors.textSubtle};
    font-size: 10px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    display: block;
    overflow: hidden;
    margin-top: 5px;
    color: ${({ theme }) => theme.colors.text};
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const InspectorSection = styled.div`
  padding: 14px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.cardBorder};
`

export const InspectorSectionHeading = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 9px;

  strong {
    font-size: 12px;
  }

  span {
    color: ${({ theme }) => theme.colors.textSubtle};
    font-size: 10px;
  }
`

export const InspectorRewardList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

export const InspectorFundingStatus = styled.div<{ $funded: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 11px;

  &::before {
    width: 7px;
    height: 7px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: ${({ theme, $funded }) => ($funded ? theme.colors.success : theme.colors.warning)};
    content: '';
  }
`

export const InspectorDisclosure = styled.details`
  border-top: 1px solid ${({ theme }) => theme.colors.cardBorder};
`

export const InspectorDisclosureSummary = styled.summary`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 13px 0;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  list-style: none;

  &::-webkit-details-marker {
    display: none;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  &::after {
    color: ${({ theme }) => theme.colors.primary};
    content: '＋';
    font-size: 14px;
  }

  details[open] &::after {
    content: '−';
  }

  span:first-child {
    font-size: 12px;
    font-weight: 800;
  }

  span:last-child {
    color: ${({ theme }) => theme.colors.textSubtle};
    font-size: 10px;
  }
`

export const InspectorDisclosureContent = styled.div`
  padding: 0 0 14px;
`

export const InspectorFact = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  font-size: 11px;

  span:first-child {
    color: ${({ theme }) => theme.colors.textSubtle};
  }

  span:last-child {
    color: ${({ theme }) => theme.colors.text};
    font-weight: 800;
    text-align: right;
  }
`

export const InspectorNotice = styled.div<{ $warning?: boolean }>`
  margin-top: 14px;
  border: 1px solid ${({ theme, $warning }) => `${$warning ? theme.colors.warning : theme.colors.success}38`};
  border-radius: 14px;
  padding: 11px 12px;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme, $warning }) => `${$warning ? theme.colors.warning : theme.colors.success}0c`};

  strong {
    display: block;
    margin-bottom: 4px;
    color: ${({ theme, $warning }) => ($warning ? theme.colors.warning : theme.colors.success)};
    font-size: 11px;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSubtle};
    font-size: 11px;
    line-height: 1.45;
  }
`

export const InspectorIssueList = styled.div`
  display: grid;
  gap: 7px;
  margin-top: 9px;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 11px;
  line-height: 1.45;
`

export const InspectorActions = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 15px;

  & > button {
    width: 100%;
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
  border: 1px solid
    ${({ theme, $secondary, $quiet }) =>
      $quiet ? 'transparent' : $secondary ? theme.colors.cardBorder : theme.colors.primary};
  border-radius: 13px;
  padding: 0 15px;
  color: ${({ theme, $secondary, $quiet }) =>
    $quiet || $secondary ? theme.colors.text : theme.colors.invertedContrast};
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
  z-index: 1200;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  overflow: hidden;
  overscroll-behavior: contain;
  background: rgba(4, 6, 15, 0.72);
  backdrop-filter: blur(8px);
`

export const StudioModal = styled.section`
  width: min(100%, 700px);
  max-height: min(760px, calc(100dvh - 40px));
  overflow: auto;
  overscroll-behavior: contain;
  border: 1px solid ${({ theme }) => `${theme.colors.primary}44`};
  border-radius: 22px;
  padding: 22px;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  box-shadow: 0 30px 100px rgba(0, 0, 0, 0.45);
  animation: ${floatIn} 180ms ease-out;

  @media (max-width: 600px) {
    width: 100%;
    max-height: calc(100dvh - 24px);
    border-radius: 22px;
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

  &:disabled {
    cursor: default;
  }
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
  gap: 10px;
  margin-top: 14px;
`

export const ReviewCheckGroup = styled.section<{ $status: 'BLOCK' | 'WARN' | 'PASS' }>`
  overflow: hidden;
  border: 1px solid
    ${({ theme, $status }) =>
      `${
        $status === 'BLOCK' ? theme.colors.failure : $status === 'WARN' ? theme.colors.warning : theme.colors.success
      }55`};
  border-radius: 15px;
  background: ${({ theme, $status }) => {
    const accent =
      $status === 'BLOCK' ? theme.colors.failure : $status === 'WARN' ? theme.colors.warning : theme.colors.success
    return `linear-gradient(145deg, ${accent}0d, ${theme.colors.background})`
  }};
`

export const ReviewGroupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 10px 13px;
  border-bottom: 1px solid ${({ theme }) => `${theme.colors.cardBorder}88`};
  background: ${({ theme }) => `${theme.colors.backgroundAlt}55`};
`

export const ReviewGroupMark = styled.span<{ $status: 'BLOCK' | 'WARN' | 'PASS' }>`
  display: grid;
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 50%;
  color: ${({ theme, $status }) =>
    $status === 'BLOCK' ? theme.colors.failure : $status === 'WARN' ? theme.colors.warning : theme.colors.success};
  background: ${({ theme, $status }) =>
    `${
      $status === 'BLOCK' ? theme.colors.failure : $status === 'WARN' ? theme.colors.warning : theme.colors.success
    }22`};
  font-size: 15px;
  font-weight: 900;
`

export const ReviewGroupTitle = styled.div`
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 2px;

  & > strong {
    color: ${({ theme }) => theme.colors.text};
    font-size: 12px;
    font-weight: 900;
  }

  & > span {
    color: ${({ theme }) => theme.colors.textSubtle};
    font-size: 10px;
    line-height: 1.35;
  }
`

export const ReviewGroupCount = styled.span<{ $status: 'BLOCK' | 'WARN' | 'PASS' }>`
  display: inline-flex;
  min-width: 28px;
  justify-content: center;
  align-items: center;
  border-radius: 999px;
  padding: 4px 8px;
  color: ${({ theme, $status }) =>
    $status === 'BLOCK' ? theme.colors.failure : $status === 'WARN' ? theme.colors.warning : theme.colors.success};
  background: ${({ theme, $status }) =>
    `${
      $status === 'BLOCK' ? theme.colors.failure : $status === 'WARN' ? theme.colors.warning : theme.colors.success
    }18`};
  font-size: 10px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
`

export const ReviewCheck = styled.div<{ $status: 'PASS' | 'WARN' | 'BLOCK' }>`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 10px 13px;
  color: ${({ theme, $status }) =>
    $status === 'PASS' ? theme.colors.success : $status === 'WARN' ? theme.colors.warning : theme.colors.failure};
  font-size: 11px;
  line-height: 1.45;

  & + & {
    border-top: 1px solid ${({ theme }) => `${theme.colors.cardBorder}66`};
  }

  & > strong {
    display: grid;
    flex: 0 0 18px;
    width: 18px;
    height: 18px;
    place-items: center;
    margin-top: -1px;
    border-radius: 50%;
    background: ${({ theme, $status }) =>
      `${
        $status === 'BLOCK' ? theme.colors.failure : $status === 'WARN' ? theme.colors.warning : theme.colors.success
      }18`};
    font-size: 10px;
    font-weight: 900;
  }

  & > div {
    min-width: 0;
    flex: 1;
  }
`

export const ReviewToggle = styled.button`
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-top: 1px solid ${({ theme }) => `${theme.colors.cardBorder}66`};
  padding: 10px 12px;
  color: ${({ theme }) => theme.colors.primary};
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  font-weight: 900;
  transition: background 140ms ease, color 140ms ease;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => `${theme.colors.primary}12`};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }
`

export const ReviewCheckDetail = styled.span`
  display: block;
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 11px;
  line-height: 1.5;
  overflow-wrap: anywhere;
`

export const ReviewSummary = styled.div<{ $ok: boolean }>`
  display: grid;
  gap: 4px;
  margin-top: 14px;
  border: 1px solid ${({ theme, $ok }) => ($ok ? theme.colors.success : theme.colors.failure)};
  border-radius: 12px;
  padding: 12px 14px;
  color: ${({ theme, $ok }) => ($ok ? theme.colors.success : theme.colors.failure)};
  background: ${({ theme }) => theme.colors.background};
  font-size: 12px;
  line-height: 1.5;

  & > span {
    color: ${({ theme }) => theme.colors.textSubtle};
  }
`
