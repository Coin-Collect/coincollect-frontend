import type { NextApiRequest, NextApiResponse } from 'next'
import { Contract } from "ethers";
import { getCoinCollectNftAddress } from "utils/addressHelpers";
import { simplePolygonRpcProvider } from "utils/providers";
import coinCollectNftAbi from 'config/abi/coinCollectNft.json'
import { mintingConfig } from "config/constants";
import { formatEther } from "@ethersproject/units";



const getDatas = async (contract: Contract): Promise<[number, number, number, boolean]> => {
  try {
    const totalSupply = await contract.totalSupply()
    const maxSupply = await contract.maxSupply()
    const cost = await contract.cost()
    const formattedCost = cost ? parseFloat(formatEther(cost)) : 0
    const isSaleActive = await contract.isSaleActive()

    return [totalSupply.toNumber(), maxSupply.toNumber(), formattedCost, isSaleActive]
} catch(error) {
  return [0, 0, 0, false]
}
}






export default async function handler(req: NextApiRequest, res: NextApiResponse) {


  const { collectionAddress } = req.query
  if (typeof collectionAddress !== 'string') return res.status(400).json({ error: 'A collection address is required.' })

  const activeMinting = mintingConfig.find((minting) => minting.address === collectionAddress)

  if (!activeMinting) return res.status(404).json({ error: 'Collection not found.' })
  const { name, description, banner, avatar } = activeMinting


 const contract = new Contract(collectionAddress, coinCollectNftAbi, simplePolygonRpcProvider)
 const [totalSupply, maxSupply, cost, isSaleActive] = await getDatas(contract)

 let status = 'Active'
 status = totalSupply == maxSupply ? 'Finished' : (!isSaleActive ? 'Paused' : 'Active')

  

  res.status(200).json({
    data: {
      "address": getCoinCollectNftAddress(),
      "name": name,
      "description": description,
      "symbol": "cNFT",
      "totalSupply": totalSupply,
      "maxSupply": maxSupply,
      "cost": cost == 0 ? "Free" : cost,
      "status": status,
      "avatar": avatar,
      "banner": {
        "large": banner.large,
      },
      attributes: []
    }
  })
}
