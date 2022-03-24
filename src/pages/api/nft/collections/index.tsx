// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { getCoinCollectNftAddress } from "utils/addressHelpers";

export default function handler(req, res) {

  const address = getCoinCollectNftAddress()

  const collections = [
    {
      "address": address,
      "owner": "0xA0291b385D288b03AAC2970a28b87B7B9829c384",
      "name": "CoinCollect NFTs",
      "description": "CoinCollect is the Decentralized MultiChain NFT DeFi Protocol operating on Multi-Chains, that helps NFT traders, high yield farmers, liquidity providers, developers and web 3.0 startups to participate in an open financial market with no barriers to entry.",
      "symbol": "cNFT",
      "totalSupply": "5000",
      "verified": true,
      "createdAt": "2022-02-03T04:29:58.827Z",
      "updatedAt": "2022-02-03T04:29:58.827Z",
      "avatar": "https://coincollect.org/assets/images/clone/nft350.png",
      "banner": {
        "large": "https://coincollect.org/assets/images/clone/banner-lg.png",
        "small": "https://coincollect.org/assets/images/clone/banner-lg.png"
      }
    }
  ];


  res.status(200).json({
    data: collections,
    total: collections.length,
  })
}
