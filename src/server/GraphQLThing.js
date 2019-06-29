import EventEmitter from 'eventemitter3'
import Debug from 'debug'
import ws from 'ws'

import ConnectionPath from '../connection/ConnectionPath'

import createWebSocket from '../connection/dat/createWebSocket'
import createDatPeerNetwork from '../connection/dat/createDatPeerNetwork'

import wrapInSocketAPI, { SOCKET_STATES } from '../connection/wrapInSocketAPI'

const debug = Debug('graphql-things:connection')

/*
 * creates a new WebsocketServer API-compatible GraphQLThing
 */
const GraphqlThing = ({
  datPeers,
  identityKeys,
  websocketURL,
  // authenticate({ peerIdentityPublicKey }) => boolean
  authenticate,
  timeout = 7000,
  recycleSessionIDsAfter = 20000,
  wrtc,
}) => {
  if (typeof authenticate !== 'function') {
    throw new Error('an authenticate callback is required')
  }
  // const {
  //   connectionPath = ConnectionPath(params),
  // } = params
  const sessionIDs = {}

  const datPeerNetwork = createDatPeerNetwork({
    datPeers,
    persistent: true,
    createWebSocket: createWebSocket({
      identityKeys,
      webSocketImpl: ws,
      websocketURL,
    }),
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

    if (sessionIDs[sessionID]) return

    debug(`new connection from ${peerIdentityPublicKey}`)

    if (authenticate({ peerIdentityPublicKey }) === false) return

    sessionIDs[sessionID] = true
    if (timeout) {
      setTimeout(() => {
        delete sessionIDs[sessionID]
      }, recycleSessionIDsAfter)
    }

    const createSocket = wrapInSocketAPI({
      sessionID,
      timeout,
      identityKeys,
      peerIdentityPublicKey,
      initiator: false,
      request: message,
      datPeer,
      datPeerNetwork,
      wrtc,
    })
    const socket = createSocket(null, message.protocol)

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
