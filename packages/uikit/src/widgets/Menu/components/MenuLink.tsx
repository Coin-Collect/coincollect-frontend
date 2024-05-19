import NextLink from "next/link";
import React, { AnchorHTMLAttributes } from "react";
import { OpenNewIcon } from "../../../components/Svg";

const MenuLink: React.FC<AnchorHTMLAttributes<HTMLAnchorElement>> = ({ href, ...otherProps }) => {
  const isHttpLink = href?.startsWith("http");


  otherProps.children = isHttpLink ? (
    <>
      {otherProps.children}
      {<OpenNewIcon ml={10} />} {/* isHttpLink, add external icon */}
    </>
  ) : otherProps.children;


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Tag: any = isHttpLink ? "a" : NextLink;
  const props = { href };
  return <Tag {...props} {...otherProps} />;
};

export default MenuLink;
