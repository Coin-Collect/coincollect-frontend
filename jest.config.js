const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })({
  rootDir: __dirname,
  moduleNameMapper: {
    '^@pancakeswap/uikit': '<rootDir>/packages/uikit/src',
  },
  moduleDirectories: ['node_modules', 'src'],
})

module.exports = async () => {
  const base = await createJestConfig()
  return {
    testTimeout: 20_000,
    projects: [
      {
        ...base,
        displayName: 'application',
        testMatch: ['<rootDir>/src/**/?(*.)+(spec|test).[jt]s?(x)'],
      },
      {
        ...base,
        displayName: 'ui-kit',
        testEnvironment: 'jsdom',
        setupFilesAfterEnv: ['<rootDir>/packages/uikit/src/setupTests.js'],
        testMatch: ['<rootDir>/packages/uikit/src/**/?(*.)+(spec|test).[jt]s?(x)'],
      },
    ],
  }
}
