import styled from 'styled-components'

export const StudioSummary = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

export const SummaryCard = styled.div`
  min-width: 0;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.background};
`

export const SummaryLabel = styled.div`
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 7px;
`

export const SummaryValue = styled.div`
  color: ${({ theme }) => theme.colors.text};
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.04em;
`

export const FilterBar = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(170px, 0.6fr) auto;
  gap: 12px;
  align-items: end;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`

export const NftPoolList = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1040px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

export const AdminPoolCard = styled.article`
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 20px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;

  &:hover {
    transform: translateY(-3px);
    border-color: ${({ theme }) => `${theme.colors.primary}66`};
    box-shadow: 0 18px 36px rgba(0, 0, 0, 0.18);
  }
`

export const AdminPoolArtwork = styled.div`
  position: relative;
  height: 154px;
  overflow: hidden;
  background: ${({ theme }) => `radial-gradient(circle at 75% 20%, ${theme.colors.primary}55, transparent 38%), ${theme.colors.background}`};
`

export const AdminPoolArtworkImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

export const AdminPoolArtworkVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

export const AdminPoolArtworkShade = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(5, 7, 18, 0.03) 25%, rgba(5, 7, 18, 0.85) 100%);
  pointer-events: none;
`

export const AdminPoolStatus = styled.span<{ $status?: string }>`
  position: absolute;
  top: 12px;
  right: 12px;
  border-radius: 999px;
  padding: 6px 9px;
  color: #fff;
  background: ${({ theme, $status }) =>
    $status === 'ACTIVE' ? `${theme.colors.success}dd` : $status === 'FINISHED' ? `${theme.colors.textSubtle}dd` : `${theme.colors.warning}dd`};
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

export const AdminPoolArtworkTitle = styled.div`
  position: absolute;
  right: 14px;
  bottom: 12px;
  left: 14px;
  overflow: hidden;
  color: #fff;
  font-size: 21px;
  font-weight: 900;
  letter-spacing: -0.04em;
  text-overflow: ellipsis;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.7);
  white-space: nowrap;
`

export const AdminPoolCardBody = styled.div`
  display: grid;
  gap: 12px;
  padding: 15px;
`

export const AdminPoolCardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`

export const AdminPoolIconStack = styled.div`
  display: flex;
  align-items: center;
  padding-left: 9px;
`

export const AdminPoolIcon = styled.img`
  width: 34px;
  height: 34px;
  margin-left: -9px;
  border: 2px solid ${({ theme }) => theme.colors.backgroundAlt};
  border-radius: 50%;
  object-fit: cover;
  background: ${({ theme }) => theme.colors.background};
`

export const AdminPoolIconCount = styled.span`
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  margin-left: -9px;
  border: 2px solid ${({ theme }) => theme.colors.backgroundAlt};
  border-radius: 50%;
  color: ${({ theme }) => theme.colors.textSubtle};
  background: ${({ theme }) => theme.colors.background};
  font-size: 11px;
  font-weight: 900;
`

export const AdminPoolRewardRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
`

export const AdminPoolRewardChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 999px;
  padding: 5px 8px;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => `${theme.colors.primary}15`};
  font-size: 11px;
  font-weight: 800;
`

export const AdminPoolTokenIcon = styled.img`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  object-fit: cover;
`

export const AdminPoolTokenFallback = styled.span`
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => `${theme.colors.primary}2b`};
  font-size: 8px;
  font-weight: 900;
`

export const AdminPoolMetricRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
`

export const AdminPoolMetric = styled.div`
  min-width: 0;
  padding: 10px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background};
`

export const AdminPoolMetricLabel = styled.div`
  margin-bottom: 4px;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

export const AdminPoolMetricValue = styled.div`
  overflow: hidden;
  color: ${({ theme }) => theme.colors.text};
  font-size: 13px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const AdminPoolCardActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  padding-top: 2px;
`

export const NftPoolRow = styled.article`
  display: grid;
  grid-template-columns: minmax(220px, 1.4fr) minmax(150px, 1fr) minmax(130px, 0.8fr) auto;
  gap: 18px;
  align-items: center;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.background};

  @media (max-width: 900px) {
    grid-template-columns: minmax(220px, 1fr) minmax(140px, 0.8fr) auto;

    > :nth-child(3) {
      display: none;
    }
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
    gap: 12px;

    > :nth-child(3) {
      display: block;
    }
  }
`

