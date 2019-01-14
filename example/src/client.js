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

const client = new ApolloClient({
  link: ThingLink({
    identityKeys,
    peerIdentityPublicKey: hostKeys.publicKey,
    options: { reconnect: false },
  }),
  cache: new InMemoryCache(),
})

// console.log('hello stuff')
const App = () => (
  <ApolloProvider client={client}>
    <div>
      <h2>GraphQL Things Example</h2>
    </div>
  </ApolloProvider>
)

render(<App />, document.getElementById('root'))
