const nextVitals = require('eslint-config-next/core-web-vitals')
const lodash = require('eslint-plugin-lodash')

// Keep the Pages Router lint policy from V3.5. React Compiler diagnostics are
// a separate adoption step, since this app uses the standard webpack JSX build.
const hookRules = new Set(['react-hooks/rules-of-hooks', 'react-hooks/exhaustive-deps'])
const pagesVitals = nextVitals.map((config) => {
  if (!config.rules) return config
  const rules = Object.fromEntries(
    Object.entries(config.rules).filter(([rule]) => !rule.startsWith('react-hooks/') || hookRules.has(rule)),
  )
  return { ...config, rules }
})

module.exports = [
  { ignores: ['**/dist/**', '**/.next*/**', 'src/config/abi/types/**'] },
  ...pagesVitals,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: { lodash },
    settings: {
      next: { rootDir: '.' },
      'react-hooks': { additionalEffectHooks: '(useFastRefreshEffect|useSlowRefreshEffect)' },
    },
    rules: {
      'lodash/import-scope': ['error', 'method'],
      '@next/next/no-img-element': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]
