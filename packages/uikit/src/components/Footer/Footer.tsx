import React from "react";
import styled, { keyframes } from "styled-components";
import { baseColors, darkColors, lightColors } from "../../theme/colors";
import { Flex, Box } from "../Box";
import { Link } from "../Link";
import {
  StyledFooter,
  StyledIconMobileContainer,
  StyledLinksContainer,
  StyledList,
  StyledListItem,
  StyledText,
  StyledSocialLinks,
  StyledToolsContainer,
} from "./styles";
import { FooterProps } from "./types";
import { ThemeSwitcher } from "../ThemeSwitcher";
import LangSelector from "../LangSelector/LangSelector";
import CakePrice from "../CakePrice/CakePrice";
import { ArrowForwardIcon } from "../Svg";
import { Button } from "../Button";
import { Colors } from "../..";

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

const BrandLink = styled.a`
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  transition: transform 260ms ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      transform: translateY(-1px) scale(1.03);
    }
  }
`;

const BrandVideo = styled.video<React.VideoHTMLAttributes<HTMLVideoElement>>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: contain;
  display: block;
  background: transparent;
  transition: transform 300ms ease, filter 300ms ease;
  transform: scale(1.08);
  filter: saturate(1.45) brightness(1.12);

  ${({ theme }) => theme.mediaQueries.md} {
    width: 32px;
    height: 32px;
    transform: none;
    filter: none;
  }
`;

const BrandText = styled.span`
  margin-left: 10px;
  font-size: 20px;
  font-weight: 700;
  white-space: nowrap;
  background-image: linear-gradient(120deg, #ffffff 0%, #ff5db1 22%, #43d0ff 48%, #ffd84d 74%, #ffffff 100%);
  background-size: 240% 240%;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${rainbowShift} 1.9s linear infinite;
  transition: filter 280ms ease;

  ${({ theme }) => theme.mediaQueries.md} {
    font-size: 18px;
    background-image: none;
    color: rgba(244, 238, 255, 0.96);
    animation: none;
  }
`;

const BrandWrap = styled(Flex)`
  width: 100%;
  justify-content: center;

  ${({ theme }) => theme.mediaQueries.md} {
    width: auto;
    justify-content: flex-start;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover ${BrandVideo} {
      transform: scale(1.08);
      filter: saturate(1.45) brightness(1.12);
    }

    &:hover ${BrandText} {
      background-image: linear-gradient(120deg, #ffffff 0%, #ff5db1 22%, #43d0ff 48%, #ffd84d 74%, #ffffff 100%);
      background-size: 240% 240%;
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
      animation: ${rainbowShift} 1.9s linear infinite;
      filter: none;
    }
  }
`;

const FooterBrand: React.FC = () => (
  <BrandWrap alignItems="center">
    <BrandLink href="/" aria-label="CoinCollect home page">
      <BrandVideo src="/logo-video_transparent.webm" autoPlay loop muted playsInline aria-label="CoinCollect animated logo" />
      <BrandText>CoinCollect</BrandText>
    </BrandLink>
  </BrandWrap>
);

const LegalBlock = styled.div`
  width: 100%;
  text-align: center;
  order: 2;
  color: rgba(244, 238, 255, 0.78);
  font-size: 12px;
  line-height: 1.5;
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid ${darkColors.cardBorder};

  ${({ theme }) => theme.mediaQueries.sm} {
    width: auto;
    text-align: left;
    order: 3;
    margin-top: 0;
    margin-left: 20px;
    padding-top: 0;
    border-top: 0;
  }
`;

const LegalLine = styled.p`
  margin: 0;
`;

const LegalDescription = styled.p`
  margin: 6px auto 0;
  max-width: 760px;
`;

const MenuItem: React.FC<FooterProps> = ({
  items,
  isDark,
  toggleTheme,
  currentLang,
  langs,
  setLang,
  cakePriceUsd,
  buyCakeLabel,
  ...props
}) => {
  return (
    <StyledFooter p={["24px 16px", null, "56px 40px 32px 40px"]} {...props} justifyContent="center">
      <Flex flexDirection="column" width={["100%", null, "1200px;"]}>
        <StyledIconMobileContainer display={["block", null, "none"]} mb={["14px", null, "24px"]}>
          <FooterBrand />
        </StyledIconMobileContainer>
        <StyledLinksContainer order={[1, null, 1]} mb={["16px", null, "36px"]}>
          {items?.map((item) => (
            <StyledList key={item.label}>
              <StyledListItem>{item.label}</StyledListItem>
              {item.items?.map(({ label, href, isHighlighted = false }) => (
                <StyledListItem key={label}>
                  {href ? (
                    <Link
                      href={href}
                      target="_blank"
                      rel="noreferrer noopener"
                      color={isHighlighted ? baseColors.warning : darkColors.text}
                      bold={false}
                    >
                      {label}
                    </Link>
                  ) : (
                    <StyledText>{label}</StyledText>
                  )}
                </StyledListItem>
              ))}
            </StyledList>
          ))}
          <Box display={["none", null, "block"]}>
            <FooterBrand />
          </Box>
        </StyledLinksContainer>
        <StyledSocialLinks order={[2]} pb={["18px", null, "32px"]} mb={["0", null, "32px"]} />
        <StyledToolsContainer order={[3, null, 3]} flexDirection={["column", null, "row"]} justifyContent="space-between">
          {/*
          <Flex order={[2, null, 1]} alignItems="center">
            <ThemeSwitcher isDark={isDark} toggleTheme={toggleTheme} />
            <LangSelector
              currentLang={currentLang}
              langs={langs}
              setLang={setLang}
              color={darkColors.textSubtle as keyof Colors}
              dropdownPosition="top-right"
            />
          </Flex>
          */}
          <Flex order={[1, null, 2]} mb={["14px", null, "0"]} justifyContent="space-between" alignItems="center">
            <Box mr="20px">
              <CakePrice cakePriceUsd={cakePriceUsd} color={darkColors.textSubtle as keyof Colors} />
            </Box>
            <Button
              as="a"
              href="/swap?outputCurrency=0x56633733fc8BAf9f730AD2b6b9956Ae22c6d4148"
              target="_blank"
              scale="sm"
              endIcon={<ArrowForwardIcon color={lightColors.backgroundAlt} />}
            >
              {buyCakeLabel}
            </Button>
          </Flex>
          <LegalBlock>
            <LegalLine>© 2026 CoinCollect. All Rights Reserved.</LegalLine>
            <LegalDescription>
              Shaping a community-powered Web3 future where CoinCollect evolves with AI governance and autonomous
              agents.
            </LegalDescription>
          </LegalBlock>
        </StyledToolsContainer>
      </Flex>
    </StyledFooter>
  );
};

export default MenuItem;
