import { 
  RequestType,
  type RequestGetSwarmsBody,
  type RequestPollBody,
  type RequestStoreBody,
  type RequestUploadAttachment,
  type RequestDownloadAttachment,
  type RequestDeleteMessages
} from '@session.js/types/network/request'
import type { 
  ResponseGetSnodes, 
  ResponseGetSwarms, 
  ResponseStore, 
  ResponseUploadAttachment
} from '@session.js/types/network/response'
import type { Network } from '@session.js/types'

import { storeMessage } from './routes/store'
import { getSnodes } from './routes/get-snodes'
import { getSwarms } from './routes/get-swarms'
import { poll } from './routes/poll'
import { uploadAttachment } from './routes/upload-attachment'
import { downloadAttachment } from './routes/download-attachment'
import { deleteMessages } from './routes/delete-messages'
import { SessionFetchError, SessionFetchErrorCode } from '@session.js/errors'

export async function onRequest(this: BunNetwork, type: RequestType.Store, body: RequestStoreBody): Promise<ResponseStore>
export async function onRequest(this: BunNetwork, type: RequestType.GetSnodes, body: object): Promise<ResponseGetSnodes>
export async function onRequest(this: BunNetwork, type: RequestType.GetSwarms, body: RequestGetSwarmsBody): Promise<ResponseGetSwarms>
export async function onRequest(this: BunNetwork, type: RequestType.UploadAttachment, body: RequestUploadAttachment): Promise<ResponseUploadAttachment>
export async function onRequest(this: BunNetwork, type: RequestType.DownloadAttachment, body: RequestDownloadAttachment): Promise<ArrayBuffer>
export async function onRequest(this: BunNetwork, type: RequestType, body: object): Promise<object> {
  switch(type) {
    case RequestType.Store:
      return await storeMessage.call(this, body as RequestStoreBody)

    case RequestType.GetSnodes:
      return await getSnodes.call(this)

    case RequestType.GetSwarms:
      return await getSwarms.call(this, body as RequestGetSwarmsBody)

    case RequestType.Poll:
      return await poll.call(this, body as RequestPollBody)

    case RequestType.UploadAttachment:
      return await uploadAttachment.call(this, body as RequestUploadAttachment)

    case RequestType.DownloadAttachment:
      return await downloadAttachment.call(this, body as RequestDownloadAttachment)

    case RequestType.DeleteMessages:
      return await deleteMessages.call(this, body as RequestDeleteMessages)

    default:
      throw new SessionFetchError({ code: SessionFetchErrorCode.UnknownMethod, message: 'Invalid request type' })
  }
}

export type ProxyOptions = {
  protocol: 'http' | 'https',
  username?: string,
  password?: string,
  hostname: string,
  port: number
}

export class BunNetwork implements Network {
  proxy: string | undefined

  constructor(options: { proxy?: ProxyOptions | string }) {
    this.proxy = options.proxy && (
      typeof options.proxy === 'string'
        ? options.proxy
        : (options.proxy.username && options.proxy.password)
          ? `${options.proxy.protocol}://${options.proxy.username}:${options.proxy.password}@${options.proxy.hostname}:${options.proxy.port}`
          : `${options.proxy.protocol}://${options.proxy.hostname}:${options.proxy.port}`
    )
  }

  onRequest(this: BunNetwork, type: RequestType, body: object): Promise<object> {
    return onRequest.call(this, type as any, body as any)
  }
}