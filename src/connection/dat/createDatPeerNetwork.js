import {
  HANDSHAKE_REQ,
} from '../../constants'

const createDatPeerNetwork = ({
  datPeers: datPeersParam,
  onHandshakeReq,
  onError,
}) => {
  let datPeers
  let connected = false

  const datPeersPromise = (
    datPeersParam.then == null ? Promise.resolve(datPeersParam) : datPeersParam
  )

  const network = {
    onHandshakeReq,
    onError,
    responseListeners: {
    },
    keyFor: sessionID => (
      JSON.stringify(sessionID)
    ),
    listenFor: (sessionID, cb) => {
      network.responseListeners[network.keyFor(sessionID)] = cb
    },
    removeListener: (sessionID) => {
      delete network.responseListeners[network.keyFor(sessionID)]
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
        const rmListener = datPeers.removeListener ? 'removeListener' : 'removeEventListener'
        datPeers[rmListener]('message', network.onMessage)
      }
      network.responseListeners = {}
    },
    connect: async () => {
      if (connected) return
      connected = true
      datPeers = await datPeersPromise

      datPeers.addEventListener('message', network.onMessage)
    },
  }

  return network
}

export default createDatPeerNetwork
