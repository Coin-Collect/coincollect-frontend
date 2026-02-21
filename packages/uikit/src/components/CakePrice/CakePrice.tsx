import React from "react";
import styled, { keyframes } from "styled-components";
import LogoRound from "../Svg/Icons/LogoRound";
import Text from "../Text/Text";
import Skeleton from "../Skeleton/Skeleton";
import { Colors } from "../../theme";

export interface Props {
  color?: keyof Colors | string;
  cakePriceUsd?: number;
}

const livePulse = keyframes`
  0% {
    transform: scale(0.9);
    opacity: 0.65;
    filter: drop-shadow(0 0 0 rgba(83, 222, 233, 0));
  }
  50% {
    transform: scale(1.15);
    opacity: 1;
    filter: drop-shadow(0 0 6px rgba(83, 222, 233, 0.6));
  }
  100% {
    transform: scale(0.9);
    opacity: 0.65;
    filter: drop-shadow(0 0 0 rgba(83, 222, 233, 0));
  }
`;

const AnimatedLogoRound = styled(LogoRound)`
  > circle:first-of-type {
    transform-box: fill-box;
    transform-origin: center;
    animation: ${livePulse} 1.35s ease-in-out infinite;
  }
`;

const PriceLink = styled.a`
  display: flex;
  align-items: center;
  svg {
    transition: transform 0.3s;
  }
  :hover {
    svg {
      transform: scale(1.2);
    }
  }
`;

const CakePrice: React.FC<Props> = ({ cakePriceUsd, color = "textSubtle" }) => {
  return cakePriceUsd ? (
    <PriceLink
      href="/swap?outputCurrency=0x56633733fc8BAf9f730AD2b6b9956Ae22c6d4148"
      target="_blank"
    >
      <AnimatedLogoRound width="24px" mr="8px" />
      <Text color={color} bold>{`$${cakePriceUsd.toFixed(4)}`}</Text>
    </PriceLink>
  ) : (
    <Skeleton width={80} height={24} />
  );
};

export default React.memo(CakePrice);
