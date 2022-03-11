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
      "avatar": "https://lh3.googleusercontent.com/4xdfGitTk_G563RhDz0KgjxxNag5nGtTCji1SSVSBK6uDlvmtBWiKi96N-Qo38BmSZGTIKc8uKRKNgfZMO-ntSw3mvC2Hw61ZyKX=s130",
      "banner": {
        "large": "https://lh3.googleusercontent.com/0ALmWj0yKdDWD5_F7_89DYfSjmfiCAM0o5y8JAvbTx35wxLXSvpvioiksq2UTlKEvgI35B82NZIU8tInIBSkYFAxXWQ8fyVVkgiW=h600",
        "small": "https://lh3.googleusercontent.com/0ALmWj0yKdDWD5_F7_89DYfSjmfiCAM0o5y8JAvbTx35wxLXSvpvioiksq2UTlKEvgI35B82NZIU8tInIBSkYFAxXWQ8fyVVkgiW=h600"
      }
    }
  ];


  res.status(200).json({
    data: collections,
    total: collections.length,
  })
}
