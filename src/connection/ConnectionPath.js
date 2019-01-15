import DatConnection from './dat/DatConnection'
// import WebSocketConnection from './webSocket/WebSocketConnection'
import UpgradeToWebRTC from './webRTC/UpgradeToWebRTC'

import EncryptedConnection from './encryptedConnection/EncryptedConnection'

// const signallingWebsocket = (() => {
//   let ws = null
//
//   return () => {
//     // eslint-disable-next-line no-undef
//     if (ws == null) ws = new WebSocket(SIGNALLING_WEBSOCKET_URL)
//     return ws
//   }
// })()

const ConnectionPath = ({
  identityKeys,
  peerIdentityPublicKey,
  initiator,
  datPeers,
  datPeer,
  datPeerID,
  datPeerNetwork,
  request,
  wrtc,
}) => {
  // let initialConnection

  if (initiator == null) {
    throw new Error('initiator cannot be null. Must be either true or false')
  }

  const initialConnection = DatConnection({
    datPeers,
    datPeer,
    datPeerID,
    datPeerNetwork,
  })

  // // TODO: websocket fallback
  // if (datPeers != null) {
  //   initialConnection = DatConnection({
  //     datPeers,
  //     peer: datPeers.get(peerDatID),
  //   })
  // } else {
  //   initialConnection = WebSocketConnection({
  //     websocket: signallingWebsocket(),
  //     peerIdentityPublicKey,
  //   })
  // }

  const connectionPath = [
    // connect to Dat Peer or tunnel through a WebSocket to the peer
    initialConnection,
    // Establish a secure connection
    EncryptedConnection({
      initiator,
      identityKeys,
      peerIdentityPublicKey,
      request,
    }),
    // Exchange SDPs over the secure connection and switch to WebRTC
    UpgradeToWebRTC({
      initiator,
      wrtc,
    }),
  ]
  return connectionPath
}

export default ConnectionPath
