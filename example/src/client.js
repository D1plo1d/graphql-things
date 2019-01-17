import React from 'react'
import { render } from 'react-dom'

import gql from 'graphql-tag'
import { ApolloProvider, Query } from 'react-apollo'
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

const GET_BOOKS = gql`
  query {
    books {
      title
      author
    }
  }
`

const App = () => (
  <ApolloProvider client={client}>
    <Query query={GET_BOOKS}>
      {({ loading, error, data }) => {
        if (loading) {
          return <div>Connecting to GraphQL Thing...</div>
        }
        if (error) {
          return <div>{error}</div>
        }

        return (
          <div>
            <h2>GraphQL Things Example</h2>
            {data.books.map(book => (
              <div>
                {`${book.title} - ${book.author}`}
              </div>
            ))

            }
          </div>
        )
      }}
    </Query>
  </ApolloProvider>
)

render(<App />, document.getElementById('root'))
