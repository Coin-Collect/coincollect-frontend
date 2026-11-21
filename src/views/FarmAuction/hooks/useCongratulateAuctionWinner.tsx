import { useState, useEffect } from 'react'
import useWeb3React from 'hooks/useWeb3React'
import { Auction, AuctionStatus, Bidder } from 'config/constants/types'
import { useFarmAuctionContract } from 'hooks/useContract'
import { processAuctionData, sortAuctionBidders } from '../helpers'

interface WonAuction {
  auction: Auction
  bidderData: Bidder
}

const useCongratulateAuctionWinner = (currentAuction: Auction, bidders: Bidder[]): WonAuction | null => {
  const [wonAuction, setWonAuction] = useState<WonAuction | null>(null)

  const { account } = useWeb3React()

  const farmAuctionContract = useFarmAuctionContract(false)

  useEffect(() => {
    setWonAuction(null)
    if (!account) return
    const checkIfWonPreviousAuction = async (previousAuctionId: number) => {
      const auctionData = await farmAuctionContract.auctions(previousAuctionId)
      const processedAuctionData = await processAuctionData(previousAuctionId, auctionData)
      const [auctionBidders] = await farmAuctionContract.viewBidsPerAuction(previousAuctionId, 0, 500)
      const sortedBidders = sortAuctionBidders(auctionBidders)
      const { leaderboardThreshold } = processedAuctionData
      const accountBidderData = sortedBidders.find(
        (bidder) => bidder.account === account && leaderboardThreshold.lte(bidder.amount),
      )
      if (accountBidderData) {
        setWonAuction({
          auction: processedAuctionData,
          bidderData: accountBidderData,
        })
      }
    }

    const accountBidderData = bidders.find(
      (bidder) => bidder.account === account && currentAuction.leaderboardThreshold.lte(bidder.amount),
    )
    const previousAuctionId = currentAuction.id - 1
    if (currentAuction.status === AuctionStatus.Closed && accountBidderData) {
      setWonAuction({
        auction: currentAuction,
        bidderData: accountBidderData,
      })
    } else if (previousAuctionId > 0) {
      checkIfWonPreviousAuction(previousAuctionId)
    }
  }, [currentAuction, bidders, account, farmAuctionContract])

  return wonAuction
}

export default useCongratulateAuctionWinner
