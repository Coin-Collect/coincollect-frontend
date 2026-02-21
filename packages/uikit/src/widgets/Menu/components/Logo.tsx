import React, { useContext } from "react";
import styled, { keyframes } from "styled-components";
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
  transition: transform 260ms ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      transform: translateY(-1px) scale(1.03);
    }
  }
`;

const rainbowShift = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

const LogoVideo = styled.video<React.VideoHTMLAttributes<HTMLVideoElement>>`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  object-fit: contain;
  display: block;
  background: transparent;
  transition: transform 300ms ease, filter 300ms ease, box-shadow 300ms ease;
`;

interface LogoTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  isPushed: boolean;
  isMobile: boolean;
}

const LogoText = styled.span<LogoTextProps & { isDark: boolean }>`
  margin-left: ${({ isPushed, isMobile }) => (!isMobile || isPushed ? "12px" : "0")};
  font-size: 20px;
  font-weight: 700;
  white-space: nowrap;
  display: ${({ isPushed, isMobile }) => (!isMobile || isPushed ? "block" : "none")};
  color: rgba(244, 238, 255, 0.96);
  transition: filter 280ms ease, text-shadow 280ms ease;
`;

const LogoWrap = styled(Flex)`
  @media (hover: hover) and (pointer: fine) {
    &:hover ${LogoVideo} {
      transform: scale(1.08);
      filter: saturate(1.45) brightness(1.12);
      box-shadow: none;
    }

    &:hover ${LogoText} {
      background-image: linear-gradient(120deg, #ffffff 0%, #ff5db1 22%, #43d0ff 48%, #ffd84d 74%, #ffffff 100%);
      background-size: 240% 240%;
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
      animation: ${rainbowShift} 1.9s linear infinite;
      text-shadow: none;
      filter: none;
    }
  }
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
      <LogoText isPushed={isPushed} isMobile={isMobile} isDark={_isDark}>
        CoinCollect
      </LogoText>
    </>
  );

  return (
    <LogoWrap alignItems="center" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {isMobile && (
        <MenuButton aria-label="Toggle menu" onClick={togglePush} mr="12px">
          {isPushed ? (
            <HamburgerCloseIcon width="24px" color="#F4EEFF" />
          ) : (
            <HamburgerIcon width="24px" color="#F4EEFF" />
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
    </LogoWrap>
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
