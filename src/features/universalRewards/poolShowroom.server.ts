import { createPublicClient, http } from 'viem'
import { isLocalForkMode } from 'config/localFork'
import { polygonReadRpcUrls } from 'config/polygonReadRpc'
import { universalRewardsAbi } from './abi'
import { decodeV3Presentation } from './metadata'
import { loadV3PresentationDocument, withV3Presentation } from './poolPresentation'
import { readLocalV3PresentationDocument } from './poolPresentation.server'
import { poolShowroomArtwork, poolShowroomData, type V3PoolShowroomData, type V3PoolTeaser } from './poolShowroom'
import { poolTiming } from './presentation'
import { readV3Pool } from './reader'
import { validateV3Deployment, type V3Deployment } from './runtime'

export async function readV3PoolShowroom(
  deployment: V3Deployment,
  poolId: bigint,
): Promise<{ pool: V3PoolShowroomData; related: V3PoolTeaser[] } | undefined> {
  const document = Promise.resolve()
    .then(() =>
      isLocalForkMode ? readLocalV3PresentationDocument(deployment) : loadV3PresentationDocument(deployment),
    )
    .catch(() => undefined)
  let lastFailure: unknown

  for (const url of polygonReadRpcUrls()) {
    try {
      const client = createPublicClient({ transport: http(url, { timeout: 2_500, retryCount: 0, batch: true }) })
      const snapshot = await client.getBlock()
      await validateV3Deployment(client, deployment, snapshot.number)
      const ledger = { address: deployment.address, abi: universalRewardsAbi, blockNumber: snapshot.number }
      const count = await client.readContract({ ...ledger, functionName: 'poolCount' })
      if (poolId > count) return undefined

      const others = Array.from({ length: 4 }, (_, index) => count - BigInt(index))
        .filter((id) => id > BigInt(0) && id !== poolId)
        .slice(0, 3)
      const [main, records, previews] = await Promise.all([
        readV3Pool(client, deployment, poolId, snapshot),
        document,
        Promise.allSettled(
          others.map((id) => client.readContract({ ...ledger, functionName: 'poolState', args: [id] })),
        ),
      ])
      const related = previews.flatMap<V3PoolTeaser>((item, index) => {
        if (item.status !== 'fulfilled') return []
        const id = others[index]
        const [config] = item.value
        const { presentation } = withV3Presentation(
          { poolId: id, presentation: decodeV3Presentation(config.metadataURI, id) },
          records,
        )
        return [
          {
            id: id.toString(),
            name: presentation.name,
            artwork: presentation.artwork ?? poolShowroomArtwork,
            status: poolTiming({ timestamp: snapshot.timestamp, config }),
          },
        ]
      })
      return { pool: poolShowroomData(withV3Presentation(main, records)), related }
    } catch (error) {
      lastFailure = error
    }
  }
  throw lastFailure ?? new Error('Polygon RPC is unavailable.')
}
