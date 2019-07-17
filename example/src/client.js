import React, { useState } from 'react'
import { render } from 'react-dom'

import gql from 'graphql-tag'
import { ApolloProvider, Query, Mutation } from 'react-apollo'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'

import QRReader from 'react-qr-reader'

import { ThingLink, parseInviteCode, connect } from 'graphql-things/client'

const createClient = (inviteCode) => {
  let invite

  try {
    invite = parseInviteCode(inviteCode)
  } catch (e) {
    return null
  }

  const link = new ThingLink({
    createConnection: () => connect({
      ...invite,
      timeout: 30000,
      // eslint-disable-next-line no-console
      onMeta: meta => console.log('Received meta data from peer', meta),
    }),
  })

  return new ApolloClient({
    link,
    resolvers: link.resolvers,
    cache: new InMemoryCache(),
  })
}

const GET_CONNECTION_STATE = gql`
  query {
    isConnected @client
    isTimedOut @client
    isAttemptingReconnect @client
    secondsTillNextReconnect @client
  }
`

const TRY_RECONNECT_NOW = gql`
  mutation tryReconnectNow {
    tryReconnect @client
  }
`

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
          onError={() => {}}
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
      <Query
        query={GET_CONNECTION_STATE}
        pollInterval={500}
      >
        {(connection) => {
          if (connection.error) {
            return <div>{JSON.stringify(connection.error)}</div>
          }

          if (connection.data != null && connection.data.isTimedOut) {
            const {
              isAttemptingReconnect,
              secondsTillNextReconnect,
            } = connection.data

            if (isAttemptingReconnect) {
              return (
                <div>
                  Connection Timed Out. Attempting to Reconnect...
                </div>
              )
            }

            return (
              <Mutation mutation={TRY_RECONNECT_NOW}>
                {tryReconnectNow => (
                  <div>
                    Connection Timed Out.
                    {` Reconnecting in ${secondsTillNextReconnect} seconds... `}
                    <button type="button" onClick={tryReconnectNow}>
                      Retry Now
                    </button>
                  </div>
                )}
              </Mutation>
            )
          }

          return (
            <Query query={GET_BOOKS}>
              {({ loading, error, data }) => {
                if (loading) {
                  return <div>Connecting to GraphQL Thing...</div>
                }
                if (error) {
                  return <div>{JSON.stringify(error)}</div>
                }

                return (
                  <div>
                    <h2>GraphQL Things Example</h2>
                    { data.books.map(book => (
                      <div key={`${book.title} - ${book.author}`}>
                        {`${book.title} - ${book.author}`}
                      </div>
                    ))}
                  </div>
                )
              }}
            </Query>
          )
        }}
      </Query>
    </ApolloProvider>
  )
}

render(<App />, document.getElementById('root'))
