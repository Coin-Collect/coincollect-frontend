import { NftPoolDraft } from './types'

export const NFT_POOL_DRAFT_STORAGE_KEY = 'coincollect.nft-pool-studio.drafts.v1'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

export function loadNftPoolDrafts(): NftPoolDraft[] {
  if (!canUseStorage()) return []
  try {
    const value = JSON.parse(window.localStorage.getItem(NFT_POOL_DRAFT_STORAGE_KEY) || '[]')
    return Array.isArray(value) ? (value as NftPoolDraft[]) : []
  } catch {
    return []
  }
}

export function loadNftPoolDraft(id: string): NftPoolDraft | undefined {
  return loadNftPoolDrafts().find((draft) => draft.id === id)
}

export function saveNftPoolDraft(draft: NftPoolDraft): void {
  if (!canUseStorage()) return
  const drafts = loadNftPoolDrafts().filter((item) => item.id !== draft.id)
  window.localStorage.setItem(
    NFT_POOL_DRAFT_STORAGE_KEY,
    JSON.stringify([{ ...draft, updatedAt: Date.now() }, ...drafts]),
  )
}
