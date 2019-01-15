import EventEmitter from 'eventemitter3'

import ConnectionPath from '../connection/ConnectionPath'
import createDatPeerNetwork from '../connection/dat/createDatPeerNetwork'
import wrapInSocketAPI, { SOCKET_STATES } from '../connection/wrapInSocketAPI'

/*
 * creates a new WebsocketServer API-compatible GraphQLThing
 */
const GraphqlThing = ({
  datPeers,
  identityKeys,
  // authenticate({ peerIdentityPublicKey }) => boolean
  authenticate,
}) => {
  if (typeof authenticate !== 'function') {
    throw new Error('an authenticate callback is required')
  }
  // const {
  //   connectionPath = ConnectionPath(params),
  // } = params
  const sessionIDs = []

  const datPeerNetwork = createDatPeerNetwork({
    datPeers,
  })
  datPeerNetwork.connect()

  const socketServer = Object.assign(new EventEmitter(), {
    ...SOCKET_STATES,
    close: (cb = () => {}) => {
      datPeerNetwork.close()
      socketServer.emit('close')
      cb()
    },
  })

  console.log('LISTENING')

  datPeerNetwork.onHandshakeReq = async ({ datPeer, message }) => {
    console.log('handshake received', { datPeer, message })
    const {
      sessionID,
      identityPublicKey: peerIdentityPublicKey,
    } = message

    if (sessionIDs.includes(sessionID)) return
    if (authenticate({ peerIdentityPublicKey }) === false) return

    const connectionPath = ConnectionPath({
      identityKeys,
      peerIdentityPublicKey,
      initiator: false,
      datPeers,
      datPeer,
      datPeerNetwork,
      request: message,
    })

    const createSocket = wrapInSocketAPI({
      connectionPath,
      sessionID,
    })
    const socket = createSocket(null, null)

    socketServer.emit('connection', socket)
  }

  datPeerNetwork.onError = (error) => {
    socketServer.emit('error', error)
  }

  return socketServer
}

export default GraphqlThing
