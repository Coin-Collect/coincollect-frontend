import { DropdownMenuItemType, MenuItemsType } from '@pancakeswap/uikit'
import { SubMenuItemsType } from '@pancakeswap/uikit'
import { NavItem } from './navConfig'

const isHttpLink = (href?: string) => Boolean(href && href.startsWith('http'))

const toDropdownItems = (items?: NavItem[]) => {
  if (!items || items.length === 0) {
    return undefined
  }

  return items.map((item) => ({
    label: item.label,
    href: item.href,
    type: item.external || isHttpLink(item.href) ? DropdownMenuItemType.EXTERNAL_LINK : undefined,
  }))
}

const toMenuItems = (items: NavItem[]) =>
  items.map((item) => ({
    label: item.label,
    href: item.href,
    icon: item.icon,
    items: toDropdownItems(item.children),
    calloutClass: item.calloutClass,
    initialOpenState: item.initialOpenState,
  }))

const filterByFlag = (flag?: boolean) => flag !== false

export const getDrawerLinks = (items: NavItem[]): MenuItemsType[] =>
  toMenuItems(items.filter((item) => filterByFlag(item.showInDrawer)))

export const getTopLinks = (items: NavItem[]): MenuItemsType[] =>
  toMenuItems(items.filter((item) => filterByFlag(item.showInTopNav)))

export const getSubLinks = (items?: NavItem[]): SubMenuItemsType[] => {
  if (!items || items.length === 0) {
    return []
  }

  return items.map((item) => ({
    label: item.label,
    href: item.href,
  }))
}
