import React, { useState } from 'react'
import { render } from 'react-dom'

import gql from 'graphql-tag'
import { ApolloProvider, Query } from 'react-apollo'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'

import QRReader from 'react-qr-reader'

import { ThingLink, parseInviteCode } from 'graphql-things/client'

console.log(ThingLink)
const createClient = (inviteCode) => {
  let invite

  try {
    invite = parseInviteCode(inviteCode)
  } catch {
    return null
  }

  const {
    identityKeys,
    peerIdentityPublicKey,
  } = invite

  return new ApolloClient({
    link: new ThingLink({
      identityKeys,
      peerIdentityPublicKey,
      options: { reconnect: false },
      onError: (error) => {
        // eslint-disable-next-line no-console
        console.log(error)
      },
    }),
    cache: new InMemoryCache(),
  })
}

const GET_BOOKS = gql`
  query {
    books {
      title
      author
    }
  }
`

const App = () => {
  const [client, setClient] = useState(null)
  if (client == null) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <div
          style={{ marginBottom: 20, width: '30%' }}
        >
          <h2>GraphQL Thing Login</h2>
          <input
            type="text"
            onChange={e => setClient(createClient(e.target.value))}
            placeholder="Enter your Invite Code"
            style={{ width: '100%' }}
          />
        </div>
        <QRReader
          onScan={(inviteMsg) => {
            if (inviteMsg != null) {
              setClient(createClient(inviteMsg))
            }
          }}
          onError={(error) => {
            // eslint-disable-next-line no-console
            console.log('error', error)
          }}
          style={{
            flex: 1,
            width: '30%',
          }}
        />
      </div>
    )
  }

  return (
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
                <div key={`${book.title} - ${book.author}`}>
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
}

render(<App />, document.getElementById('root'))
