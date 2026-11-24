import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { keccak256, stringToHex } from 'viem'
import { emptyV3PresentationDocument, localPresentationScope, validateV3PresentationDocument } from './poolPresentation'
import type { V3Deployment } from './runtime'

export function localV3PresentationFile(deployment: V3Deployment) {
  const scope = keccak256(stringToHex(localPresentationScope(deployment))).slice(2)
  return join(process.cwd(), '.coincollect-fork', 'studio-presentations', `${scope}.json`)
}

export function readLocalV3PresentationDocument(deployment: V3Deployment) {
  try {
    const value = JSON.parse(readFileSync(localV3PresentationFile(deployment), 'utf8'))
    return validateV3PresentationDocument(value, deployment)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyV3PresentationDocument(deployment)
    throw error
  }
}
