import Dat from '@beaker/dat-node'

import { execute, subscribe } from 'graphql'
import { SubscriptionServer } from 'subscriptions-transport-ws'

import { GraphQLThing } from 'graphql-things'

import keys from '../keys/keys.json'

const {
  clientKeys,
  hostKeys: identityKeys,
} = keys

// instantiate the dat node
// const DAT_URL = 'dat://graphql-things-example.tegh.io'
// const DAT_URL = 'dat://db7d4d96c9d9e54c1be6f93dd40ae1acf0796232a10b846e21d9606489eccc0a/'
const DAT_URL = 'dat://c53b89f627481422ad71a646c547105de1509b4b4552bb18c71e4be200b7ef4c/'
const dat = Dat.createNode({
  path: './.dat-data',
})
const datPeers = dat.getPeers(DAT_URL)

// datPeers.then(d => console.log('broadcast')
//  || d.broadcast('hello!'))
// datPeers.then(d => d.addEventListener('message', d =>  console.log(d)))

/*
* return true to allow the connection if an authorized user can be found with
* the identity public key.
*/
const authenticate = ({ peerIdentityPublicKey }) => {
  // eslint-disable-next-line no-console
  console.log(`New connection from ${peerIdentityPublicKey}`)

  /*
   * IMPORTANT: REPLACE THIS CODE!
   *
   * Replace this return with your authentication logic to prevent unauthorized
   * access.
   */
  return peerIdentityPublicKey === clientKeys.publicKey
}

const thing = GraphQLThing({
  datPeers,
  identityKeys,
  authenticate,
})

const options = {
  execute,
  subscribe,
  // the onOperation function is called for every new operation
  // and we use it to inject context to track the session and
  // user
  onOperation: async (msg, params, socket) => ({
    ...params,
    context: {
      sessionID: socket.sessionID,
      peerIdentityPublicKey: socket.peerIdentityPublicKey,
    },
  }),
}

SubscriptionServer.create(options, thing)

console.log(
  `Listening for Connections\n\nPublic Key: ${identityKeys.publicKey}`
)
