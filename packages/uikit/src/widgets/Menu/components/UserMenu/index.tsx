import React, { useEffect, useState } from "react";
import { usePopper } from "react-popper";
import styled from "styled-components";
import { Box, Flex } from "../../../../components/Box";
import { ChevronDownIcon } from "../../../../components/Svg";
import { UserMenuProps, variants } from "./types";
import MenuIcon from "./MenuIcon";
import { UserMenuItem } from "./styles";

export const StyledUserMenu = styled(Flex)`
  align-items: center;
  background: linear-gradient(180deg, rgba(22, 22, 22, 0.78) 0%, rgba(10, 10, 10, 0.66) 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    inset 0 -1px 0 rgba(0, 0, 0, 0.32),
    0 8px 20px rgba(0, 0, 0, 0.32);
  cursor: pointer;
  display: inline-flex;
  height: 32px;
  padding-left: 40px;
  padding-right: 8px;
  position: relative;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(255, 255, 255, 0.3);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.16),
      inset 0 -1px 0 rgba(0, 0, 0, 0.35),
      0 12px 24px rgba(0, 0, 0, 0.38);
  }
`;

export const LabelText = styled.div`
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(227, 232, 255, 0.84) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  display: none;
  font-weight: 600;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.25), 0 8px 16px rgba(0, 0, 0, 0.35);
  letter-spacing: 0.01em;

  ${({ theme }) => theme.mediaQueries.sm} {
    display: block;
    margin-left: 8px;
    margin-right: 4px;
  }
`;

const Menu = styled.div<{ isOpen: boolean }>`
  background: rgba(6, 6, 6, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding-bottom: 4px;
  padding-top: 4px;
  pointer-events: auto;
  width: 280px;
  visibility: visible;
  z-index: 1001;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    inset 0 -1px 0 rgba(0, 0, 0, 0.45),
    0 16px 34px rgba(0, 0, 0, 0.55);

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    backdrop-filter: blur(24px) saturate(150%);
    -webkit-backdrop-filter: blur(24px) saturate(150%);
    pointer-events: none;
    z-index: 0;
  }

  & > * {
    position: relative;
    z-index: 1;
  }

  ${({ isOpen }) =>
    !isOpen &&
    `
    pointer-events: none;
    visibility: hidden;
  `}

  ${UserMenuItem}:first-child {
    border-radius: 8px 8px 0 0;
  }

  ${UserMenuItem}:last-child {
    border-radius: 0 0 8px 8px;
  }
`;

const UserMenu: React.FC<UserMenuProps> = ({
  account,
  text,
  avatarSrc,
  variant = variants.DEFAULT,
  children,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [targetRef, setTargetRef] = useState<HTMLDivElement | null>(null);
  const [tooltipRef, setTooltipRef] = useState<HTMLDivElement | null>(null);
  const accountEllipsis = account ? `${account.substring(0, 2)}...${account.substring(account.length - 4)}` : null;
  const { styles, attributes } = usePopper(targetRef, tooltipRef, {
    strategy: "fixed",
    placement: "bottom-end",
    modifiers: [{ name: "offset", options: { offset: [0, 0] } }],
  });

  useEffect(() => {
    const showDropdownMenu = () => {
      setIsOpen(true);
    };

    const hideDropdownMenu = (evt: MouseEvent | TouchEvent) => {
      const target = evt.target as Node;
      if (target && !tooltipRef?.contains(target)) {
        setIsOpen(false);
        evt.stopPropagation();
      }
    };

    targetRef?.addEventListener("mouseenter", showDropdownMenu);
    targetRef?.addEventListener("mouseleave", hideDropdownMenu);

    return () => {
      targetRef?.removeEventListener("mouseenter", showDropdownMenu);
      targetRef?.removeEventListener("mouseleave", hideDropdownMenu);
    };
  }, [targetRef, tooltipRef, setIsOpen]);

  return (
    <Flex alignItems="center" height="100%" ref={setTargetRef} {...props}>
      <StyledUserMenu
        onTouchStart={() => {
          setIsOpen((s) => !s);
        }}
      >
        <MenuIcon avatarSrc={avatarSrc} variant={variant} />
        <LabelText title={text || account}>{text || accountEllipsis}</LabelText>
        <ChevronDownIcon color="#F4EEFF" width="24px" />
      </StyledUserMenu>
      <Menu style={styles.popper} ref={setTooltipRef} {...attributes.popper} isOpen={isOpen}>
        <Box onClick={() => setIsOpen(false)}>{children}</Box>
      </Menu>
    </Flex>
  );
};

export default UserMenu;
