import React from "react";
import { StyledCard, StyledCardInner } from "./StyledCard";
import { CardProps } from "./types";

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ ribbon, children, background, ...props }, ref) => {
  return (
    <StyledCard ref={ref} {...props}>
      <StyledCardInner background={background} hasCustomBorder={!!props.borderBackground}>
        {ribbon}
        {children}
      </StyledCardInner>
    </StyledCard>
  );
});
Card.displayName = "Card";
export default Card;
