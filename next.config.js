const { withSentryConfig } = require('@sentry/nextjs')
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const sentryWebpackPluginOptions = {
  silent: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    deleteSourcemapsAfterUpload: true,
  },
}

/** @type {import('next').NextConfig} */
const config = {
  // Permit isolated build verification without overwriting a running dev cache.
  distDir: process.env.COINCOLLECT_NEXT_DIST_DIR || '.next',
  experimental: { instrumentationHook: true },
  eslint: { dirs: ['src/features/universalRewards', 'src/pages/api/v3', 'src/pages/nftpools/v3'] },
  compiler: {
    styledComponents: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static-nft.pancakeswap.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.pixabay.com',
      },
      {
        protocol: 'https',
        hostname: 'coincollect.org',
      },
      {
        protocol: 'https',
        hostname: 'app.coincollect.org',
      },
      {
        protocol: 'https',
        hostname: 'vercel.app',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'i.seadn.io',
      },
      {
        protocol: 'https',
        hostname: 'avatarsai.net',
      },
      {
        protocol: 'https',
        hostname: 'beasthunter.app',
      },
      {
        protocol: 'https',
        hostname: 'blitzbrawler.com',
      },
      {
        protocol: 'https',
        hostname: 'lotshare.app',
      },
      {
        protocol: 'https',
        hostname: 'nitroclash.net',
      },
      {
        protocol: 'https',
        hostname: 'placedj.com',
      },
      {
        protocol: 'https',
        hostname: 'sapienx.app',
      },
      {
        protocol: 'https',
        hostname: 'zidanogo.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/info/token/:address',
        destination: '/info/tokens/:address',
      },
      {
        source: '/info/pool/:address',
        destination: '/info/pools/:address',
      },
      {
        source: '/info/pair/:address',
        destination: '/info/pools/:address',
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/send',
        destination: '/swap',
        permanent: true,
      },
      {
        source: '/swap/:outputCurrency',
        destination: '/swap?outputCurrency=:outputCurrency',
        permanent: true,
      },
      {
        source: '/create/:currency*',
        destination: '/add/:currency*',
        permanent: true,
      },
      {
        source: '/farms/archived',
        destination: '/farms/history',
        permanent: true,
      },
      {
        source: '/pool',
        destination: '/liquidity',
        permanent: true,
      },
      {
        source: '/staking',
        destination: '/pools',
        permanent: true,
      },
      {
        source: '/syrup',
        destination: '/pools',
        permanent: true,
      },
      {
        source: '/collectibles',
        destination: '/nfts',
        permanent: true,
      },
    ]
  },
}

module.exports = withBundleAnalyzer(withSentryConfig(config, sentryWebpackPluginOptions))
