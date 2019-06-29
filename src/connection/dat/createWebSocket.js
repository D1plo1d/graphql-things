const safeGlobal = (
  (typeof global !== 'undefined' && global)
  || (typeof window !== 'undefined' && window)
  || {}
)

const nativeWebSocket = safeGlobal.WebSocket || safeGlobal.MozWebSocket

const createWebSocket = ({
  identityKeys,
  webSocketImpl = nativeWebSocket,
  websocketURL = 'wss://signal.tegapp.io/',
}) => () => {
  if (!webSocketImpl) {
    throw new Error(
      'Unable to find native implementation, or alternative implementation for WebSocket!',
    )
  }

  // eslint-disable-next-line new-cap
  return new webSocketImpl(`${websocketURL}?id=${identityKeys.publicKey}`)
}

export default createWebSocket
