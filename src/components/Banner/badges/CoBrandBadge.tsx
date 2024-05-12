import { Image } from "@pancakeswap/uikit";
import { FlexGap } from "components/Layout/Flex";
import { VerticalDivider } from "../VerticalDivider";
import { BadgeLogo } from "./Badge";
import { PancakeSwapBadge } from "./PancakeSwapBadge";

export type CoBrandBadgeProps = {
  whiteText?: boolean;
  compact?: boolean;
  coBrandLogo: string;
  coBrand: string;
  coBrandAlt?: string;
  cWidth?: number;
  cHeight?: number;
  dividerBg?: string;
};

export const CoBrandBadge: React.FC<React.PropsWithChildren<CoBrandBadgeProps>> = ({
  whiteText,
  compact,
  coBrandLogo,
  coBrand,
  coBrandAlt = "",
  cWidth,
  cHeight,
  dividerBg,
}) => {
  if (compact) {
    return (
      <FlexGap gap="4px">
        <PancakeSwapBadge whiteText={whiteText} compact />
        <VerticalDivider bg={dividerBg ?? ""} />
        <BadgeLogo src={coBrandLogo} alt={coBrandAlt} />
      </FlexGap>
    );
  }

  return (
    <FlexGap gap="8px" alignItems="center">
      <PancakeSwapBadge whiteText={whiteText} />
      <VerticalDivider bg={dividerBg ?? ""} />
      {cWidth && cHeight ? <Image src={coBrand} alt={coBrandAlt} width={cWidth} height={cHeight} /> : null}
    </FlexGap>
  );
};