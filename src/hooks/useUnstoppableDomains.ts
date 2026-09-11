import { useState, useEffect } from 'react'
import { isAddress } from 'utils'

interface UseUnstoppableDomainsReturn {
  domainName: string | null
  loading: boolean
  error: string | null
}

export const useUnstoppableDomains = (address: string | null | undefined): UseUnstoppableDomainsReturn => {
  const [domainName, setDomainName] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!address || !isAddress(address)) {
      setDomainName(null)
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    let active = true

    const fetchDomainName = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`https://api.unstoppabledomains.com/resolve/domains?owners=${address}`, {
          signal: controller.signal,
        })

        if (response.ok) {
          const data = await response.json()

          if (data.data && data.data.length > 0 && data.data[0].meta && data.data[0].meta.domain) {
            if (active) setDomainName(data.data[0].meta.domain)
          } else {
            if (active) setDomainName(null)
          }
        } else if (response.status === 404) {
          if (active) setDomainName(null)
        } else {
          if (active) {
            setDomainName(null)
            setError(`API error: ${response.status}`)
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError' && active) {
          setDomainName(null)
          setError(null)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchDomainName()

    return () => {
      active = false
      controller.abort()
    }
  }, [address])

  return { domainName, loading, error }
}
