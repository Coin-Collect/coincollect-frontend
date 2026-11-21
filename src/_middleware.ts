import { NextRequest, NextResponse } from 'next/server'
import { BLOCK_COUNTRIES_COOKIE_NAME } from 'config/constants/cookie-names'

// Sanctioned Countries: Belarus, Cuba, Democratic Republic of Congo, Iran, Iraq, North Korea, Sudan, Syria, Zimbabwe.
const BLOCK_COUNTRIES = ['BY', 'CU', 'CD', 'IR', 'IQ', 'KP', 'SD', 'SY', 'ZW']

// Sanctioned Regions: Crimea
const BLOCK_REGIONS = ['UA-43']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const country = req.headers.get('x-vercel-ip-country')
  const region = req.headers.get('x-vercel-ip-country-region')

  const shouldBlock: boolean =
    BLOCK_COUNTRIES.some((c) => c === country) || BLOCK_REGIONS.some((r) => r === `${country}-${region}`)

  if (shouldBlock) {
    res.cookies.set(BLOCK_COUNTRIES_COOKIE_NAME, String(shouldBlock))
  } else {
    res.cookies.delete(BLOCK_COUNTRIES_COOKIE_NAME)
  }

  return res
}
