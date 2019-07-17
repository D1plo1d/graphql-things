import { SOCKET_STATES } from './apolloClient/client'

const secondsTillNextReconnect = (thingClient) => {
  if (thingClient.nextReconnectAttempt == null) {
    return null
  }
  const msTillNextReconnect = thingClient.nextReconnectAttempt - Date.now()
  return Math.max(0, Math.round(msTillNextReconnect / 1000))
}

const clientResolvers = thingClient => ({
  Mutation: {
    tryReconnect: () => {
      thingClient.tryReconnectNow()
    },
  },
  Query: {
    isConnected: () => thingClient.status === SOCKET_STATES.OPEN,
    isTimedOut: () => thingClient.isTimedOut,
    isAttemptingReconnect: () => (
      thingClient.nextReconnectAttempt != null
      && secondsTillNextReconnect(thingClient) === 0
    ),
    secondsTillNextReconnect: () => secondsTillNextReconnect(thingClient),
  },
})

export default clientResolvers
