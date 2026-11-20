import styled from 'styled-components'
import { V3Button, V3Section } from './styles'

export const StudioBar = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px 24px;
  padding-bottom: 22px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};

  h1 {
    margin: 0 0 4px;
    font-weight: 800;
    font-size: 2.75rem;
    letter-spacing: -0.04em;
    line-height: 1.12;
    &:focus {
      outline: none;
    }
  }
  p {
    margin: 0;
  }

  @media (max-width: 560px) {
    h1 {
      font-size: 2rem;
    }
  }
`

export const PoolToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-block: 22px 14px;
`

export const PoolFilters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;

  button {
    padding: 8px 12px;
    min-height: 44px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    color: ${({ theme }) => theme.colors.textSubtle};
    cursor: pointer;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 700;
  }
  button[aria-pressed='true'] {
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.cardBorder};
    background: ${({ theme }) => theme.colors.backgroundAlt};
  }
  button:hover {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.backgroundAlt};
  }
  button:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
  }
`

export const PoolSearch = styled.input`
  flex: 0 1 245px;
  min-width: min(100%, 180px);
  min-height: 44px;
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 8px;
  color: inherit;
  font: inherit;
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
  }
  &::placeholder {
    color: ${({ theme }) => theme.colors.textSubtle};
  }
  @media (max-width: 560px) {
    flex-basis: 100%;
  }
`

export const PoolList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  overflow: hidden;

  > li + li {
    border-top: 1px solid ${({ theme }) => theme.colors.cardBorder};
  }
`

export const PoolRow = styled.li`
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) minmax(110px, 0.55fr) minmax(100px, 0.38fr) auto;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;

  h3,
  p {
    margin: 0;
    overflow-wrap: anywhere;
  }
  h3 {
    font-weight: 750;
  }
  small,
  time {
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.textSubtle};
  }
  @media (max-width: 715px) {
    grid-template-columns: 52px minmax(0, 1fr) auto;
    gap: 8px 12px;
    .pool-timing {
      grid-column: 2;
    }
    .pool-funding {
      grid-column: 2;
    }
    .pool-actions {
      grid-column: 3;
      grid-row: 1 / span 3;
      align-self: center;
    }
  }
  @media (max-width: 359px) {
    grid-template-columns: 46px minmax(0, 1fr);
    .pool-actions {
      grid-column: 2;
      grid-row: auto;
      align-self: start;
    }
  }
`

export const PoolThumb = styled.img`
  width: 100%;
  aspect-ratio: 4 / 3;
  height: auto;
  object-fit: cover;
  border-radius: 8px;
`

export const PoolState = styled.span<{ $state: 'Live' | 'Upcoming' | 'Finished' }>`
  display: block;
  font-weight: 700;
  color: ${({ theme, $state }) =>
    $state === 'Live' ? theme.colors.success : $state === 'Upcoming' ? theme.colors.warning : theme.colors.textSubtle};
`

export const PoolPagination = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 14px;
`

export const PoolEmpty = styled.div`
  padding: 30px 20px;
  border: 1px dashed ${({ theme }) => theme.colors.cardBorder};
  border-radius: 14px;

  h3,
  p {
    margin: 0 0 6px;
  }
`

export const WorkspaceHeading = styled.h2`
  margin: 0;
  font-size: 1.55rem;
  letter-spacing: -0.025em;
  line-height: 1.25;
  overflow-wrap: anywhere;
  &:focus {
    outline: none;
  }
`

export const WorkspaceActions = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-block: 12px 20px;
`

export const WorkspaceBack = styled(V3Button)`
  margin-block: 18px 10px;
`

export const PresentationFields = styled.div`
  display: grid;
  gap: 14px;
  min-width: 0;

  select,
  textarea {
    width: 100%;
  }
`

export const PresentationWorkspace = styled.div<{ $editing: boolean; $preview: boolean }>`
  display: grid;
  grid-template-columns: ${({ $editing, $preview }) =>
    $editing && $preview ? 'minmax(0, 390px) minmax(0, 1fr)' : 'minmax(0, 1fr)'};
  align-items: start;
  gap: 20px;
  margin-bottom: 20px;

  @media (max-width: 850px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const FundingDisclosure = styled.details`
  margin-block: 8px;

  > summary {
    width: fit-content;
    min-height: 44px;
    padding-block: 11px;
    cursor: pointer;
    font-weight: 700;
  }

  > summary:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 3px;
  }

  > div + div {
    margin-top: 12px;
  }
`

export const FundingSplit = styled.ul`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr));
  gap: 12px 20px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;

  li {
    display: grid;
    align-content: start;
    gap: 4px;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  span,
  small {
    color: ${({ theme }) => theme.colors.textSubtle};
  }
`

export const RewardBudgetSection = styled(V3Section)`
  scroll-margin-top: 90px;
`
