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

  const datPeersPromise = (
    datPeersParam.then == null ? Promise.resolve(datPeersParam) : datPeersParam
  )

  const network = {
    onHandshakeReq,
    onError,
    responseListeners: {
    },
    keyFor: ({ peerID, sessionID }) => (
      JSON.stringify({ peerID, sessionID })
    ),
    listenFor: (params, cb) => {
      network.responseListeners[network.keyFor(params)] = cb
    },
    removeListener: (params) => {
      delete network.responseListeners[network.keyFor(params)]
    },
    onMessage: ({ datPeer, message }) => {
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
        peerID: datPeer.id,
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
  }

  datPeersPromise
    .then((peers) => {
      datPeers = peers
      const t = async () => {
        console.log(await peers.list())
      }
      t()

      const addListener = datPeers.addListener ? 'addListener' : 'addEventListener'
      datPeers[addListener]('message', network.onMessage)
    })
    .catch(onError)

  return network
}

export default createDatPeerNetwork
