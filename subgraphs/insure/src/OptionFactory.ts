import { OptionCreated } from '../generated/OptionFactory/OptionFactory'
import { Option } from '../generated/schema'

export function handleOptionCreated(event: OptionCreated): void {
  let option = new Option(event.params.long.toHex())
  option.creator = event.params.creator
  option.collateral = event.params._collateral
  option.underlying = event.params._underlying
  option.strikePrice = event.params._strikePrice
  option.expiry = event.params._expiry
  option.long = event.params.long
  option.short = event.params.short
  option.save()
}