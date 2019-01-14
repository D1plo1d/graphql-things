import { WebSocketLink } from 'apollo-link-ws'

import wrapInSocketAPI from '../connection/wrapInSocketAPI'
import ConnectionPath from '../connection/ConnectionPath'

const browserDatPeers = (
  // eslint-disable-next-line no-undef
  typeof experimental === 'undefined' ? null : experimental.peers
)

const ThingLink = ({
  identityKeys,
  peerIdentityPublicKey,
  datPeers = browserDatPeers,
  options,
}) => {
  // TODO: getDatIDFromPublicKey if it differs
  const datPeerID = peerIdentityPublicKey

  const connectionPath = ConnectionPath({
    identityKeys,
    peerIdentityPublicKey,
    datPeers,
    datPeerID,
    initiator: true,
  })

  const socketImpl = wrapInSocketAPI({
    connectionPath,
  })

  const thingLink = new WebSocketLink({
    uri: 'wss://example.com',
    options,
    webSocketImpl: socketImpl,
  })

  /*
   * Override the default 1 second connection timeout with something
   * more appropriate for the time it takes to connect over Dat + WebRTC
   *
   * TODO: make this a user-configurable option
   */
  const sub = thingLink.subscriptionClient
  clearTimeout(sub.maxConnectTimeoutId)
  sub.maxConnectTimeoutId = setTimeout(() => {
    if (sub.status !== sub.wsImpl.OPEN) {
      sub.reconnecting = true
      sub.close(false, true)
    }
  }, 10000)

  return thingLink
}

export default ThingLink
