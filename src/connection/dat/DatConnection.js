import Debug from 'debug'

import Connection from '../Connection'
import createDatPeerNetwork from './createDatPeerNetwork'

const debug = Debug('graphql-things:dat')

const DatConnection = ({
  datPeer: datPeerParam,
  // datPeerID,
  datPeers,
  datPeerNetwork: externalDatNetwork,
} = {}) => async ({
  sessionID,
}) => {
  const datPeer = datPeerParam || { send: data => datPeers.broadcast(data) }

  /*
   * creating a network for the data connection which will be closed with it if
   * a network isn't passed in with the params
   */
  const network = externalDatNetwork || createDatPeerNetwork({ datPeers })
  await network.connect()

  // events: data, error
  const nextConnection = Connection({
    // TODO:  when https://github.com/beakerbrowser/beaker-core/pull/6 is
    // released switch this away from broadcast to use a peer-specific channel.
    // send: data => datPeers.broadcast(data),
    send: (data) => {
      debug(`TX: ${JSON.stringify(data)}`)
      return datPeer.send(data)
    },
    close: () => {
      network.removeListener(sessionID)

      if (externalDatNetwork == null) {
        network.close()
      }

      nextConnection.emit('close')
    },
  })

  network.listenFor(sessionID, ({ message }) => {
    debug(`RX: ${JSON.stringify(message)}`)
    nextConnection.emit('data', message)
  })

  return nextConnection
}

export default DatConnection
