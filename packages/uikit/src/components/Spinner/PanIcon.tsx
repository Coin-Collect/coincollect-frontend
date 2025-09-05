import React from "react";
import styled from "styled-components";
import { SvgProps } from "../Svg/types";

const VideoContainer = styled.div<{ width?: string; height?: string }>`
  display: inline-block;
  width: ${({ width }) => width || "256px"};
  height: ${({ height }) => height || "256px"};
  
  video {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const Icon: React.FC<SvgProps> = (props) => {
  const widthStr = typeof props.width === 'number' ? `${props.width}px` : props.width;
  const heightStr = typeof props.height === 'number' ? `${props.height}px` : props.height;
  
  return (
    <VideoContainer width={widthStr} height={heightStr}>
      <video
        autoPlay
        loop
        muted
        playsInline
        src="/loader.webm"
      />
    </VideoContainer>
  );
};

export default Icon;
