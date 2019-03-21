## GraphQL Things

Let's face it, the Internet of Things has some problems:

1. It's [horribly](https://www.iotforall.com/5-worst-iot-hacking-vulnerabilities/), [horribly](https://www.zdnet.com/article/iot-security-warning-your-hacked-devices-are-being-used-for-cyber-crime-says-fbi/). [horribly](https://www.nytimes.com/2017/12/21/technology/connected-toys-hacking.html) [insecure](https://blog.radware.com/security/2018/05/7-craziest-iot-device-hacks/). This isn't just in old IOT devices either, it's an ongoing problem - studies show that as of 2018 50% of IOT developers do not protect their customers with any encryption at all[<sup>1</sup>](http://eecatalog.com/embedded-security/2018/03/19/the-internet-of-insecure-things/).
2. [Consumers are demanding more data privacy from the IoT](https://internetofbusiness.com/consumers-demand-more-data-privacy-from-the-iot-economist-report/) but IOT devices continue to extradite vast quantities of potentially sensitive information about their users to corporately controlled clouds where users have little control.
3. IOT devices depend on the internet but not all internet connections are reliable. Some areas may have no internet at all. What if the IOT was designed with a mentality of "no internet first" and able to maintain full functionality even when there was no internet connection available? A class of IOT devices could be developed so robustly decentralized that they could be used anywhere on the planet. In fact these devices would guarentee availability to such an extent that they could even be used at humanity's most remote frontiers such as the International Space Station.

An IOT device that did not suffer from these problems would clearly be an improvement.

GraphQL Things proposes a solution to these problems.

GraphQL Things is a [peer-to-peer](https://en.wikipedia.org/wiki/Peer-to-peer) protocol that connects Internet of Things devices directly to their users. Each GraphQL Thing presents an [end-to-end encrypted](https://en.wikipedia.org/wiki/End-to-end_encryption) GraphQL API that can be accessed over the internet via [NAT Traversal](https://en.wikipedia.org/wiki/NAT_traversal) or offline using [mDNS](https://en.wikipedia.org/wiki/Multicast_DNS) for service discovery.

GraphQL Things do away with the need for centralized cloud server middle men because GraphQL Things IOT devices are their own GraphQL servers:

<p align="center">
  <img
    alt="alt GraphQL Thing connections connect directly instead of through a centralized server"
    src="./docs/dist/connection-comparison.svg"
    width="500"
  />
</p>

## Features
* **Decentralized** - GraphQL Things require no centralized servers, no DNS and no Certificate Authorities. Users connect directly to their GraphQL Things with or without the internet.
* **End-to-end Encrypted** - GraphQL Things use [Triple Diffie Helman](https://signal.org/docs/specifications/x3dh/) and 256-bit [Eliptical Curve Cryptography](https://www.globalsign.com/en/blog/elliptic-curve-cryptography/) to establish authenticated end-to-end encrypted connections.
* **Secure Onboarding** - "Invite" QR Codes containing cryptographic key data allow users to to establish an initial connection with known, trusted keys even when their internet is down.
* **Data Ownership** - Since data is only ever accessed directly from the GraphQL Thing IOT device using public keys the user has authorized, users stay in full control of their data.
* **NAT-traversing** - GraphQL Things use [WebRTC and ICE](https://www.youtube.com/watch?v=7qAQuC9muf8) to establish connections directly from the device to any authorized client.
* **Beaker Browser Ready** - GraphQL Things are built on the [Dat P2P protocol](https://datproject.org/) so any GraphQL Thing can be queried directly from the Dat-based [Beaker Browser](https://beakerbrowser.com/).
* **Offline Discoverable** - On local networks users can seemlessly continue to use their GraphQL Things and connect to new GraphQL Things using Dat's built-in mDNS discovery.

## Security Disclaimer

GraphQL Things' cryptography has not been security audited and should not be used in production until it has. Use at your own risk.

## Useage

### Apollo Client

```js
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'

import { ThingLink } from 'graphql-things'

const client = new ApolloClient({
  link: ThingLink({
    identityKeys: YOUR_USER_IDENTITY_KEYS,
    peerIdentityPublicKey: YOUR_IOT_THING_PUBLIC_KEY,
    options: { reconnect: true },
  }),
  cache: new InMemoryCache(),
})
```

See also [Apollo Client: Connecting your client to React](https://www.apollographql.com/docs/react/essentials/get-started.html#creating-provider)

### Apollo Server

```js
import Dat from '@beaker/dat-node'
import wrtc from 'wrtc'

import { execute, subscribe } from 'graphql'
import { SubscriptionServer } from 'subscriptions-transport-ws'

import { GraphQLThing, getInviteCode } from 'graphql-things'

import * as qrcode from 'qrcode-terminal'

import schema from './schema'
import keys from '../keys/keys.json'

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
const authenticate = ({ peerIdentityPublicKey }) => {
  console.log(`\n\nNew connection from ${peerIdentityPublicKey}`)
  /*
   * IMPORTANT: REPLACE THIS CODE!
   *
   * Replace this return with your authentication logic to prevent unauthorized
   * access.
   */
  return true
}

const graphqlThing = GraphQLThing({
  datPeers,
  identityKeys,
  authenticate,
  wrtc,
})

const options = {
  execute,
  subscribe,
  schema,
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

SubscriptionServer.create(options, graphqlThing)

qrcode.generate(inviteCode, { small: true }, (qr) => {
  console.log(
    `Listening for Connections\n\nPublic Key: ${identityKeys.publicKey}\n\n`
    + 'Invite Code QR Code:\n\n'
    + qr
    + '\n\n'
    + 'Invite Code String:\n\n'
    + inviteCode,
  )
})
```
