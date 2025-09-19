import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import BunnyPlaceholder from "../Svg/Icons/BunnyPlaceholder";
import BackgroundImage from "./BackgroundImage";
import { BackgroundImageProps } from "./types";

const StyledProfileAvatar = styled(BackgroundImage)`
  border-radius: 50%;
`;

const StyledBunnyPlaceholder = styled(BunnyPlaceholder)`
  height: 100%;
  width: 100%;
`;

const FALLBACK_IMAGE_BASE_PATH = "/images/collectHeroes";
const FALLBACK_IMAGE_COUNT = 38;

const buildFallbackSrc = (index: number) => `${FALLBACK_IMAGE_BASE_PATH}/${index}.jpg`;

const getRandomFallbackSrc = (exclude?: string) => {
  let candidate = exclude;
  for (let attempt = 0; attempt < FALLBACK_IMAGE_COUNT; attempt += 1) {
    const index = Math.floor(Math.random() * FALLBACK_IMAGE_COUNT) + 1;
    candidate = buildFallbackSrc(index);
    if (candidate !== exclude) {
      return candidate;
    }
  }
  return buildFallbackSrc(1);
};

const ProfileAvatar: React.FC<BackgroundImageProps> = ({ src, onError, ...props }) => {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(() => src || getRandomFallbackSrc());

  useEffect(() => {
    setCurrentSrc(src || getRandomFallbackSrc());
  }, [src]);

  const handleError = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setCurrentSrc((previous) => getRandomFallbackSrc(previous));
      if (onError) {
        onError(event);
      }
    },
    [onError],
  );

  return (
    <StyledProfileAvatar
      loadingPlaceholder={<StyledBunnyPlaceholder />}
      src={currentSrc}
      onError={handleError}
      {...props}
    />
  );
};

export default ProfileAvatar;
