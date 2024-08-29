import type { BunNetwork } from '../index'
import { 
  SessionFetchError, SessionFetchErrorCode, 
  SessionValidationError, SessionValidationErrorCode 
} from '@session.js/errors'
import type { RequestDownloadAttachment } from '@session.js/types/network/request'

export async function downloadAttachment(this: BunNetwork, body: RequestDownloadAttachment): Promise<ArrayBuffer> {
  if (!/^\d+$/.test(body.id)) {
    throw new SessionValidationError({ code: SessionValidationErrorCode.InvalidMessage, message: 'File ID must be a number' })
  }
  const response = await fetch('http://filev2.getsession.org/file/' + body.id, {
    proxy: this.proxy
  })
  if (response.status !== 200) {
    throw new SessionFetchError({
      code: SessionFetchErrorCode.InvalidResponse,
      message: 'Couldn\'t download file from filev2 server'
    })
  }
  return await response.arrayBuffer()
}