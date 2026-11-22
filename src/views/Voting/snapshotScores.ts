type SnapshotStrategy = {
  name: string
  params: unknown
  network?: string
}

export type SnapshotScores = Record<string, number>[]

export async function fetchSnapshotScores(
  space: string,
  strategies: SnapshotStrategy[],
  network: string,
  addresses: string[],
  snapshot: number,
): Promise<SnapshotScores> {
  const response = await fetch('https://score.snapshot.org/api/scores', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ params: { space, network, snapshot, strategies, addresses } }),
  })
  if (!response.ok) throw new Error('Snapshot score request failed.')

  const data: unknown = await response.json()
  const result = data && typeof data === 'object' && 'result' in data ? data.result : undefined
  const scores = result && typeof result === 'object' && 'scores' in result ? result.scores : undefined
  if (!Array.isArray(scores) || scores.length !== strategies.length) {
    throw new Error('Snapshot returned an unexpected score response.')
  }
  return scores.map((score: unknown) => {
    if (!score || typeof score !== 'object' || Array.isArray(score)) {
      throw new Error('Snapshot returned an invalid strategy score.')
    }
    const entries = Object.entries(score).map(([address, value]) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error('Snapshot returned an invalid voting score.')
      }
      return [address, value] as const
    })
    return Object.fromEntries(entries)
  })
}
