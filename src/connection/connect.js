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

      console.log(shouldAbortConnection(), timedout)
      if (shouldAbortConnection() || timedout) {
        nextConnection.close()
        // if the socket has been closed then stop the connection process
        throw new Error('aborting the connection')
      }

      return nextConnection
    })
  )

  return connectionPath.reduce(connectionReducer, Promise.resolve(null))
}

export default connect
