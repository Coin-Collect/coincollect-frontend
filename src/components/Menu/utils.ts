import { NavItem } from './config/navConfig'

const normalizePath = (path: string) => {
  const stripped = path.split('#')[0].split('?')[0]
  const trimmed = stripped.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

const isHttpLink = (href?: string) => Boolean(href && href.startsWith('http'))

const getMatchLength = (currentPath: string, matchPath: string, matchType: 'exact' | 'prefix') => {
  const current = normalizePath(currentPath)
  const target = normalizePath(matchPath)

  if (matchType === 'exact') {
    return current === target ? target.length : -1
  }

  if (target === '/') {
    return current === '/' ? 1 : -1
  }

  if (current === target || current.startsWith(`${target}/`)) {
    return target.length
  }

  return -1
}

const getItemMatchLength = (currentPath: string, item: NavItem) => {
  if (item.external || isHttpLink(item.href)) {
    return -1
  }

  const matchType = item.activeMatch ?? 'prefix'
  const matchPaths = [item.href, ...(item.matchPaths ?? [])]

  return matchPaths.reduce((best, matchPath) => Math.max(best, getMatchLength(currentPath, matchPath, matchType)), -1)
}

const getBestMatch = (currentPath: string, items?: NavItem[]) => {
  if (!items || items.length === 0) {
    return undefined
  }

  let bestItem: NavItem | undefined
  let bestScore = -1

  items.forEach((item) => {
    const score = getItemMatchLength(currentPath, item)
    if (score > bestScore) {
      bestScore = score
      bestItem = item
    }
  })

  return bestScore >= 0 ? bestItem : undefined
}

const getBestMatchScore = (currentPath: string, items?: NavItem[]) => {
  if (!items || items.length === 0) {
    return -1
  }

  return items.reduce((best, item) => Math.max(best, getItemMatchLength(currentPath, item)), -1)
}

export const getActiveMenuItem = ({
  currentPath,
  menuConfig,
}: {
  currentPath: string
  menuConfig: NavItem[]
}) => {
  let bestItem: NavItem | undefined
  let bestScore = -1

  menuConfig.forEach((menuItem) => {
    const selfScore = getItemMatchLength(currentPath, menuItem)
    const childScore = getBestMatchScore(currentPath, menuItem.children)
    const score = Math.max(selfScore, childScore)

    if (score > bestScore) {
      bestScore = score
      bestItem = menuItem
    }
  })

  return bestScore >= 0 ? bestItem : undefined
}

export const getActiveSubMenuItem = ({
  currentPath,
  menuItem,
}: {
  currentPath: string
  menuItem?: NavItem
}) => getBestMatch(currentPath, menuItem?.children)
