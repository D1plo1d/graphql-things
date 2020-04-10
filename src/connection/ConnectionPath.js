import DatConnection from './dat/DatConnection'
// import WebSocketConnection from './webSocket/WebSocketConnection'
import UpgradeToWebRTC from './webRTC/UpgradeToWebRTC'

import EncryptedConnection from './encryptedConnection/EncryptedConnection'

const ConnectionPath = ({
  identityKeys,
  peerIdentityPublicKey,
  initiator,
  datPeer,
  datPeerNetwork,
  request,
  wrtc,
  meta,
  onMeta,
  authToken,
  authenticate,
  iceServers,
}) => {
  if (initiator == null) {
    throw new Error('initiator cannot be null. Must be either true or false')
  }

  const initialConnection = DatConnection({
    datPeer,
    datPeerNetwork,
  })

  const connectionPath = [
    // connect to Dat Peer or tunnel through a WebSocket to the peer
    initialConnection,
    // Establish a secure connection
    EncryptedConnection({
      initiator,
      identityKeys,
      peerIdentityPublicKey,
      request,
      authToken,
      authenticate,
      initiatorIceServers: iceServers,
    }),
    // Exchange SDPs over the secure connection and switch to WebRTC
    UpgradeToWebRTC({
      initiator,
      wrtc,
      meta,
      onMeta,
    }),
  ]
  return connectionPath
}

export default ConnectionPath
