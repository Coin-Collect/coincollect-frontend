import styled from 'styled-components'

export const AdminPage = styled.main`
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 20px 72px;
  color: ${({ theme }) => theme.colors.text};
`

export const AccessPage = styled.main`
  min-height: min(680px, calc(100vh - 180px));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px 72px;
  color: ${({ theme }) => theme.colors.text};
`

export const AccessCard = styled.section`
  width: min(100%, 390px);
  box-sizing: border-box;
  text-align: center;
  padding: 38px 30px 34px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 24px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.text};
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.18);
`

export const AccessMark = styled.div`
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  margin: 0 auto 20px;
  border-radius: 16px;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  font-size: 23px;
  font-weight: 800;
`

export const AccessTitle = styled.h1`
  margin: 0 0 9px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 25px;
  letter-spacing: -0.04em;
`

export const AccessText = styled.p`
  margin: 0 auto 24px;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 14px;
  line-height: 1.5;
`

export const AdminHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`

export const AdminTitle = styled.h1`
  font-size: 30px;
  line-height: 1.15;
  letter-spacing: -0.04em;
  margin: 0 0 8px;
`

export const AdminSubtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSubtle};
  max-width: 680px;
  line-height: 1.5;
`

export const AdminNav = styled.nav`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
  margin-bottom: 28px;
`

export const NavLink = styled.a<{ $active?: boolean }>`
  color: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.textSubtle)};
  background: ${({ theme, $active }) => ($active ? theme.colors.backgroundAlt : 'transparent')};
  border-radius: 12px;
  padding: 9px 12px;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: background 120ms ease, color 120ms ease;

  &:hover {
    background: ${({ theme }) => theme.colors.backgroundAlt};
    color: ${({ theme }) => theme.colors.primary};
  }
`

export const Panel = styled.section`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
`

export const PanelTitle = styled.h2`
  font-size: 18px;
  margin: 0 0 14px;
  letter-spacing: -0.02em;
`

export const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
`

export const Metric = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border-radius: 14px;
  padding: 16px;
`

export const MetricLabel = styled.div`
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 12px;
  margin-bottom: 8px;
`

export const MetricValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.03em;
`

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 13px;
  font-weight: 600;
`

export const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.input};
  color: ${({ theme }) => theme.colors.text};
  padding: 11px 12px;
  font-size: 14px;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}22;
  }
`

export const Select = styled.select`
  width: 100%;
  box-sizing: border-box;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.input};
  color: ${({ theme }) => theme.colors.text};
  padding: 11px 12px;
  font-size: 14px;
`

export const TextArea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.input};
  color: ${({ theme }) => theme.colors.text};
  padding: 11px 12px;
  min-height: 100px;
  resize: vertical;
  font: inherit;
`

export const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 20px;
`

export const ActionButton = styled.button<{ $secondary?: boolean }>`
  border: 0;
  border-radius: 11px;
  padding: 11px 15px;
  background: ${({ theme, $secondary }) => ($secondary ? theme.colors.backgroundAlt : theme.colors.primary)};
  color: ${({ theme, $secondary }) => ($secondary ? theme.colors.text : theme.colors.invertedContrast)};
  font-weight: 700;
  cursor: pointer;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};

  &:disabled {
    cursor: not-allowed;
  }
`

export const StatusPill = styled.span<{ $status?: string }>`
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 5px 9px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  background: ${({ theme, $status }) =>
    $status === 'ACTIVE'
      ? `${theme.colors.success}22`
      : $status === 'FINISHED'
      ? `${theme.colors.textSubtle}20`
      : `${theme.colors.warning}25`};
  color: ${({ theme, $status }) =>
    $status === 'ACTIVE'
      ? theme.colors.success
      : $status === 'FINISHED'
      ? theme.colors.textSubtle
      : theme.colors.warning};
`

export const TableWrap = styled.div`
  overflow-x: auto;
`

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

  th,
  td {
    text-align: left;
    padding: 13px 10px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};
    white-space: nowrap;
  }

  th {
    color: ${({ theme }) => theme.colors.textSubtle};
    font-size: 12px;
    font-weight: 600;
  }
`

export const Notice = styled.div<{ $error?: boolean }>`
  border-radius: 12px;
  padding: 12px 14px;
  background: ${({ theme, $error }) => ($error ? `${theme.colors.failure}18` : `${theme.colors.warning}18`)};
  color: ${({ theme, $error }) => ($error ? theme.colors.failure : theme.colors.text)};
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 16px;
`

export const Muted = styled.span`
  color: ${({ theme }) => theme.colors.textSubtle};
`

export const LinkText = styled.a`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  font-weight: 600;
`
