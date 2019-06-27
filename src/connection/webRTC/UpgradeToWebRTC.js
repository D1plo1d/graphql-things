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
} = {}) => async ({
  currentConnection,
  protocol,
  timeoutAt,
}) => {
  const rtcPeer = new Peer({
    initiator,
    wrtc,
  })

  const onIceChange = (state) => {
    if (state === 'disconnected') {
      debug('iceState changed to disconnected')
      rtcPeer.destroy()
    }
  }

  const sendSignalToPeer = (sdp) => {
    currentConnection.send(webRTCUpgradeMessage({
      protocol,
      sdp,
    }))
  }

  const receiveSignalFromPeer = (message) => {
    if (isValidSignal(message)) {
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

  await new Promise((resolve, reject) => {
    timeoutReference = setTimeout(() => {
      rtcPeer.removeListener('iceStateChange', onIceChange)
      rtcPeer.removeListener('signal', sendSignalToPeer)
      currentConnection.removeListener('data', receiveSignalFromPeer)

      reject(new Error('connection timed out'))
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

  // eslint-disable-next-line no-underscore-dangle
  const sendInChunks = chunkifier(rtcPeer._channel, (data) => {
    txDebug(data)
    rtcPeer.send(data)
  })

  const nextConnection = Connection({
    send: (data) => {
      sendInChunks(data)
    },
    close: () => rtcPeer.destroy(),
  })

  const onError = (error) => {
    nextConnection.emit('error', error)
  }

  const addListeners = () => {
    rtcPeer.on('data', dechunkifier((data) => {
      rxDebug(data)
      nextConnection.emit('data', data)
    }))

    rtcPeer.on('error', onError)

    rtcPeer.on('close', () => {
      debug('disconnected')
      nextConnection.emit('close')
    })
  }

  setTimeout(addListeners, 0)

  return nextConnection
}

export default UpgradeToWebRTC
