import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import styled from 'styled-components'
import { v3PoolTypeLabels, type V3PoolType } from 'features/universalRewards/metadata'
import { V3Button, V3Error, V3Muted } from 'features/universalRewards/styles'
import { describeV3Error } from 'features/universalRewards/transactions'
import { EditorBody, EditorDialog, EditorFooter, EditorHeader } from './studioStyles'

const Options = styled.fieldset`
  display: grid;
  gap: 8px;
  padding: 0;
  min-width: 0;
  border: 0;

  legend {
    margin-bottom: 8px;
    font-weight: 700;
  }

  label {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 12px;
    min-height: 54px;
    padding: 12px;
    border: 1px solid ${({ theme }) => theme.colors.cardBorder};
    border-radius: 12px;
    cursor: pointer;
  }

  label[data-selected='true'] {
    background: ${({ theme }) => theme.colors.background};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  input {
    margin: 0;
    accent-color: ${({ theme }) => theme.colors.primary};
  }

  input:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 4px;
  }

  small {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.textSubtle};
    line-height: 1.4;
  }
`

const TypeActions = styled(EditorFooter)`
  gap: 8px;
  flex-wrap: wrap;
`

const descriptions = {
  community: 'For CoinCollect community campaigns.',
  partner: 'For approved CoinCollect collaborations.',
} satisfies Record<V3PoolType, string>

export default function V3PoolTypeEditor({
  value,
  action,
  help,
  onApply,
  onClose,
}: {
  value: V3PoolType
  action: string
  help?: string
  onApply: (type: V3PoolType) => void | Promise<void>
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const saving = useRef(false)
  const titleId = useId()
  const [selected, setSelected] = useState(value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!dialog.current || dialog.current.open) return
    dialog.current.showModal()
    dialog.current.querySelector<HTMLInputElement>('input:checked')?.focus()
  }, [])

  const apply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving.current || selected === value) return
    saving.current = true
    setBusy(true)
    setError('')
    try {
      await onApply(selected)
      dialog.current?.close()
    } catch (failure) {
      setError(describeV3Error(failure))
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  return (
    <EditorDialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        if (saving.current) event.preventDefault()
      }}
    >
      <EditorHeader>
        <h2 id={titleId}>Edit pool type</h2>
      </EditorHeader>
      <form onSubmit={(event) => void apply(event)}>
        <EditorBody>
          <Options disabled={busy}>
            <legend>Pool type</legend>
            {(['community', 'partner'] as const).map((type) => (
              <label key={type} data-selected={selected === type}>
                <input
                  type="radio"
                  name="pool-type"
                  value={type}
                  checked={selected === type}
                  onChange={() => {
                    setSelected(type)
                    setError('')
                  }}
                />
                <span>
                  <strong>{v3PoolTypeLabels[type]}</strong>
                  <small>{descriptions[type]}</small>
                </span>
              </label>
            ))}
          </Options>
          {help && <V3Muted>{help}</V3Muted>}
          {busy && <V3Muted role="status">Saving pool type…</V3Muted>}
          {error && <V3Error role="alert">{error}</V3Error>}
        </EditorBody>
        <TypeActions>
          <V3Button type="button" $secondary disabled={busy} onClick={() => dialog.current?.close()}>
            Cancel
          </V3Button>
          <V3Button type="submit" disabled={busy || value === selected}>
            {action}
          </V3Button>
        </TypeActions>
      </form>
    </EditorDialog>
  )
}
