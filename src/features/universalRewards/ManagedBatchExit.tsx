import { useId, useState, type FormEvent } from 'react'
import type { ManagedExit } from './managedBatch'
import { V3Actions, V3Button, V3Error, V3Field, V3Fields, V3Muted } from './styles'

type Choices = ReadonlyMap<bigint, bigint>

export default function ManagedBatchExit({
  choices,
  limit,
  disabled,
  needsNetwork,
  onSwitch,
  onConfirm,
}: {
  choices: Choices
  limit: number
  disabled: boolean
  needsNetwork: boolean
  onSwitch: () => void
  onConfirm: (selections: readonly ManagedExit[], onConfirmed: () => void) => void
}) {
  const title = useId()
  const errorId = useId()
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [invalidId, setInvalidId] = useState<string>()
  const change = (id: string, value: string) => {
    setQuantities((previous) => ({ ...previous, [id]: value }))
    setError('')
    setInvalidId(undefined)
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (disabled) return
    if (needsNetwork) {
      onSwitch()
      return
    }
    const selections: ManagedExit[] = []
    for (const [id, value] of Object.entries(quantities)) {
      if (!value) continue
      const tokenId = BigInt(id)
      const maximum = choices.get(tokenId) ?? BigInt(0)
      if (/^\d{1,39}$/.test(value)) {
        const quantity = BigInt(value)
        if (!quantity) continue
        if (quantity <= maximum) {
          selections.push({ tokenId, quantity })
          continue
        }
      }
      setError(`Enter an amount between 0 and ${maximum} for NFT #${id}.`)
      setInvalidId(id)
      const field = event.currentTarget.elements.namedItem(`exit-${id}`)
      if (field instanceof HTMLElement) field.focus()
      return
    }
    if (!selections.length || selections.length > limit) {
      setError(`Choose between 1 and ${limit} NFTs to unstake.`)
      return
    }
    selections.sort((a, b) => (a.tokenId < b.tokenId ? -1 : 1))
    onConfirm(selections, () => setQuantities({}))
  }

  return (
    <form method="post" aria-labelledby={title} onSubmit={submit}>
      <V3Fields disabled={disabled}>
        <legend id={title}>Unstake multiple NFTs</legend>
        <V3Muted>Enter a quantity for each NFT you want to unstake. Use Harvest afterward to collect rewards.</V3Muted>
        {Array.from(choices, ([tokenId, maximum]) => {
          const id = tokenId.toString()
          return (
            <V3Field key={id} htmlFor={`${title}-${id}`}>
              NFT #{id} · up to {maximum.toString()} units
              <input
                id={`${title}-${id}`}
                name={`exit-${id}`}
                inputMode="numeric"
                maxLength={39}
                placeholder="0"
                value={quantities[id] ?? ''}
                onChange={(event) => change(id, event.target.value)}
                aria-invalid={invalidId === id || undefined}
                aria-describedby={invalidId === id ? errorId : undefined}
              />
            </V3Field>
          )
        })}
        {error && (
          <V3Error id={errorId} role="alert">
            {error}
          </V3Error>
        )}
        <V3Actions>
          <V3Button type="submit">{needsNetwork ? 'Switch network' : 'Unstake selected NFTs'}</V3Button>
        </V3Actions>
      </V3Fields>
    </form>
  )
}
