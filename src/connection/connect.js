import { GRAPHQL_WS } from 'subscriptions-transport-ws/dist/protocol'

import ConnectionTimeout from './ConnectionTimeout'
import ConnectionPath from './ConnectionPath'

import createWebSocket from './dat/createWebSocket'
import createDatPeerNetwork from './dat/createDatPeerNetwork'

import randomBytes from '../p2pCrypto/randomBytes'

const safeGlobal = (
  (typeof global !== 'undefined' && global)
  || (typeof window !== 'undefined' && window)
  || {}
)

const nativeDatPeers = (
  safeGlobal.experimental && safeGlobal.experimental.datPeers
)

const CONNECTION_TIMEOUT = 7000

const connect = async (options) => {
  const {
    identityKeys,
    peerIdentityPublicKey,
    protocol = GRAPHQL_WS,
    initiator = true,
    timeout = CONNECTION_TIMEOUT,
    request,
    datPeer,
    datPeers = nativeDatPeers,
    webSocketImpl,
    websocketURL,
    wrtc,
    shouldAbortConnection = () => false,
    meta = {},
    onMeta,
  } = options

  let {
    sessionID,
    datPeerNetwork,
  } = options

  const timeoutAt = timeout == null ? null : Date.now() + timeout

  sessionID = sessionID || (await randomBytes(32)).toString('hex')

  datPeerNetwork = datPeerNetwork || createDatPeerNetwork({
    datPeers,
    timeoutAt,
    createWebSocket: createWebSocket({
      identityKeys,
      webSocketImpl,
      websocketURL,
    }),
  })

  const connectionPath = ConnectionPath({
    identityKeys,
    peerIdentityPublicKey,
    datPeer,
    datPeerNetwork,
    wrtc,
    initiator,
    request,
    webSocketImpl,
    websocketURL,
    meta,
    onMeta,
  })

  const connectionReducer = (currentConnectionPromise, nextConnectionFn) => (
    currentConnectionPromise.then(async (currentConnection) => {
      const nextConnection = await nextConnectionFn({
        currentConnection,
        protocol,
        sessionID,
        timeoutAt,
      })

      const timedout = timeout != null && Date.now() > timeoutAt

      if (shouldAbortConnection() || timedout) {
        // if the socket has been closed then stop the connection process
        nextConnection.close()
        if (timedout) {
          throw new ConnectionTimeout()
        } else {
          throw new Error('aborting the connection')
        }
      }

      return nextConnection
    })
  )

  return connectionPath.reduce(connectionReducer, Promise.resolve(null))
}

export default connect
