const createWebSocket = ({
  identityKeys,
  webSocketImpl = typeof window === 'object' ? window.WebSocket : null,
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
