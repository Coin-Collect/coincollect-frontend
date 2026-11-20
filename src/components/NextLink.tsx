import { forwardRef } from 'react'
import styled from 'styled-components'
import NextLink from 'next/link'

// react-router-dom LinkProps types
interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: React.ComponentProps<typeof NextLink>['href']
  replace?: boolean
  innerRef?: React.Ref<HTMLAnchorElement>
  // next
  prefetch?: boolean
}

const StyledNextLink = styled(NextLink)``

/**
 * temporary solution for migrating React Router to Next.js Link
 */
export const NextLinkFromReactRouter = forwardRef<HTMLAnchorElement, LinkProps>(function NextLinkFromReactRouter(
  { to, replace, children, prefetch, innerRef, ...props },
  ref,
) {
  return (
    <StyledNextLink ref={ref ?? innerRef} href={to} replace={replace} prefetch={prefetch} {...props}>
      {children}
    </StyledNextLink>
  )
})
