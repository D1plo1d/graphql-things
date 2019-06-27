import Debug from 'debug'

import {
  HANDSHAKE_REQ,
} from '../../constants'

import eventTrigger from '../../eventTrigger'

const debug = Debug('graphql-things:network')


const WEBSOCKET_RECONNECT_MS = 500

const createDatPeerNetwork = ({
  // fallbackSignallingServer = 'ws://signal.tegapp.io/',
  createWebSocket,
  datPeers: datPeersParam,
  onHandshakeReq,
  onError,
  persistent = false,
}) => {
  let datPeers
  let websocket
  let initialized = false
  let wsReconnectTimeout

  const network = {
    onHandshakeReq,
    onError,
    persistent,
    responseListeners: {},
    keyFor: sessionID => (
      JSON.stringify(sessionID)
    ),
    listenFor: (sessionID, cb) => {
      network.responseListeners[network.keyFor(sessionID)] = cb
    },
    removeListener: (sessionID) => {
      delete network.responseListeners[network.keyFor(sessionID)]
    },
    send: (message) => {
      if (datPeers != null) {
        datPeers.broadcast(message)
      }
      if (websocket != null && websocket.readyState === 1) {
        websocket.send(JSON.stringify(message))
      }
    },
    onMessage: ({ peer: datPeer, message }) => {
      if (typeof message !== 'object') {
        return
      }

      if (message.type === HANDSHAKE_REQ) {
        if (network.onHandshakeReq != null) {
          network.onHandshakeReq({ datPeer, message })
        }
        return
      }

      const key = network.keyFor(message.sessionID)
      const listener = network.responseListeners[key]

      if (listener != null) {
        listener({ datPeer, message })
      }
    },
    close: () => {
      if (datPeers != null) {
        const rmListener = (
          datPeers.removeListener ? 'removeListener' : 'removeEventListener'
        )

        datPeers[rmListener]('message', network.onMessage)
      }

      if (websocket != null) {
        network.removeWSListeners()
        websocket.close()
      }

      if (wsReconnectTimeout != null) {
        clearTimeout(wsReconnectTimeout)
      }

      network.responseListeners = {}
    },
    connect: async () => {
      if (initialized) return
      initialized = true

      const initializationList = []

      if (datPeersParam == null || datPeersParam.then == null) {
        datPeers = datPeersParam
      } else {
        initializationList.push(datPeersParam)
      }

      if (createWebSocket != null) {
        const websocketPromise = network.connectWebsocket({
          ignoreErrors: datPeersParam != null,
        })

        /*
         * wait for the websocket connection if it's our only available network
         * option
         */
        if (datPeersParam == null) {
          initializationList.push(websocketPromise)
        }
      }

      // Open dat connection and/or fallback web socket
      await Promise.all(initializationList)

      // Listen for dat messages
      if (datPeers != null) {
        datPeers.addEventListener('message', network.onMessage)
      }
    },

    /*
     * WebSocket
     */
    addWSListeners: () => {
      websocket.addEventListener('message', network.onWSMessage)
      websocket.addEventListener('close', network.onWSClose)
    },
    removeWSListeners: () => {
      websocket.removeEventListener('message', network.onWSMessage)
      websocket.removeEventListener('close', network.onWSClose)
    },
    connectWebsocket: async ({ ignoreErrors = true } = {}) => {
      debug('Connecting to WebSocket...')
      websocket = createWebSocket()

      // Listen for websocket messages
      network.addWSListeners()

      let openPromise = eventTrigger(websocket, 'open')
        .then(() => debug('Connected to WebSocket'))

      if (ignoreErrors) {
        openPromise = openPromise.catch(() => {})
      }

      await openPromise
    },
    onWSMessage: (event) => {
      network.onMessage({ message: JSON.parse(event.data) })
    },
    onWSClose: () => {
      network.removeWSListeners()
      websocket = null
      debug(`WebSocket closed. Reconnecting in ${WEBSOCKET_RECONNECT_MS}ms`)

      wsReconnectTimeout = setTimeout(
        network.connectWebsocket,
        WEBSOCKET_RECONNECT_MS,
      )
    },
  }

  return network
}

export default createDatPeerNetwork
