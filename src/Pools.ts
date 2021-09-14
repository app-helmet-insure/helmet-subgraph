import { Transfer } from '../generated/Helmet/ERC20'
import { Staked, Withdrawn } from '../generated/HELMET-BNB-LPT/StakingPool'
import { Account, Pool, AccountPool, Token, TokenDay, PoolDay } from '../generated/schema'
import { BigInt, Address, Bytes, ethereum, log } from '@graphprotocol/graph-ts'

const TOKEN_ADDRESS = "0x948d2a81086A075b3130BAc19e4c6DEe1D2E3fE8"

export function handlerTransfer(event: Transfer): void {
  let fromId = event.params.from.toHex()
  let toId = event.params.to.toHex()

  let fromAccount = Account.load(fromId)
  let toAccount = Account.load(toId)

  if (fromAccount == null) {
    fromAccount = new Account(toId)
    fromAccount.createdAt = event.block.timestamp
    fromAccount.address = event.params.to
    fromAccount.balance = BigInt.fromI32(0)
    fromAccount.stake = BigInt.fromI32(0)
    fromAccount.total = fromAccount.balance.plus(fromAccount.stake)
  } else {
    if (fromAccount.balance.ge(event.params.value)) {
      fromAccount.balance = fromAccount.balance.minus(event.params.value)
      updateToken(fromAccount.total, fromAccount.balance.plus(fromAccount.stake))
      fromAccount.total = fromAccount.balance.plus(fromAccount.stake)
    } else {
      fromAccount.balance = BigInt.fromI32(0)
      updateToken(fromAccount.total, fromAccount.balance.plus(fromAccount.stake))
      fromAccount.total = fromAccount.balance.plus(fromAccount.stake)
    }
  }

  if (toAccount == null) {
    toAccount = new Account(toId)
    toAccount.createdAt = event.block.timestamp
    toAccount.address = event.params.to
    toAccount.balance = event.params.value
    toAccount.stake = BigInt.fromI32(0)
    updateToken(BigInt.fromI32(0), toAccount.balance.plus(toAccount.stake))
    toAccount.total = toAccount.balance.plus(toAccount.stake)
  } else {
    toAccount.balance = toAccount.balance.plus(event.params.value)
    updateToken(toAccount.total, toAccount.balance.plus(toAccount.stake))
    toAccount.total = toAccount.balance.plus(toAccount.stake)
  }
  fromAccount.save()
  toAccount.save()

  updateTokenDay(event)
}

export function handlerStaked(event: Staked): void {
  let poolId = event.transaction.to.toHex()
  let pool = Pool.load(poolId)
  if (pool == null) {
    pool = new Pool(poolId)
    pool.createdAt = event.block.timestamp
    pool.address = event.transaction.to.toHexString()
    pool.total = BigInt.fromI32(0)
    pool.amount = BigInt.fromI32(0)
  }

  let accountId = event.params.user.toHex()
  let account = Account.load(accountId)
  if (account == null) {
    return
  }

  let accountPoolId = event.transaction.to.toHex().concat(event.params.user.toHex())
  let accountPool = AccountPool.load(accountPoolId)
  if (accountPool == null) {
    accountPool = new AccountPool(accountPoolId)
    accountPool.accountAddress = event.params.user
    accountPool.poolAddress = event.transaction.to.toHexString()
    accountPool.pool = poolId
    accountPool.account = event.params.user.toHex()
    accountPool.createdAt = event.block.timestamp
    accountPool.amount = BigInt.fromI32(0)

  }
  

  if(accountPool.amount.equals(BigInt.fromI32(0)) && event.params.amount.gt(BigInt.fromI32(0))) {
    // 如果当前是0，且质押数量大于0，则加一
    pool.total = pool.total.plus(BigInt.fromI32(1))
  }

  accountPool.amount = accountPool.amount.plus(event.params.amount)
  accountPool.save()

  pool.amount = pool.amount.plus(event.params.amount)
  pool.save()


  account.stake = account.stake.plus(event.params.amount)
  updateToken(account.total, account.balance.plus(account.stake))
  account.total = account.balance.plus(account.stake)
  account.save()

  updateTokenDay(event)
  updatePoolDay(pool, event)
}


export function handlerWithdrawn(event: Withdrawn): void {
  let poolId = event.transaction.to.toHex()
  let pool = Pool.load(poolId)
  if (pool == null) {
    return
  }

  let accountId = event.params.user.toHex()
  let account = Account.load(accountId)
  if (account == null) {
    return
  }

  let accountPoolId = event.transaction.to.toHex().concat(event.params.user.toHex())
  let accountPool = AccountPool.load(accountPoolId)
  if (accountPool == null) {
    return
  }

  accountPool.amount = accountPool.amount.minus(event.params.amount)
  if(accountPool.amount.equals(BigInt.fromI32(0))) {
    pool.total = pool.total.minus(BigInt.fromI32(1))
  }
  accountPool.save()

  pool.amount = pool.amount.minus(event.params.amount)
  pool.save()

  account.stake = account.stake.minus(event.params.amount)

  updateToken(account.total, account.balance.plus(account.stake))
  account.total = account.balance.plus(account.stake)
  account.save()

  updateTokenDay(event)
  updatePoolDay(pool, event)
}

