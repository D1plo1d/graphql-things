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
  console.log(
    datPeerID,
  )

  const datPeer = datPeerParam || { send: data => datPeers.broadcast(data) }

  /*
   * creating a network for the data connection which will be closed with it if
   * a network isn't passed in with the params
   */
  const network = externalDatNetwork || createDatPeerNetwork({ datPeers })
  await network.connect()

  const key = { datPeerID, sessionID }

  console.log('STARTING DAT CONNECTION')
  // events: data, error
  const nextConnection = Connection({
    // TODO:  when https://github.com/beakerbrowser/beaker-core/pull/6 is
    // released switch this away from broadcast to use a peer-specific channel.
    // send: data => datPeers.broadcast(data),
    send: data => console.log('send', data) || datPeer.send(data),
    close: () => {
      network.removeListener(key)

      if (externalDatNetwork == null) {
        network.close()
      }

      nextConnection.emit('close')
    },
  })

  network.listenFor(key, ({ message }) => {
    console.log('RECEIVED', message)
    nextConnection.emit('data', message)
  })

  console.log('dat connection')
  return nextConnection
}

export default DatConnection
