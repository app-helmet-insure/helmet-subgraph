import { BigInt } from '@graphprotocol/graph-ts'
import { Buy, Sell, Cancel, Reprice, Waive } from '../generated/OptionOrder/OptionOrder'
import { OrderAsk, OrderBid } from '../generated/schema'

export function handleSell(event: Sell): void {
  let orderAsk = new OrderAsk(event.params.askID.toHex())
  orderAsk.askID = event.params.askID
  orderAsk.seller = event.params.seller
  orderAsk.long = event.params.long
  orderAsk.volume = event.params.volume
  orderAsk.settleToken = event.params.settleToken
  orderAsk.price = event.params.price
  orderAsk.isCancel = false
  orderAsk.option = event.params.long.toHex()
  orderAsk.save()
}

export function handleBuy(event: Buy): void {
  let orderBid = new OrderBid(event.params.bidID.toHex())
  orderBid.bidID = event.params.bidID
  orderBid.askID = event.params.askID
  orderBid.buyer = event.params.buyer
  orderBid.volume = event.params.vol
  orderBid.amount = event.params.amt
  orderBid.orderAsk = orderBid.askID.toHex()
  orderBid.save()
}

export function handleCancel(event: Cancel): void {
  let orderAsk = OrderAsk.load(event.params.askID.toHex())
  orderAsk.isCancel = true
  orderAsk.save()
}

export function handleReprice(event: Reprice): void {
  let orderAsk = OrderAsk.load(event.params.askID.toHex())
  orderAsk.isCancel = true
  orderAsk.save()

  // new ask
  let newOrderAsk = new OrderAsk(event.params.newAskID.toHex())
  newOrderAsk.askID = event.params.newAskID
  newOrderAsk.seller = event.params.seller
  newOrderAsk.long = event.params.long
  newOrderAsk.volume = event.params.volume
  newOrderAsk.settleToken = event.params.settleToken
  newOrderAsk.price = event.params.newPrice
  newOrderAsk.isCancel = false
  newOrderAsk.option = event.params.long.toHex()
  newOrderAsk.save()
}

export function handleWaive(event: Waive): void {
  let orderBid = OrderAsk.load(event.params.bidID.toHex())
  if(orderBid.volume.ge(event.params.vol)){
    orderBid.volume = orderBid.volume.minus(event.params.vol)
  }else{
    orderBid.volume = BigInt.fromI32(0)
  }
  orderBid.save()
}