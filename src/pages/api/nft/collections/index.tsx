// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { getCoinCollectBronzeNftAddress, getCoinCollectNftAddress } from "utils/addressHelpers";

export default function handler(req, res) {

  

  const collections = [
    {
      "address": getCoinCollectNftAddress(),
      "name": "CoinCollect NFTs",
      "description": "CoinCollect is the Decentralized MultiChain NFT DeFi Protocol operating on Multi-Chains, that helps NFT traders, high yield farmers, liquidity providers, developers and web 3.0 startups to participate in an open financial market with no barriers to entry.",
      "symbol": "cNFT",
      "totalSupply": "5000",
      "createdAt": "2022-02-03T04:29:58.827Z",
      "updatedAt": "2022-02-03T04:29:58.827Z",
      "avatar": "https://coincollect.org/assets/images/clone/nft350.png",
      "banner": {
        "large": "https://coincollect.org/assets/images/clone/banner-lg.png",
        "small": "https://coincollect.org/assets/images/clone/banner-lg.png"
      }
    },
    {
      "address": getCoinCollectBronzeNftAddress(),
      "name": "CoinCollect Bronze NFTs",
      "description": "1CoinCollect is the Decentralized MultiChain NFT DeFi Protocol operating on Multi-Chains, that helps NFT traders, high yield farmers, liquidity providers, developers and web 3.0 startups to participate in an open financial market with no barriers to entry.",
      "symbol": "cNFT",
      "totalSupply": "5000",
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