export function updateToken(old_total: BigInt, total: BigInt): void {
  let token = Token.load(TOKEN_ADDRESS)
  if (token == null) {
    token = new Token(TOKEN_ADDRESS)
    token.holders = BigInt.fromI32(0)
    token.holders1000 = BigInt.fromI32(0)
    token.holders2000 = BigInt.fromI32(0)
    token.holders5000 = BigInt.fromI32(0)
    token.holders10000 = BigInt.fromI32(0)
    token.holders20000 = BigInt.fromI32(0)
    token.holders50000 = BigInt.fromI32(0)
  }

  switch (true) {
    case old_total.ge(BigInt.fromI32(20000).times(BigInt.fromI32(10).pow(18))):
      token.holders20000 = token.holders20000.minus(BigInt.fromI32(1))
    case old_total.ge(BigInt.fromI32(10000).times(BigInt.fromI32(10).pow(18))):
      token.holders10000 = token.holders10000.minus(BigInt.fromI32(1))
    case old_total.ge(BigInt.fromI32(5000).times(BigInt.fromI32(10).pow(18))):
      token.holders5000 = token.holders5000.minus(BigInt.fromI32(1))
    case old_total.ge(BigInt.fromI32(2000).times(BigInt.fromI32(10).pow(18))):
      token.holders2000 = token.holders2000.minus(BigInt.fromI32(1))
    case old_total.ge(BigInt.fromI32(1000).times(BigInt.fromI32(10).pow(18))):
      token.holders1000 = token.holders1000.minus(BigInt.fromI32(1))
    case old_total.gt(BigInt.fromI32(0)):
      token.holders = token.holders.minus(BigInt.fromI32(1))
  }

  switch (true) {
    case total.ge(BigInt.fromI32(20000).times(BigInt.fromI32(10).pow(18))):
      token.holders20000 = token.holders20000.plus(BigInt.fromI32(1))
    case total.ge(BigInt.fromI32(10000).times(BigInt.fromI32(10).pow(18))):
      token.holders10000 = token.holders10000.plus(BigInt.fromI32(1))
    case total.ge(BigInt.fromI32(5000).times(BigInt.fromI32(10).pow(18))):
      token.holders5000 = token.holders5000.plus(BigInt.fromI32(1))
    case total.ge(BigInt.fromI32(2000).times(BigInt.fromI32(10).pow(18))):
      token.holders2000 = token.holders2000.plus(BigInt.fromI32(1))
    case total.ge(BigInt.fromI32(1000).times(BigInt.fromI32(10).pow(18))):
      token.holders1000 = token.holders1000.plus(BigInt.fromI32(1))
    case total.gt(BigInt.fromI32(0)):
      token.holders = token.holders.plus(BigInt.fromI32(1))
  }

  token.save()
}

export function updateTokenDay(event: ethereum.Event): void {
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let tokenDay = TokenDay.load(dayID.toString())
  if (tokenDay === null) {
    tokenDay = new TokenDay(dayID.toString())
    tokenDay.date = dayStartTimestamp
    tokenDay.holders = BigInt.fromI32(0)
    tokenDay.holders1000 = BigInt.fromI32(0)
    tokenDay.holders2000 = BigInt.fromI32(0)
    tokenDay.holders5000 = BigInt.fromI32(0)
    tokenDay.holders10000 = BigInt.fromI32(0)
    tokenDay.holders20000 = BigInt.fromI32(0)
    tokenDay.holders50000 = BigInt.fromI32(0)
  }

  let token = Token.load(TOKEN_ADDRESS)

  tokenDay.holders = token.holders
  tokenDay.holders1000 = token.holders1000
  tokenDay.holders2000 = token.holders2000
  tokenDay.holders5000 = token.holders5000
  tokenDay.holders10000 = token.holders10000
  tokenDay.holders20000 = token.holders20000
  tokenDay.holders50000 = token.holders50000
  tokenDay.save()
}

export function updatePoolDay(pool: Pool | null, event: ethereum.Event): void {
  if (pool == null) {
    return
  }
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let poolDayId = pool.id.concat(dayID.toString());
  let poolDay = PoolDay.load(poolDayId)
  if (poolDay == null) {
    poolDay = new PoolDay(poolDayId.toString())
    poolDay.address = pool.address
    poolDay.date = dayStartTimestamp
    poolDay.total = BigInt.fromI32(0)
    poolDay.amount = BigInt.fromI32(0)
  }

  poolDay.total = pool.total
  poolDay.amount = pool.amount
  poolDay.save()
}