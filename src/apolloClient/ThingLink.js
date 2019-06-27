import { WebSocketLink } from 'apollo-link-ws'

import createWebSocket from '../connection/dat/createWebSocket'
import createDatPeerNetwork from '../connection/dat/createDatPeerNetwork'
import wrapInSocketAPI from '../connection/wrapInSocketAPI'
import ConnectionPath from '../connection/ConnectionPath'

const browserDatPeers = (
  // eslint-disable-next-line no-undef
  typeof experimental === 'undefined' ? null : experimental.datPeers
)

const ThingLink = ({
  identityKeys,
  peerIdentityPublicKey,
  timeout = 7000,
  datPeers = browserDatPeers,
  websocketURL,
  ws,
  wrtc,
  options,
  onError,
}) => {
  const datPeerNetwork = createDatPeerNetwork({
    datPeers,
    createWebSocket: createWebSocket({ identityKeys, ws, websocketURL }),
  })

  const connectionPath = ConnectionPath({
    identityKeys,
    peerIdentityPublicKey,
    datPeerNetwork,
    wrtc,
    initiator: true,
  })

  const socketImpl = wrapInSocketAPI({
    connectionPath,
    timeout,
  })

  const thingLink = new WebSocketLink({
    uri: 'wss://example.com',
    options,
    webSocketImpl: socketImpl,
  })

  thingLink.subscriptionClient.onError(onError)

  /*
   * Override the default 1 second connection timeout with something
   * more appropriate for the time it takes to connect over Dat + WebRTC
   *
   * TODO: make this a user-configurable option
   */
  const sub = thingLink.subscriptionClient
  clearTimeout(sub.maxConnectTimeoutId)
  // sub.maxConnectTimeoutId = setTimeout(() => {
  //   if (sub.status !== sub.wsImpl.OPEN) {
  //     sub.reconnecting = true
  //     sub.close(false, true)
  //   }
  // }, 10000)

  return thingLink
}

export default ThingLink
