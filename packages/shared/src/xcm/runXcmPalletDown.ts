import { type KeyringPair } from '@polkadot/keyring/types'
import { it } from 'vitest'
import { sendTransaction } from '@acala-network/chopsticks-testing'

import { Client } from '@e2e-test/networks'
import { GetBalance, Tx } from './types.js'
import { check, checkEvents, checkSystemEvents, defaultAccount } from '../helpers/index.js'

export const runXcmPalletDown = (
  name: string,
  setup: () => Promise<{
    fromChain: Client
    toChain: Client
    tx: Tx
    balance: GetBalance

    routeChain?: Client
    fromAccount?: KeyringPair
    toAccount?: KeyringPair
    isCheckUmp?: boolean
    precision?: number
  }>,
  tearDown?: () => Promise<void>,
) => {
  it(
    name,
    async () => {
      const {
        fromChain,
        toChain,
        tx,
        balance,
        fromAccount = defaultAccount.alice,
        toAccount = defaultAccount.alice,
        precision = 3,
      } = await setup()

      const tx0 = await sendTransaction(tx(fromChain, toAccount.addressRaw).signAsync(fromAccount))

      await fromChain.chain.newBlock()

      await check(fromChain.api.query.system.account(fromAccount.address))
        .redact({ number: precision })
        .toMatchSnapshot('balance on from chain')
      await checkEvents(tx0, 'xcmPallet').redact({ number: precision }).toMatchSnapshot('tx events')

      await toChain.chain.newBlock()

      await check(balance(toChain, toAccount.address))
        .redact({ number: precision })
        .toMatchSnapshot('balance on to chain')
      await checkSystemEvents(toChain, 'parachainSystem', 'dmpQueue', 'messageQueue').toMatchSnapshot(
        'to chain dmp events',
      )

      tearDown && (await tearDown())
    },
    240000,
  )
}
