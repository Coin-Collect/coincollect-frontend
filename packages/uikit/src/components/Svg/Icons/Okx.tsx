import React from "react";
import Svg from "../Svg";
import { SvgProps } from "../types";

const Icon: React.FC<SvgProps> = (props) => {
  return (
    <Svg viewBox="0 0 100 100" {...props}>
      <path d="M0 0 H33.33 V33.33 H0 Z" fill="black" />
      <path d="M33.33 0 H66.67 V33.33 H33.33 Z" fill="white" />
      <path d="M66.67 0 H100 V33.33 H66.67 Z" fill="black" />
      <path d="M0 33.33 H33.33 V66.67 H0 Z" fill="white" />
      <path d="M33.33 33.33 H66.67 V66.67 H33.33 Z" fill="black" />
      <path d="M66.67 33.33 H100 V66.67 H66.67 Z" fill="white" />
      <path d="M0 66.67 H33.33 V100 H0 Z" fill="black" />
      <path d="M33.33 66.67 H66.67 V100 H33.33 Z" fill="white" />
      <path d="M66.67 66.67 H100 V100 H66.67 Z" fill="black" />
    </Svg>
  );
};

export default Icon;
