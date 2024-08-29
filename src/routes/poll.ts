import { SessionFetchError, SessionFetchErrorCode } from '@session.js/errors'
import { SessionValidationError, SessionValidationErrorCode } from '@session.js/errors'
import { doSnodeBatchRequest } from '../batch-request'
import type { RetrieveLegacyClosedGroupSubRequestType, RetrieveSubRequestType } from '../snode-request-types'
import type { RequestPollBody } from '@session.js/types/network/request'
import type { ResponsePoll } from '@session.js/types/network/response'
import { SnodeNamespace, SnodeNamespaces } from '@session.js/types/namespaces'
import type { Snode } from '@session.js/types/snode'
import type { RequestNamespace, RetrieveMessageItem, RetrieveMessagesResultsBatched, RetrieveMessagesResultsContent } from '@session.js/types/snode-retrieve'
import type { Swarm } from '@session.js/types/swarm'
import _ from 'lodash'
import type { BunNetwork } from '../index'

export async function poll(this: BunNetwork, { swarm, namespaces }: RequestPollBody): Promise<ResponsePoll> {
  if (namespaces.length === 0) {
    throw new SessionValidationError({ code: SessionValidationErrorCode.InvalidNamespaces, message: `invalid number of retrieve namespace provided: ${namespaces.length}` })
  }
  if (namespaces.some(ns => ns.namespace === 'all')) throw new SessionValidationError({ code: SessionValidationErrorCode.UnsupportedFeature, message: 'namespace "all" is not supported yet' })
  const results = await pollSnode.call(this, { swarm, namespaces })
  if (results === null) {
    throw new SessionFetchError({ code: SessionFetchErrorCode.InvalidResponse, message: 'Polling failed' })
  } else {
    return { messages: results }
  }
}

export async function pollSnode(this: BunNetwork, { swarm, namespaces }: {
  swarm: Swarm
  namespaces: Array<RequestNamespace>;
}): Promise<{ namespace: SnodeNamespaces, messages: RetrieveMessageItem[] }[]> {
  const request = await buildRetrieveRequest(namespaces)

  const results = await retrieveNextMessages.call(
    this,
    { public_ip: swarm.ip, storage_port: Number(swarm.port), pubkey_ed25519: swarm.pubkey_ed25519, pubkey_x25519: swarm.pubkey_x25519 },
    request,
    namespaces.map(ns => ns.namespace as SnodeNamespaces),
  )

  return results.map(({ messages, namespace }) => ({ namespace, messages: messages.messages as RetrieveMessageItem[] }))
}

export const ERROR_CODE_NO_CONNECT = 'ENETUNREACH: No network connection.'

export async function retrieveNextMessages(
  this: BunNetwork,
  targetNode: Snode,
  retrieveRequestsParams: RetrieveSubRequestType[],
  namespaces: Array<SnodeNamespaces>
): Promise<RetrieveMessagesResultsBatched> {
  const timeOutMs = 4 * 1000
  const timeoutPromise = async () => new Promise(resolve => setTimeout(resolve, timeOutMs))
  const fetchPromise = async () =>
    doSnodeBatchRequest.call(this, retrieveRequestsParams, targetNode, timeOutMs)

  const results = await Promise.race([timeoutPromise(), fetchPromise()])
  if (!results || !_.isArray(results) || !results.length) {
    throw new SessionFetchError({ code: SessionFetchErrorCode.FetchFailed, message: `Could not connect to ${targetNode.public_ip}:${targetNode.storage_port}` })
  }

  // the +1 is to take care of the extra `expire` method added once user config is released
  if (results.length !== namespaces.length && results.length !== namespaces.length + 1) {
    throw new SessionFetchError({ code: SessionFetchErrorCode.InvalidResponse, message: 'Invalid number of results. Expected: ' + namespaces.length + ' or ' + (namespaces.length + 1) + ' but got: ' + results.length })
  }

  try {
    return results.map((result, index) => ({
      code: result.code,
      messages: result.body as RetrieveMessagesResultsContent,
      namespace: namespaces[index],
    }))
  } catch (e) {
    throw new SessionFetchError({ code: SessionFetchErrorCode.InvalidResponse, message: 'Couldn\'t parse json of ' + targetNode.public_ip + ':' + targetNode.storage_port })
  }
}

async function buildRetrieveRequest(
  namespaces: Array<RequestNamespace>
): Promise<Array<RetrieveSubRequestType>> {
  const maxSizeMap = SnodeNamespace.maxSizeMap(namespaces.map(ns => ns.namespace as SnodeNamespaces))
  const retrieveRequestsParams: Array<RetrieveSubRequestType> = await Promise.all(
    namespaces.map(async ({ namespace, pubkey, isOurPubkey, lastHash, signature }) => {
      const foundMaxSize = maxSizeMap.find(m => m.namespace === namespace)?.maxSize
      const retrieveParam = {
        pubkey: pubkey,
        lastHash: lastHash || '',
        namespace,
        timestamp: signature.timestamp,
        maxSize: foundMaxSize,
      }

      if (namespace === SnodeNamespaces.ClosedGroupMessage) {
        if (isOurPubkey || !pubkey.startsWith('05')) {
          throw new Error(
            'SnodeNamespace `-10` (ClosedGroupMessage) can only be used to retrieve messages from a legacy closed group (prefix 05). If you\'re developer trying to poll user\'s closed chat groups and other groups, you\'re probably looking for SnodeNamespace `5` (UserGroups)'
          )
        }
        const retrieveLegacyClosedGroup = {
          ...retrieveParam,
          namespace,
        }
        const retrieveParamsLegacy: RetrieveLegacyClosedGroupSubRequestType = {
          method: 'retrieve',
          params: _.omit(retrieveLegacyClosedGroup, 'timestamp'), // if we give a timestamp, a signature will be required by the service node, and we don't want to provide one as this is an unauthenticated namespace
        }

        return retrieveParamsLegacy
      }

      // all legacy closed group retrieves are unauthenticated and run above.
      // if we get here, this can only be a retrieve for our own swarm, which must be authenticated
      if (
        !SnodeNamespace.isUserConfigNamespace(namespace as SnodeNamespaces) &&
        namespace !== SnodeNamespaces.UserMessages
      ) {
        throw new SessionValidationError({ code: SessionValidationErrorCode.NotZeroNamespaceNotLegacyClosedGroup, message: 'Namespace should be 0 when polling legacy closed group, got' + namespace })
      }
      if (!isOurPubkey) {
        throw new SessionValidationError({ code: SessionValidationErrorCode.NotOurPubkeyNotLegacyClosedGroup, message: 'While polling for new messages that are not legacy closed group, pubkey can only be ours' })
      }
      const retrieve: RetrieveSubRequestType = {
        method: 'retrieve',
        params: { 
          ...retrieveParam,
          namespace: retrieveParam.namespace as SnodeNamespaces, 
          ...signature,
          pubkey_ed25519: signature.pubkeyEd25519 
        }
      }
      return retrieve
    })
  )

  return retrieveRequestsParams
}