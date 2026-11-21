import type { Story } from "../../../.storybook/story";
import React from "react";
import { CakePrice, CakePriceProps } from ".";
import { Flex } from "../Box";

export default {
  title: "Components/CakePrice",
  component: CakePrice,
};

const Template: Story<CakePriceProps> = ({ ...args }) => {
  return (
    <Flex p="10px">
      <CakePrice {...args} />
    </Flex>
  );
};

export const Default = Template.bind({});
Default.args = {
  cakePriceUsd: 20.0,
};
