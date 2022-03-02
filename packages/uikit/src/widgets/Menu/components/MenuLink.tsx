import NextLink from "next/link";
import React, { AnchorHTMLAttributes } from "react";

const MenuLink: React.FC<AnchorHTMLAttributes<HTMLAnchorElement>> = ({ href, ...otherProps }) => {
  const isHttpLink = href?.startsWith("http");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Tag: any = isHttpLink ? "a" : NextLink;
  const props = { href };
  return <Tag {...props} {...otherProps} />;
};

export default MenuLink;
