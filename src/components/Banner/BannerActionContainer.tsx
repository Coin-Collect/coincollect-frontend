import { FlexGap } from "components/Layout/Flex";
import { PropsWithChildren } from "react";

export const BannerActionContainer = ({ children }: PropsWithChildren<any>) => {
  return <FlexGap gap="8px">{children}</FlexGap>;
};