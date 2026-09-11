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
  gap: 10px;
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
  grid-template-columns: minmax(0, 1fr) 100px;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};
`

export const WarningList = styled.ul`
  margin: 10px 0 0;
  padding-left: 18px;
  color: ${({ theme }) => theme.colors.warning};
  font-size: 13px;
  line-height: 1.6;
`
