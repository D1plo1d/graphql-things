import React from 'react'
import { render } from 'react-dom'

import { ApolloProvider } from 'react-apollo'

import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'

import { ThingLink } from 'graphql-things'

import keys from '../keys/keys.json'

const {
  hostKeys,
  clientKeys: identityKeys,
} = keys

const link = ThingLink({
  identityKeys,
  peerIdentityPublicKey: hostKeys.publicKey,
  options: { reconnect: true },
})

console.log(link)

const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
})

const App = () => (
  <ApolloProvider client={client}>
    <div>
      <h2>My first Apollo app</h2>
    </div>
  </ApolloProvider>
)

render(<App />, document.getElementById('root'))
