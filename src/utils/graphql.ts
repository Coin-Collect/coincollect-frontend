import { INFO_CLIENT } from 'config/constants/endpoints'
import { GraphQLClient } from 'graphql-request'

// Extra headers
// Mostly for dev environment
// No production env check since production preview might also need them
export const getGQLHeaders = (endpoint: string) => {
  if (endpoint === INFO_CLIENT) {
    const injected = typeof window !== 'undefined' && 'sfHeader' in window ? window.sfHeader : undefined
    const header = process.env.NEXT_PUBLIC_SF_HEADER || (typeof injected === 'string' ? injected : undefined)
    if (header) return { 'X-Sf': header }
  }
  return undefined
}

export const infoClient = new GraphQLClient(INFO_CLIENT, { headers: getGQLHeaders(INFO_CLIENT) })

export const infoServerClient = new GraphQLClient(INFO_CLIENT, {
  headers: process.env.SF_HEADER ? { 'X-Sf': process.env.SF_HEADER } : undefined,
  timeout: 5000,
})

const bitQueryEndpoint = process.env.NEXT_PUBLIC_BIT_QUERY_ENDPOINT
const bitQueryKey = process.env.BIT_QUERY_HEADER

export const bitQueryServerClient = bitQueryEndpoint && bitQueryKey
  ? new GraphQLClient(bitQueryEndpoint, { headers: { 'X-API-KEY': bitQueryKey }, timeout: 5000 })
  : null
