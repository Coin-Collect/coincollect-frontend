import { useState } from 'react'
import type { V3PoolType } from 'features/universalRewards/metadata'
import { v3PoolType } from 'features/universalRewards/presentation'
import type { V3StudioPreviewProps } from 'features/universalRewards/V3StudioPool'
import V3FarmCard from '../FarmCard/V3FarmCard'
import V3PoolTypeEditor from './V3PoolTypeEditor'

export default function V3StudioPoolPreview({ pool, deployment, poolTypeEditor }: V3StudioPreviewProps) {
  const [editor, setEditor] = useState<NonNullable<V3StudioPreviewProps['poolTypeEditor']> & { value: V3PoolType }>()
  return (
    <section aria-label="FarmCard preview">
      <V3FarmCard
        pool={pool}
        deployment={deployment}
        preview
        onEditPoolType={poolTypeEditor ? () => setEditor({ ...poolTypeEditor, value: v3PoolType(pool) }) : undefined}
      />
      {editor && (
        <V3PoolTypeEditor
          value={editor.value}
          action={editor.action}
          help={editor.help}
          onApply={editor.save}
          onClose={() => setEditor(undefined)}
        />
      )}
    </section>
  )
}
