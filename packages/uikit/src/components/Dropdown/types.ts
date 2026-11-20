export type Position = "top" | "top-right" | "bottom";

export interface PositionProps {
  position?: Position;
}

export interface DropdownProps extends PositionProps {
  children?: React.ReactNode;
  target: React.ReactElement;
}