export const PoolIdentity = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
`

export const PoolThumb = styled.img`
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  object-fit: cover;
  border-radius: 13px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
`

export const PoolThumbVideo = styled.video`
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  object-fit: cover;
  border-radius: 13px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
`

export const PoolName = styled.div`
  min-width: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 15px;
  font-weight: 750;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const PoolMeta = styled.div`
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 12px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const PoolColumn = styled.div`
  min-width: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 13px;
  line-height: 1.55;
`

export const ColumnLabel = styled.div`
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-bottom: 3px;
  text-transform: uppercase;
`

export const PoolActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  white-space: nowrap;

  @media (max-width: 620px) {
    justify-content: flex-start;
  }
`

export const SoftLink = styled.a`
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 11px;
  border-radius: 10px;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
`

export const PrimaryLink = styled(SoftLink)`
  min-height: 38px;
  padding: 0 14px;
  color: ${({ theme }) => theme.colors.invertedContrast};
  background: ${({ theme }) => theme.colors.primary};
  box-shadow: 0 8px 18px ${({ theme }) => `${theme.colors.primary}33`};

  &:hover {
    color: ${({ theme }) => theme.colors.invertedContrast};
    filter: brightness(1.04);
  }
`

export const DetailHero = styled.div`
  position: relative;
  overflow: hidden;
  min-height: 178px;
  display: flex;
  align-items: flex-end;
  padding: 24px;
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  isolation: isolate;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: linear-gradient(90deg, ${({ theme }) => theme.colors.backgroundAlt} 0%, transparent 78%);
  }
`

export const DetailHeroImage = styled.img`
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.38;
`

export const DetailHeroContent = styled.div`
  max-width: 700px;
`

export const DetailTitle = styled.h2`
  margin: 10px 0 7px;
  color: ${({ theme }) => theme.colors.text};
  font-size: clamp(24px, 4vw, 36px);
  letter-spacing: -0.05em;
`

export const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`

export const CollectionList = styled.div`
  display: grid;
  gap: 8px;
`

export const CollectionLine = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};

  &:last-child {
    border-bottom: 0;
  }
`

export const CollectionName = styled.div`
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
  font-weight: 700;
`

export const CollectionAddress = styled.div`
  color: ${({ theme }) => theme.colors.textSubtle};
  font-family: monospace;
  font-size: 11px;
  margin-top: 3px;
`

export const WeightValue = styled.div`
  flex: 0 0 auto;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 15px;
  font-weight: 800;
`

export const DraftGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
  gap: 16px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`

export const DraftCollectionRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 100px auto;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};

  @media (max-width: 620px) {
    grid-template-columns: minmax(0, 1fr) 92px;

    > :last-child {
      grid-column: 1 / -1;
    }
  }
`

export const WarningList = styled.ul`
  margin: 10px 0 0;
  padding-left: 18px;
  color: ${({ theme }) => theme.colors.warning};
  font-size: 13px;
  line-height: 1.6;
`

export const BuilderShell = styled.div`
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  gap: 18px;
  align-items: start;

  @media (max-width: 780px) {
    grid-template-columns: 1fr;
  }
`

export const StepNav = styled.nav`
  position: sticky;
  top: 20px;
  display: grid;
  gap: 5px;
  padding: 8px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.background};

  @media (max-width: 780px) {
    position: static;
    display: flex;
    overflow-x: auto;
  }
`

export const StepButton = styled.button<{ $active?: boolean; $complete?: boolean }>`
  display: flex;
  align-items: center;
  gap: 9px;
  border: 0;
  border-radius: 11px;
  padding: 10px 11px;
  text-align: left;
  white-space: nowrap;
  color: ${({ theme, $active }) => ($active ? theme.colors.text : theme.colors.textSubtle)};
  background: ${({ theme, $active }) => ($active ? theme.colors.backgroundAlt : 'transparent')};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &::before {
    content: ${({ $complete }) => ($complete ? "'✓'" : "'•'")};
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    color: ${({ theme, $complete }) => ($complete ? theme.colors.success : theme.colors.textSubtle)};
    background: ${({ theme, $active }) => ($active ? `${theme.colors.primary}20` : theme.colors.backgroundAlt)};
    font-size: 12px;
  }
`

