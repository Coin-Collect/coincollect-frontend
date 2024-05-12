import { Text, TextProps, useMatchBreakpoints, Image } from "@pancakeswap/uikit";
import LogoRound from "@pancakeswap/uikit/src/components/Svg/Icons/LogoRound";
import { FlexGap } from "components/Layout/Flex";
import { PropsWithChildren, ReactNode } from "react";
import styled from "styled-components";

type Props = {
  logo?: ReactNode;
  text?: ReactNode;
};

const BadgeContainer = styled(FlexGap).attrs({
  flexDirection: "row",
  gap: "4px",
  alignItems: "center",
})``;

export function Badge({ logo, text }: Props) {
  return (
    <BadgeContainer>
      {logo}
      {text}
    </BadgeContainer>
  );
}

type BadgeLogoProps = {
  src: string;
  alt: string;
};

export function BadgeLogo({ src, alt }: BadgeLogoProps) {
  const { isXs } = useMatchBreakpoints();
  const size = isXs ? 16 : 20;
  return <LogoRound width={size} height={size} />;
}

export function BadgeText({ children, ...props }: PropsWithChildren<TextProps>) {
  return (
    <Text fontSize={16} lineHeight="20px" color="#090909" bold {...props}>
      {children}
    </Text>
  );
}