/* eslint-disable @typescript-eslint/no-var-requires */
const { withSentryConfig } = require('@sentry/nextjs')
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin. Keep in mind that
  // the following options are set automatically, and overriding them is not
  // recommended:
  //   release, url, org, project, authToken, configFile, stripPrefix,
  //   urlPrefix, include, ignore

  silent: true, // Suppresses all logs
  dryRun: !process.env.SENTRY_AUTH_TOKEN, // Set to true will skip the upload release step
  // https://stackoverflow.com/questions/61011281/next-js-source-maps-with-typescript-on-sentry
  include: '.next',
  ignore: ['node_modules', 'cypress'],
  urlPrefix: '~/_next',
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options.
}

/** @type {import('next').NextConfig} */
const config = {
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