export const BuilderContent = styled.div`
  min-width: 0;
  display: grid;
  gap: 14px;
`

export const AssetRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px auto;
  gap: 12px;
  align-items: end;
  padding: 13px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};

  &:last-child {
    border-bottom: 0;
  }

  @media (max-width: 620px) {
    grid-template-columns: minmax(0, 1fr) 92px;
    > :last-child {
      grid-column: 1 / -1;
    }
  }
`

export const TokenChip = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
  font-weight: 700;
`

export const TokenDot = styled.span`
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  flex: 0 0 30px;
  border-radius: 10px;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => `${theme.colors.primary}18`};
  font-size: 11px;
  font-weight: 800;
`

export const PreviewCard = styled.div`
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
`

export const PreviewImage = styled.div<{ $src?: string }>`
  height: 112px;
  background: ${({ theme, $src }) =>
    $src
      ? `linear-gradient(90deg, ${theme.colors.backgroundAlt}22, ${theme.colors.backgroundAlt}88), url(${$src}) center/cover`
      : theme.colors.backgroundAlt};
`

export const PreviewBody = styled.div`
  padding: 16px;
`

export const Readiness = styled.div<{ $tone?: 'good' | 'warn' | 'bad' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 13px;
  border-radius: 12px;
  color: ${({ theme, $tone }) =>
    $tone === 'good' ? theme.colors.success : $tone === 'bad' ? theme.colors.failure : theme.colors.warning};
  background: ${({ theme, $tone }) =>
    $tone === 'good'
      ? `${theme.colors.success}16`
      : $tone === 'bad'
      ? `${theme.colors.failure}16`
      : `${theme.colors.warning}16`};
  font-size: 13px;
  font-weight: 700;
`

export const LaunchHero = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  padding: 22px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.background};

  @media (max-width: 640px) {
    flex-direction: column;
  }
`

export const LaunchSteps = styled.div`
  display: grid;
  gap: 8px;
`

export const LaunchStep = styled.div<{ $active?: boolean; $done?: boolean; $blocked?: boolean }>`
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid ${({ theme, $active }) => ($active ? `${theme.colors.primary}66` : theme.colors.cardBorder)};
  border-radius: 13px;
  background: ${({ theme, $active }) => ($active ? `${theme.colors.primary}0d` : theme.colors.background)};
  color: ${({ theme, $blocked }) => ($blocked ? theme.colors.failure : theme.colors.text)};

  &::before {
    content: ${({ $done }) => ($done ? "'✓'" : "'•'")};
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: ${({ theme, $done }) => ($done ? `${theme.colors.success}20` : theme.colors.backgroundAlt)};
    color: ${({ theme, $done }) => ($done ? theme.colors.success : theme.colors.textSubtle)};
    font-weight: 800;
  }
`

export const LaunchCheckList = styled.div`
  display: grid;
  gap: 6px;
`

export const LaunchCheckRow = styled.div<{ $status?: string }>`
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};
  font-size: 13px;
  color: ${({ theme, $status }) => ($status === 'BLOCK' ? theme.colors.failure : theme.colors.text)};

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    gap: 3px;
  }
`

export const LaunchPill = styled.span<{ $tone?: 'good' | 'warn' | 'bad' }>`
  display: inline-flex;
  width: fit-content;
  align-items: center;
  border-radius: 999px;
  padding: 5px 9px;
  background: ${({ theme, $tone }) =>
    `${$tone === 'good' ? theme.colors.success : $tone === 'bad' ? theme.colors.failure : theme.colors.warning}1b`};
  color: ${({ theme, $tone }) =>
    $tone === 'good' ? theme.colors.success : $tone === 'bad' ? theme.colors.failure : theme.colors.warning};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
`

export const SmallAction = styled.button`
  border: 0;
  padding: 0;
  color: ${({ theme }) => theme.colors.primary};
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
`
