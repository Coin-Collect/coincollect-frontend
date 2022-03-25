// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { getDefaultProvider, Network } from "@ethersproject/providers";
import { Contract } from "ethers";
import { getCoinCollectNftAddress } from "utils/addressHelpers";
import { simplePolygonRpcProvider } from "utils/providers";
import coinCollectNftAbi from 'config/abi/coinCollectNft.json'
const axios = require('axios');



const getDatas = async (contract: Contract) => {
  try {
    const totalSupply = await contract.totalSupply()
    const cost = await contract.cost()
    const isSaleActive = await contract.isSaleActive()

    return [totalSupply.toNumber(), cost.toNumber(), isSaleActive]
} catch(error) {
  return [0, 0, 0]
}
}


export default async function handler(req, res) {

 const contract = new Contract(getCoinCollectNftAddress(), coinCollectNftAbi, simplePolygonRpcProvider)
  const [totalSupply, cost, isSaleActive] = await getDatas(contract)
  

  res.status(200).json({
    data: {
      "address": getCoinCollectNftAddress(),
      "owner": "0x8fC2e77C47D5D9fDe1ff35098d6e22EB6F9e8258",
      "name": "CoinCollect NFTs",
      "description": "CoinCollect is the Decentralized MultiChain NFT DeFi Protocol operating on Multi-Chains, that helps NFT traders, high yield farmers, liquidity providers, developers and web 3.0 startups to participate in an open financial market with no barriers to entry.",
      "symbol": "cNFT",
      "totalSupply": totalSupply,
      "maxSupply": 5000,
      "cost": cost == 0 ? "Free" : cost,
      "isActive": isSaleActive,
      "createdAt": "2022-02-11T03:13:40.287Z",
      "updatedAt": "2022-02-11T03:13:40.287Z",
      "avatar": "https://coincollect.org/assets/images/clone/nft350.png",
      "banner": {
        "large": "https://coincollect.org/assets/images/clone/banner-lg.png",
        "small": "https://coincollect.org/assets/images/clone/banner-lg.png"
      },
      attributes: []
    }
  })
}