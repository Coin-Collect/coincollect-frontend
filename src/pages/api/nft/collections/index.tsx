// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

export default function handler(req, res) {

  const collections = [
    {
      "address": "0xA2460F62E91FE752308FF70f12F9c127F6294481",
      "owner": "0xA0291b385D288b03AAC2970a28b87B7B9829c384",
      "name": "CoinCollect NFTs",
      "description": "3888 Lil Bulls living on The Binance Smart Chain - By The Bull Society",
      "symbol": "Lil Bulls",
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
