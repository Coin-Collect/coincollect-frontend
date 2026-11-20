import { ReactNode } from "react";
import { Placement, Padding } from "@popperjs/core";

export interface MenuOptions {
  placement?: Placement;
  offset?: [number, number];
  padding?: Padding;
}

export interface BaseMenuProps {
  children?: ReactNode | ((controls: { toggle: () => void; open: () => void; close: () => void }) => ReactNode);
  component: ReactNode;
  options?: MenuOptions;
  isOpen?: boolean;
}
