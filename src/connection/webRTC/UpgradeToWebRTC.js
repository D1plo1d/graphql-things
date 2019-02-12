import Debug from 'debug'

import Peer from 'simple-peer'
import Connection from '../Connection'

import eventTrigger from '../../eventTrigger'
import { chunkifier, dechunkifier } from './chunk'
import webRTCUpgradeMessage from '../../messages/webRTCUpgradeMessage'

const debug = Debug('graphql-things:webrtc')

const setPeerSDP = ({ rtcPeer, peerSDP }) => {
  if (typeof peerSDP !== 'object') {
    throw new Error('invalid SDP')
  }
  rtcPeer.signal(peerSDP)
}

const sdpArrivalTrigger = async (currentConnection) => {
  debug('awaiting SDP')
  const message = await eventTrigger(currentConnection, 'data', {
    filter: data => (
      data.connection === 'upgrade'
      && data.sdp != null
    ),
  })
  return message.sdp
}

/*
 * upgrades the current connection to a webRTC connection
 */
const UpgradeToWebRTC = ({
  wrtc,
  initiator,
} = {}) => async ({
  currentConnection,
  protocol,
}) => {
  const rtcPeer = new Peer({
    initiator,
    wrtc,
  })

  rtcPeer.on('iceStateChange', (state) => {
    if (state === 'disconnected') {
      debug('iceState changed to disconnected')
      rtcPeer.destroy()
    }
  })

  if (!initiator) {
    const peerSDP = await sdpArrivalTrigger(currentConnection)
    setPeerSDP({ rtcPeer, peerSDP })
  }

  /*
   * Await our SDP (WebRTC contact info) and when it's ready send it to the
   * remote peer.
   */
  const sdp = await eventTrigger(rtcPeer, 'signal')

  debug('sending upgrade message')
  await currentConnection.send(webRTCUpgradeMessage({ protocol, sdp }))

  if (initiator) {
    /*
     * if we initiated the webRTC upgrade wait until a SDP is sent back
     */
    const peerSDP = await sdpArrivalTrigger(currentConnection)
    setPeerSDP({ rtcPeer, peerSDP })
  }

  debug('connecting...')
  await eventTrigger(rtcPeer, 'connect')
  debug('connected')

  /*
   * Wrap the webRTC peer in a Connection object
   */

  // eslint-disable-next-line no-underscore-dangle
  const sendInChunks = chunkifier(rtcPeer._channel, (data) => {
    // console.log('tx', data)
    rtcPeer.send(data)
  })

  const nextConnection = Connection({
    send: async (data) => {
      sendInChunks(data)
    },
    close: () => rtcPeer.destroy(),
  })

  rtcPeer.on('data', dechunkifier((data) => {
    // console.log('rx', data)
    nextConnection.emit('data', data)
  }))

  rtcPeer.on('error', () => {
    nextConnection.emit('error')
  })

  rtcPeer.on('close', () => {
    debug('disconnected')
    nextConnection.emit('close')
  })

  return nextConnection
}

export default UpgradeToWebRTC
