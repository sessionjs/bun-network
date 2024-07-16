import { doSnodeBatchRequest } from '../batch-request'
import type { RequestGetSwarmsBody } from '@session.js/types/network/request'
import type { ResponseGetSwarms } from '@session.js/types/network/response'
import type { Swarm } from '@session.js/types/swarm'

export async function getSwarms({ snode, pubkey }: RequestGetSwarmsBody): Promise<ResponseGetSwarms> {
  const result = await doSnodeBatchRequest([{
    method: 'get_swarm',
    params: {
      pubkey,
    },
  }], snode, 10000)
  const swarms = result[0].body.snodes as Swarm[]
  return { swarms }
}