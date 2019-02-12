import EventEmitter from 'eventemitter3'
import Debug from 'debug'

import eventTrigger from '../eventTrigger'
import ConnectionPath from '../connection/ConnectionPath'
import createDatPeerNetwork from '../connection/dat/createDatPeerNetwork'
import wrapInSocketAPI, { SOCKET_STATES } from '../connection/wrapInSocketAPI'

const debug = Debug('graphql-things:connection')

/*
 * creates a new WebsocketServer API-compatible GraphQLThing
 */
const GraphqlThing = ({
  datPeers,
  identityKeys,
  // authenticate({ peerIdentityPublicKey }) => boolean
  authenticate,
  wrtc,
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
    .then(() => {
      debug('listening for dat peers')
    }).catch((e) => {
      throw new Error(e)
    })

  const socketServer = Object.assign(new EventEmitter(), {
    ...SOCKET_STATES,
    close: (cb = () => {}) => {
      datPeerNetwork.close()
      socketServer.emit('close')
      cb()
    },
  })

  const handleHandshakeReq = async ({ datPeer, message }) => {
    const {
      sessionID,
      identityPublicKey: peerIdentityPublicKey,
    } = message

    if (message.peerIdentityPublicKey !== identityKeys.publicKey) {
      return
    }

    debug(`new connection from ${peerIdentityPublicKey}`)

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
      wrtc,
    })

    const createSocket = wrapInSocketAPI({
      connectionPath,
      sessionID,
    })
    const socket = createSocket(null, message.protocol)

    await eventTrigger(socket, 'open')

    socketServer.emit('connection', socket)
  }

  datPeerNetwork.onHandshakeReq = (params) => {
    handleHandshakeReq(params).catch((e) => {
      debug('error', e)
    })
  }

  datPeerNetwork.onError = (error) => {
    socketServer.emit('error', error)
    throw new Error(error)
  }

  return socketServer
}

export default GraphqlThing
