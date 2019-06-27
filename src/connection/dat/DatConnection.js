import Debug from 'debug'

import Connection from '../Connection'

const rxDebug = Debug('graphql-things:dat:rx')
const txDebug = Debug('graphql-things:dat:tx')

const RESEND_EVERY_MS = 1000

const DatConnection = ({
  datPeer,
  datPeerNetwork,
} = {}) => async ({
  sessionID,
  timeoutAt,
}) => {
  await datPeerNetwork.connect()

  let resendInterval = null
  let currentMessage = null
  let nextConnection = null

  const stopResendingPreviousMessage = () => {
    if (resendInterval != null) clearInterval(resendInterval)
  }

  const close = () => {
    stopResendingPreviousMessage()
    datPeerNetwork.removeListener(sessionID)

    if (datPeerNetwork.persistent === false) {
      datPeerNetwork.close()
    }

    nextConnection.emit('close')
  }

  const error = (e) => {
    nextConnection.emit('error', e)
    close()
  }

  const sendCurrentMessage = () => {
    try {
      if (timeoutAt != null && Date.now() > timeoutAt) {
        error(new Error('Connection timed out'))
        return
      }

      txDebug(currentMessage)
      if (datPeer != null) {
        datPeer.send(currentMessage)
      } else {
        datPeerNetwork.send(currentMessage)
      }
    } catch (e) {
      error(e)
    }
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
    },
    close,
  })

  datPeerNetwork.listenFor(sessionID, ({ message }) => {
    rxDebug(message)
    nextConnection.emit('data', message)
  })

  nextConnection.on('close', () => {
    // clean up
    setTimeout(() => nextConnection.removeAllListeners(), 0)
  })

  return nextConnection
}

export default DatConnection
