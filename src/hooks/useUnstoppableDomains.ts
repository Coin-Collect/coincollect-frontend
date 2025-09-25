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
    console.log('🔍 useUnstoppableDomains hook called')
    console.log('📍 Browser environment check:', typeof window !== 'undefined')
    
    if (!address || !isAddress(address)) {
      console.log('❌ Invalid address:', address)
      setDomainName(null)
      setLoading(false)
      setError(null)
      return
    }

    console.log('✅ Valid address detected:', address)
    
    const fetchDomainName = async () => {
      setLoading(true)
      setError(null)
      
      try {
        console.log('🌐 Fetching domain for address:', address)
        
        // Test with a known address first
        const testAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
        console.log('🧪 Testing API with known address:', testAddress)
        
        const testResponse = await fetch(`https://api.unstoppabledomains.com/resolve/domains?owners=${testAddress}`)
        console.log('🧪 Test API response status:', testResponse.status)
        
        if (testResponse.ok) {
          const testData = await testResponse.json()
          console.log('🧪 Test API response data:', testData)
        }
        
        // Now try with the actual address
        const response = await fetch(`https://api.unstoppabledomains.com/resolve/domains?owners=${address}`)
        console.log('📡 API response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('📡 API response data:', data)
          
          if (data.data && data.data.length > 0 && data.data[0].meta && data.data[0].meta.domain) {
            console.log('✅ Domain found:', data.data[0].meta.domain)
            setDomainName(data.data[0].meta.domain)
          } else {
            console.log('❌ No domain found in response')
            setDomainName(null)
          }
        } else if (response.status === 404) {
          console.log('❌ No domain found for address (404)')
          setDomainName(null)
        } else {
          console.log('❌ API error:', response.status, response.statusText)
          setError(`API error: ${response.status}`)
        }
      } catch (err) {
        console.error('❌ Fetch error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchDomainName()
  }, [address])

  return { domainName, loading, error }
}