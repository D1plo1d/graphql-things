import EventEmitter from 'eventemitter3'

/*
 * Events: 'data', 'error', 'close'
 */
const Connection = ({
  sessionID,
  authContext,
  send,
  close,
}) => {
  const connection = new EventEmitter()

  Object.assign(connection, {
    sessionID,
    authContext,
    send,
    close,
  })

  return connection
}

export default Connection
