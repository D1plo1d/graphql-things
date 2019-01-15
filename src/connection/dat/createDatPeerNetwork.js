import {
  HANDSHAKE_REQ,
  MESSAGE_PROTOCOL_VERSION,
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
    keyFor: ({ datPeerID, sessionID }) => (
      JSON.stringify({ datPeerID, sessionID })
    ),
    listenFor: (params, cb) => {
      network.responseListeners[network.keyFor(params)] = cb
    },
    removeListener: (params) => {
      delete network.responseListeners[network.keyFor(params)]
    },
    onMessage: ({ peer: datPeer, message }) => {
      console.log(datPeer.id, 'has sent the following message:', message)

      if (
        typeof message !== 'object'
        || message.protocolVersion !== MESSAGE_PROTOCOL_VERSION
      ) {
        return
      }

      if (message.type === HANDSHAKE_REQ) {
        if (network.onHandshakeReq != null) {
          network.onHandshakeReq({ datPeer, message })
        }
        return
      }

      const key = network.keyFor({
        datPeerID: datPeer.id,
        sessionID: message.sessionID,
      })
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
      console.log('connect?')
      datPeers = await datPeersPromise

      console.log('CONNNNN', await datPeers.list())

      console.log(network.onMessage)
      datPeers.addEventListener('message', () => console.log('waTTT'))
      datPeers.addEventListener('message', network.onMessage)
      console.log('CONNNNN DONE')
    }
  }

  return network
}

export default createDatPeerNetwork
