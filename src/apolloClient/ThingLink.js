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

  return thingLink
}

export default ThingLink
