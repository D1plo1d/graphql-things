import EventEmitter from 'eventemitter3'

/*
 * Events: 'data', 'error', 'close'
 */
const Connection = ({
  sessionID,
  authContext,
  iceServers,
  send,
  close,
}) => {
  const connection = new EventEmitter()

  Object.assign(connection, {
    sessionID,
    authContext,
    iceServers,
    send,
    close,
  })

  return connection
}

export default Connection
