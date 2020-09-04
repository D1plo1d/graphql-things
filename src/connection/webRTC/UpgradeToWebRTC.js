import Debug from 'debug'

import Peer from 'simple-peer'
import Connection from '../Connection'

import eventTrigger from '../../eventTrigger'
import { chunkifier, dechunkifier } from './chunk'
import webRTCUpgradeMessage, { isValidSignal } from '../../messages/webRTCUpgradeMessage'

const debug = Debug('graphql-things:webrtc')
const rxDebug = Debug('graphql-things:webrtc:rx')
const txDebug = Debug('graphql-things:webrtc:tx')

/*
 * upgrades the current connection to a webRTC connection
 */
const UpgradeToWebRTC = ({
  wrtc,
  initiator,
  meta,
  onMeta,
} = {}) => async ({
  currentConnection,
  protocol,
  timeoutAt,
}) => {
  const { iceServers } = currentConnection

  debug({ iceServers })
  const rtcPeer = new Peer({
    initiator,
    wrtc,
    config: { iceServers },
    trickle: false,
  })

  const onIceChange = (state) => {
    if (state === 'disconnected') {
      debug('iceState changed to disconnected')
      rtcPeer.destroy()
    }
  }

  const sendSignalToPeer = (sdp) => {
    currentConnection.send(webRTCUpgradeMessage({
      // protocol,
      sdp,
      meta,
    }))
  }

  let metaReceived = false
  let maximumMessageSize = 65535

  /*
   * Receive the signal from the peer and set the max message size based on the SDP
   */
  const receiveSignalFromPeer = (message) => {
    if (isValidSignal(message)) {
      if (initiator && metaReceived === false) {
        metaReceived = true
        onMeta(message.meta)
      }

      // Parse a=max-message-size
      const match = message.sdp.sdp.match(/a=max-message-size:\s*(\d+)/)
      if (match !== null && match.length >= 2) {
        maximumMessageSize = parseInt(match[1], 10)
      }

      // Set the signal
      rtcPeer.signal(message.sdp)
    }
  }

  debug('exchanging trickled ICE signals...')

  rtcPeer.on('iceStateChange', onIceChange)
  rtcPeer.on('signal', sendSignalToPeer)
  currentConnection.on('data', receiveSignalFromPeer)

  debug('connecting...')

  let timeoutReference
  const timeoutMS = Math.max(timeoutAt - Date.now(), 0)

  /*
   * Wait for the data channel to open via the connect event
   */
  await new Promise((resolve, reject) => {
    timeoutReference = setTimeout(() => {
      rtcPeer.removeListener('iceStateChange', onIceChange)
      rtcPeer.removeListener('signal', sendSignalToPeer)
      currentConnection.removeListener('data', receiveSignalFromPeer)

      reject(new Error('WebRTC connection timed out'))
    }, timeoutMS)

    eventTrigger(rtcPeer, 'connect')
      .then(resolve)
      .catch(reject)
  }).finally(() => {
    clearTimeout(timeoutReference)
    // clean up the old DAT-based connection
    currentConnection.close()
  })

  debug('connected')

  /*
   * Wrap the webRTC peer in a Connection object
   */

  let sendErrored = false

  // eslint-disable-next-line no-underscore-dangle
  const sendInChunks = chunkifier({ channel: rtcPeer._channel, maximumMessageSize }, (data) => {
    if (sendErrored) return

    try {
      rtcPeer.send(data)
    } catch (e) {
      sendErrored = true
      rtcPeer.destroy(e)
    }
  })

  const nextConnection = Connection({
    authContext: currentConnection.authContext,
    send: (data) => {
      txDebug(data)
      sendInChunks(data)
    },
    close: () => rtcPeer.destroy(),
  })

  const onError = (error) => {
    debug('error', error)
    nextConnection.emit('error', error)
  }

  const addListeners = () => {
    rtcPeer.on('data', dechunkifier((data) => {
      rxDebug(data)
      nextConnection.emit('data', data)
    }))

    rtcPeer.on('error', onError)

    rtcPeer.on('close', () => {
      debug('close')
      nextConnection.emit('close')
    })
  }

  setTimeout(addListeners, 0)

  return nextConnection
}

const AbortableUpgradeToWebRTC = args1 => (args2) => {
  const { currentConnection } = args2

  return Promise.race([
    UpgradeToWebRTC(args1)(args2),
    new Promise((_, reject) => {
      currentConnection.on('error', (e) => {
        reject(e)
      })
    }),
  ])
}

export default AbortableUpgradeToWebRTC
