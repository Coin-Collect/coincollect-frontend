import { getNavConfig, NavItem } from 'components/Menu/config/navConfig'
import { getActiveMenuItem, getActiveSubMenuItem } from 'components/Menu/utils'

const mockT = (key) => key

describe('getActiveMenuItem', () => {
  it('should return an active item', () => {
    // Given
    const currentPath = '/swap'
    const menuConfig = getNavConfig(mockT)

    // When
    const result = getActiveMenuItem({ currentPath, menuConfig })

    // Then
    expect(result).toEqual(menuConfig.find((item) => item.href === '/swap'))
  })

  it('should return an active item for nested routes', () => {
    // Given
    const currentPath = '/nfts/collections/0xDf7952B35f24aCF7fC0487D01c8d5690a60DBa07'
    const menuConfig = getNavConfig(mockT)

    // When
    const result = getActiveMenuItem({ currentPath, menuConfig })

    // Then
    expect(result?.href).toEqual('/nfts/collections')
  })

  it('should handle query and hash fragments', () => {
    // Given
    const currentPath = '/swap?ref=1#top'
    const menuConfig = getNavConfig(mockT)

    // When
    const result = getActiveMenuItem({ currentPath, menuConfig })

    // Then
    expect(result?.href).toEqual('/swap')
  })

  it('should not return an item for partial prefix matches', () => {
    // Given
    const currentPath = '/swapper'
    const menuConfig = getNavConfig(mockT)

    // When
    const result = getActiveMenuItem({ currentPath, menuConfig })

    // Then
    expect(result).toEqual(undefined)
  })

  it('should return undefined if item is not found', () => {
    // Given
    const currentPath = '/corgi'
    const menuConfig = getNavConfig(mockT)

    // When
    const result = getActiveMenuItem({ currentPath, menuConfig })

    // Then
    expect(result).toEqual(undefined)
  })
})

describe('getActiveSubMenuItem', () => {
  const menuItem: NavItem = {
    id: 'parent',
    label: 'Parent',
    href: '/parent',
    icon: 'Info',
    children: [
      { id: 'child', label: 'Child', href: '/parent/child' },
      { id: 'child-details', label: 'Child Details', href: '/parent/child/details' },
    ],
  }

  it('should return undefined', () => {
    // Given
    const currentPath = '/'

    // When
    const result = getActiveSubMenuItem({ currentPath, menuItem })

    // Then
    expect(result).toEqual(undefined)
  })

  it('should return the most specific sub item', () => {
    // Given
    const currentPath = '/parent/child/details/extra'

    // When
    const result = getActiveSubMenuItem({ currentPath, menuItem })

    // Then
    expect(result?.href).toEqual('/parent/child/details')
  })
})
