import React from "react";
import styled from "styled-components";
import PanelBody from "./PanelBody";
import PanelFooter from "./PanelFooter";
import { SIDEBAR_WIDTH_REDUCED, SIDEBAR_WIDTH_FULL } from "../config";
import { PanelProps, PushedProps } from "../types";

interface Props extends PanelProps, PushedProps {
  showMenu: boolean;
  isMobile: boolean;
  showPhishingWarningBanner: boolean;
}

const StyledPanel = styled.div<{ isPushed: boolean; isMobile: boolean; showMenu: boolean; showPhishingWarningBanner: boolean }>`
  position: fixed;
  padding-top: ${({ showMenu, showPhishingWarningBanner }) => (
  showMenu ? (showPhishingWarningBanner ? "150px" : "80px") : 0
  )};
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex-shrink: 0;
  background-color: ${({ theme }) => theme.nav.background};
  width: ${({ isPushed, isMobile }) => {
    if (isMobile) {
      return isPushed ? `${SIDEBAR_WIDTH_FULL}px` : 0;
    }
    return `${isPushed ? SIDEBAR_WIDTH_FULL : SIDEBAR_WIDTH_REDUCED}px`;
  }};
  height: 100vh;
  transition: padding-top 0.2s, width 0.2s;
  border-right: ${({ isPushed, isMobile, theme }) =>
    !isMobile && !isPushed ? `2px solid ${theme.nav.background}` : isPushed ? `2px solid ${theme.nav.background}` : 0};
  box-shadow: ${({ isPushed, isMobile }) => 
    isPushed || !isMobile ? '2px 0 8px rgba(0, 0, 0, 0.1)' : 'none'};
  z-index: 11;
  overflow: ${({ isPushed }) => (isPushed ? "initial" : "hidden")};
  transform: translate3d(0, 0, 0);

  ${({ theme }) => theme.mediaQueries.nav} {
    border-right: 2px solid ${({ theme }) => theme.nav.background};
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
    width: ${({ isPushed }) => `${isPushed ? SIDEBAR_WIDTH_FULL : SIDEBAR_WIDTH_REDUCED}px`};
  }
`;

const Panel: React.FC<Props> = (props) => {
  const { isPushed, showMenu, showPhishingWarningBanner, isMobile, pushNav } = props;

  const handleMouseEnter = () => {
    if (!isMobile) {
      pushNav(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      pushNav(false);
    }
  };

  return (
    <StyledPanel
      isPushed={isPushed}
      isMobile={isMobile}
      showMenu={showMenu}
      showPhishingWarningBanner={showPhishingWarningBanner}
      data-menu-panel="true"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <PanelBody {...props} />
      <PanelFooter {...props} />
    </StyledPanel>
  );
};

export default Panel;
