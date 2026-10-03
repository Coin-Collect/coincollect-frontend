import styled, { keyframes } from 'styled-components'
import { MetricGrid, Panel } from './styles'

const shimmer = keyframes`
  100% { background-position: -220% 0; }
`

export const OverviewMetricGrid = styled(MetricGrid)`
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 620px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

export const OverviewMetric = styled.div`
  min-width: 0;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 15px;
  padding: 15px 16px;
`

export const OverviewMetricLabel = styled.div`
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 12px;
  line-height: 1.3;
  margin-bottom: 9px;
`

export const OverviewMetricValue = styled.div`
  color: ${({ theme }) => theme.colors.text};
  font-size: clamp(22px, 2.3vw, 28px);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
`

export const OverviewSection = styled.section`
  margin-top: 28px;
`

export const OverviewSectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 14px;
  margin-bottom: 13px;

  @media (max-width: 560px) {
    align-items: flex-start;
  }
`

export const OverviewSectionTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 18px;
  letter-spacing: -0.025em;
`

export const OverviewSectionSubtitle = styled.p`
  margin: 4px 0 0;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 12px;
  line-height: 1.45;
`

export const OverviewPanel = styled(Panel)`
  padding: 16px;
`

export const AttentionList = styled.div`
  display: grid;
  gap: 8px;
`

export const AttentionLink = styled.a`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 58px;
  box-sizing: border-box;
  padding: 11px 13px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 13px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  transition: border-color 120ms ease, transform 120ms ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary}88;
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 3px solid ${({ theme }) => `${theme.colors.primary}55`};
    outline-offset: 2px;
  }

  @media (max-width: 560px) {
    align-items: flex-start;
  }
`

export const AttentionItemTitle = styled.span`
  display: block;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const AttentionItemStatus = styled.span`
  display: block;
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 12px;
  line-height: 1.35;
`

export const AttentionAction = styled.span`
  flex: 0 0 auto;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
`

export const RecentPoolGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`

export const RecentPoolLink = styled.a`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  min-height: 68px;
  box-sizing: border-box;
  padding: 13px 14px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 13px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  transition: border-color 120ms ease, transform 120ms ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary}88;
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 3px solid ${({ theme }) => `${theme.colors.primary}55`};
    outline-offset: 2px;
  }
`

export const RecentPoolName = styled.span`
  display: block;
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const RecentPoolMeta = styled.span`
  display: block;
  overflow: hidden;
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const RecentPoolStatus = styled.span<{ $tone?: 'active' | 'muted' | 'warning' }>`
  flex: 0 0 auto;
  padding: 5px 8px;
  border-radius: 999px;
  background: ${({ theme, $tone }) =>
    $tone === 'active'
      ? `${theme.colors.success}18`
      : $tone === 'warning'
      ? `${theme.colors.warning}1e`
      : `${theme.colors.textSubtle}18`};
  color: ${({ theme, $tone }) =>
    $tone === 'active' ? theme.colors.success : $tone === 'warning' ? theme.colors.warning : theme.colors.textSubtle};
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
`

export const OverviewSkeleton = styled.div`
  min-height: 68px;
  border-radius: 13px;
  background: linear-gradient(
    100deg,
    ${({ theme }) => theme.colors.backgroundAlt} 30%,
    ${({ theme }) => theme.colors.cardBorder} 48%,
    ${({ theme }) => theme.colors.backgroundAlt} 66%
  );
  background-size: 220% 100%;
  animation: ${shimmer} 1.3s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

export const OverviewEmptyState = styled.div`
  padding: 20px 16px;
  border: 1px dashed ${({ theme }) => theme.colors.cardBorder};
  border-radius: 13px;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 13px;
  line-height: 1.5;
`

export const ViewAllLink = styled.a`
  flex: 0 0 auto;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
`
