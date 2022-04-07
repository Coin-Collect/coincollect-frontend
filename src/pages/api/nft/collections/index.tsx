// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { mintingConfig } from "config/constants";
import { Minting } from "config/constants/types";
import { getCoinCollectBronzeNftAddress, getCoinCollectNftAddress } from "utils/addressHelpers";

export default function handler(req, res) {

  const activeMintings = mintingConfig.filter((minting) => minting.isActive)


  res.status(200).json({
    data: activeMintings,
    total: activeMintings.length,
  })
}
