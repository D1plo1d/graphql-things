import ConnectionTimeout from './ConnectionTimeout'

const connect = ({
  connectionPath,
  protocol,
  sessionID,
  shouldAbortConnection,
  timeout,
}) => {
  const timeoutAt = timeout == null ? null : Date.now() + timeout

  const connectionReducer = (currentConnectionPromise, nextConnectionFn) => (
    currentConnectionPromise.then(async (currentConnection) => {
      const nextConnection = await nextConnectionFn({
        currentConnection,
        protocol,
        sessionID,
        timeoutAt,
      })

      const timedout = timeout != null && Date.now() > timeoutAt

      if (shouldAbortConnection() || timedout) {
        // if the socket has been closed then stop the connection process
        nextConnection.close()
        if (timedout) {
          throw new ConnectionTimeout()
        } else {
          throw new Error('aborting the connection')
        }
      }

      return nextConnection
    })
  )

  return connectionPath.reduce(connectionReducer, Promise.resolve(null))
}

export default connect
