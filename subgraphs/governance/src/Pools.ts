import { StakeAndVote } from '../generated/VOTE-POOL-1/VotePool'
import {Vote } from '../generated/schema'

export function handlerStakeAndVote(event: StakeAndVote): void {
  let id = event.transaction.from.toHexString() + event.params.proposalID.toString()
   let vote = Vote.load(id)
  if (vote == null) {
    vote = new Vote(id)
    vote.address = event.transaction.from
    vote.proposalID = event.params.proposalID
    vote.amount = event.params.amount
  }else{
    vote.amount = vote.amount.plus(event.params.amount)
  }
  vote.save()
}