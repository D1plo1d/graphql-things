const createWebSocket = ({
  identityKeys,
  ws = typeof window === 'object' ? window.WebSocket : null,
  websocketURL = 'wss://signal.tegapp.io/',
}) => () => (
  // eslint-disable-next-line new-cap
  new ws(`${websocketURL}?id=${identityKeys.publicKey}`)
)

export default createWebSocket
