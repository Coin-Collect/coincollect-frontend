import React, { useContext } from "react";
import styled from "styled-components";
import Flex from "../../../components/Box/Flex";
import MenuButton from "./MenuButton";
import { HamburgerIcon, HamburgerCloseIcon } from "../../../components/Svg";
import { MenuContext } from "../context";

interface Props {
  isDark: boolean;
  href: string;
  isPushed: boolean;
  togglePush: () => void;
  isMobile: boolean;
  pushNav: (isPushed: boolean) => void;
}

const StyledLink = styled("a")`
  display: flex;
  align-items: center;
  text-decoration: none;
`;

const LogoVideo = styled.video<React.VideoHTMLAttributes<HTMLVideoElement>>`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  object-fit: cover;
`;

interface LogoTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  isPushed: boolean;
}

const LogoText = styled.span<LogoTextProps & { isDark: boolean }>`
  margin-left: ${({ isPushed }) => (isPushed ? "12px" : "0")};
  font-size: 18px;
  font-weight: 700;
  white-space: nowrap;
  display: ${({ isPushed }) => (isPushed ? "block" : "none")};
  color: ${({ isDark, theme }) => (isDark ? theme.colors.contrast : theme.colors.text)};
`;

const Logo: React.FC<Props> = ({ isPushed, togglePush, isMobile, pushNav, href, isDark: _isDark }) => {
  const { linkComponent } = useContext(MenuContext);
  const isAbsoluteUrl = href.startsWith("http");

  const handleMouseEnter = () => {
    if (!isMobile) {
      pushNav(true);
    }
  };

  const handleMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) {
      return;
    }
    const nextElement = event.relatedTarget;
    if (nextElement instanceof Element && nextElement.closest('[data-menu-panel="true"]')) {
      return;
    }
    pushNav(false);
  };

  const innerLogo = (
    <>
      <LogoVideo
        src="/logo-video_transparent.webm"
        autoPlay
        loop
        muted
        playsInline
        aria-label="CoinCollect animated logo"
      />
      <LogoText isPushed={isPushed} isDark={_isDark}>
        CoinCollect
      </LogoText>
    </>
  );

  return (
    <Flex alignItems="center" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {isMobile && (
        <MenuButton aria-label="Toggle menu" onClick={togglePush} mr="12px">
          {isPushed ? (
            <HamburgerCloseIcon width="24px" color="textSubtle" />
          ) : (
            <HamburgerIcon width="24px" color="textSubtle" />
          )}
        </MenuButton>
      )}
      {isAbsoluteUrl ? (
        <StyledLink as="a" href={href} aria-label="CoinCollect home page">
          {innerLogo}
        </StyledLink>
      ) : (
        <StyledLink href={href} as={linkComponent} aria-label="CoinCollect home page">
          {innerLogo}
        </StyledLink>
      )}
    </Flex>
  );
};

export default React.memo(
  Logo,
  (prev, next) =>
    prev.isPushed === next.isPushed &&
    prev.isDark === next.isDark &&
    prev.isMobile === next.isMobile &&
    prev.href === next.href
);
