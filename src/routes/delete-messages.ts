import type { BunNetwork } from '../index'
import { SessionFetchError, SessionFetchErrorCode } from '@session.js/errors'
import { doSnodeBatchRequest } from '../batch-request'
import type { RequestDeleteMessages } from '@session.js/types/network/request'
import _ from 'lodash'

export async function deleteMessages(this: BunNetwork, { pubkey, pubkey_ed25519, signature, swarm, hashes }: RequestDeleteMessages): Promise<{}> {
  const result = await doSnodeBatchRequest.call(
    this,
    [{
      method: 'delete', 
      params: {
        messages: hashes,
        pubkey,
        pubkey_ed25519,
        signature
      }
    }],
    { public_ip: swarm.ip, storage_port: Number(swarm.port), pubkey_ed25519: swarm.pubkey_ed25519, pubkey_x25519: swarm.pubkey_x25519 },
    10000
  )

  if (!result || !result.length) {
    throw new SessionFetchError({ code: SessionFetchErrorCode.InvalidResponse, message: 'Invalid result in storeOnMode' })
  }

  const firstResult = result[0]

  if (firstResult.code !== 200) {
    throw new SessionFetchError({ code: SessionFetchErrorCode.InvalidResponse, message: 'Invalid status code: ' + firstResult.code })
  }

  return {}
}
