import Dat from '@beaker/dat-node'
import wrtc from 'wrtc'
import Promise from 'bluebird'

import { execute, subscribe } from 'graphql'
import { SubscriptionServer } from 'subscriptions-transport-ws'

import { GraphQLThing, getInviteCode } from 'graphql-things'

import * as qrcode from 'qrcode-terminal'

import schema from './schema'
import keys from '../keys/keys.json'

global.Promise = Promise

const {
  clientKeys,
  hostKeys: identityKeys,
} = keys

const inviteCode = getInviteCode({
  identityKeys,
  inviteKeys: clientKeys,
})

// instantiate the dat node
const DAT_URL = 'dat://c53b89f627481422ad71a646c547105de1509b4b4552bb18c71e4be200b7ef4c/'
const dat = Dat.createNode({
  path: './.dat-data',
})
const datPeers = dat.getPeers(DAT_URL)

/*
* return true to allow the connection if an authorized user can be found with
* the identity public key.
*/
const authenticate = ({ peerIdentityPublicKey, authToken }) => {
  // eslint-disable-next-line no-console
  console.log(`\n\nNew connection from ${peerIdentityPublicKey} token: ${authToken}`)

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
  wrtc,
  meta: {
    // This can be anything you want.
    schemaName: 'books',
    schemaVersion: '1.0',
  },
  // iceServers: [],
})

const options = {
  execute,
  subscribe,
  schema,
  // the onOperation function is called for every new operation
  // and we use it to inject context to track the session and
  // user
  // onOperation: async (msg, params, socket) => ({
  //   ...params,
  //   context: {
  //     ...socket.authContext,
  //     sessionID: socket.sessionID,
  //     peerIdentityPublicKey: socket.peerIdentityPublicKey,
  //   },
  // }),
}

SubscriptionServer.create(options, thing)

qrcode.generate(inviteCode, { small: true }, (qr) => {
  // eslint-disable-next-line no-console
  console.log(
    // eslint-disable-next-line prefer-template
    `Listening for Connections\n\nPublic Key: ${identityKeys.publicKey}\n\n`
    + 'Invite Code QR Code:\n\n'
    + qr
    + '\n\n'
    + 'Invite Code String:\n\n'
    + inviteCode,
  )
})
