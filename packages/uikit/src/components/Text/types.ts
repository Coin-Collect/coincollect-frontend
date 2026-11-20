import { LayoutProps, SpaceProps, TypographyProps } from "styled-system";

export interface TextProps extends SpaceProps, TypographyProps, LayoutProps {
  children?: React.ReactNode;
  color?: string;
  //fontSize?: string;
  bold?: boolean;
  small?: boolean;
  ellipsis?: boolean;
  textTransform?: "uppercase" | "lowercase" | "capitalize";
}
