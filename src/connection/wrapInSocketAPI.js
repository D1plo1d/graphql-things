import Debug from 'debug'
import EventEmitter from 'eventemitter3'

import randomBytes from '../p2pCrypto/randomBytes'
import connect from './connect'

const debug = Debug('graphql-things:socket')

export const SOCKET_STATES = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}

/*
 * params:
 *  - sessionID
 *  - connectionPath
 */
const wrapInSocketAPI = (params) => {
  let connection = null
  const socket = new EventEmitter()

  const onError = (error) => {
    const listeners = socket.listenerCount('error')
    const hasOnError = socket.onerror != null
    const hasListener = hasOnError || listeners > 0

    socket.readyState = SOCKET_STATES.CLOSED

    if (hasListener === false) {
      throw new Error(error)
    }

    debug(
      `error (has onerror? ${hasOnError}, listeners = ${listeners})`,
      error,
    )

    if (socket.onerror != null) {
      socket.onerror(new Error(error))
    } else {
      socket.emit('error', new Error(error))
    }
  }

  const closeSocket = () => {
    if (socket.readyState === SOCKET_STATES.CLOSED) {
      // only close the socket once
      return
    }

    debug('close')
    socket.readyState = SOCKET_STATES.CLOSED
    if (socket.onclose != null) {
      socket.onclose()
    }
    socket.emit('close')
  }

  Object.assign(socket, {
    readyState: SOCKET_STATES.CONNECTING,
    send: (data) => {
      if (socket.readyState !== SOCKET_STATES.OPEN) {
        throw new Error('Cannot call send on a closed connection')
      }
      connection.send(data)
    },
    close: () => {
      if (connection != null) {
        connection.close()
      }
      closeSocket()
    },
  })

  const shouldAbortConnection = () => (
    socket.readyState !== SOCKET_STATES.CONNECTING
  )

  const open = () => {
    // set the state and relay an open event through the socket
    socket.readyState = SOCKET_STATES.OPEN

    debug('open')
    if (socket.onopen != null) {
      socket.onopen()
    }

    socket.emit('open')
  }

  const onConnection = (nextConnection) => {
    if (shouldAbortConnection()) {
      nextConnection.close()
      socket.close()
      return
    }

    connection = nextConnection

    open()

    // relay connection events through the socket API
    connection.on('data', (data) => {
      // console.log('RX SOCKET DATA', data)
      if (socket.onmessage != null) {
        socket.onmessage({ data })
      }
      socket.emit('message', data)
    })

    connection.on('close', () => {
      closeSocket()
    })

    connection.on('error', onError)
  }

  /*
   * mimic the websocket API
   */
  const socketImpl = (url, protocol) => {
    socket.protocol = protocol

    const connectionPromise = (async () => {
      const {
        sessionID = (await randomBytes(32)).toString('hex'),
        connectionPath,
      } = params

      socket.sessionID = sessionID

      // Make sure to return the socket before starting the connection
      await new Promise(resolve => setTimeout(resolve, 0))

      const nextConnection = await connect({
        connectionPath,
        sessionID,
        protocol,
        shouldAbortConnection,
      })
      onConnection(nextConnection)
    })()

    connectionPromise.catch(onError)

    return socket
  }

  // socketImpl is a websocket-compatible API
  Object.assign(socketImpl, SOCKET_STATES)

  return socketImpl
}

export default wrapInSocketAPI
