import Connection from '../Connection'
import createDatPeerNetwork from './createDatPeerNetwork'

const DatConnection = ({
  datPeer: datPeerParam,
  datPeerID,
  datPeers,
  datPeerNetwork: externalDatNetwork,
} = {}) => async ({
  sessionID,
}) => {
  /*
   * creating a network for the data connection which will be closed with it if
   * a network isn't passed in with the params
   */
  const network = externalDatNetwork || createDatPeerNetwork({ datPeers })

  const datPeer = datPeerParam || await datPeers.get(datPeerID)

  const key = { peerID: datPeer.id, sessionID }

  // events: data, error
  const nextConnection = Connection({
    send: data => datPeer.send(data),
    close: () => {
      network.removeListener(key)

      if (externalDatNetwork == null) {
        network.close()
      }

      nextConnection.emit('close')
    },
  })

  network.listenFor(key, ({ message }) => {
    nextConnection.emit('data', message)
  })

  return nextConnection
}

export default DatConnection
