import Debug from 'debug'

import Connection from '../Connection'
import createDatPeerNetwork from './createDatPeerNetwork'

const rxDebug = Debug('graphql-things:dat:rx')
const txDebug = Debug('graphql-things:dat:tx')

const RESEND_EVERY_MS = 1000

const DatConnection = ({
  datPeer: datPeerParam,
  // datPeerID,
  datPeers,
  datPeerNetwork: externalDatNetwork,
} = {}) => async ({
  sessionID,
  timeoutAt,
}) => {
  const datPeer = datPeerParam || { send: data => datPeers.broadcast(data) }

  /*
   * creating a network for the data connection which will be closed with it if
   * a network isn't passed in with the params
   */
  const network = externalDatNetwork || createDatPeerNetwork({ datPeers })
  await network.connect()

  let resendInterval = null
  let currentMessage = null
  let nextConnection = null

  const stopResendingPreviousMessage = () => {
    if (resendInterval != null) clearInterval(resendInterval)
  }

  const close = () => {
    stopResendingPreviousMessage()
    network.removeListener(sessionID)

    if (externalDatNetwork == null) {
      network.close()
    }

    nextConnection.emit('close')
  }

  const sendCurrentMessage = () => {
    if (timeoutAt != null && Date.now() > timeoutAt) {
      nextConnection.emit('error', new Error('Connection timed out'))
      close()
      return
    }
    txDebug(currentMessage)
    datPeer.send(currentMessage)
  }

  // events: data, error
  nextConnection = Connection({
    // TODO:  when https://github.com/beakerbrowser/beaker-core/pull/6 is
    // released switch this away from broadcast to use a peer-specific channel.
    // send: data => datPeers.broadcast(data),
    send: (data) => {
      stopResendingPreviousMessage()
      currentMessage = data

      sendCurrentMessage()
      resendInterval = setInterval(sendCurrentMessage, RESEND_EVERY_MS)

      return Promise.resolve()
    },
    close,
  })

  network.listenFor(sessionID, ({ message }) => {
    rxDebug(message)
    nextConnection.emit('data', message)
  })

  return nextConnection
}

export default DatConnection
