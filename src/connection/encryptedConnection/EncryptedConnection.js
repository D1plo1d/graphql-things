import Debug from 'debug'

import { encrypt, decrypt } from '../../p2pCrypto/encryption'

import Connection from '../Connection'

import encryptedDataMessage from '../../messages/encryptedDataMessage'
import initiatorHandshake from './handshake/initiatorHandshake'
import receiverHandshake from './handshake/receiverHandshake'

import { UNAUTHORIZED } from '../../constants'
import UnauthorizedAccess from '../errors/UnauthorizedAccess'
import unauthorizedMessage from '../../messages/unauthorizedMessage'

const debug = Debug('graphql-things:encrypted')
const rxDebug = Debug('graphql-things:encrypted:rx')
const txDebug = Debug('graphql-things:encrypted:tx')

const EncryptedConnection = ({
  initiator,
  identityKeys: identityKeysParam,
  peerIdentityPublicKey: peerIdentityPublicKeyParam,
  // the connection request message if initiator = false
  request,
  authToken,
  authenticate,
  initiatorIceServers,
}) => async ({
  protocol,
  sessionID,
  currentConnection,
}) => {
  /*
   * keys can be passed in as:
   *  - an object
   *  - a promise resolving to the object
   *  - a function returning the object
   *  - a function returning a promise resolving to the object
   */
  const getKeys = (param) => {
    let keys = param
    if (typeof keys === 'function') {
      keys = keys()
    }
    if (keys.then == null) {
      keys = Promise.resolve(keys)
    }
    return keys
  }

  const identityKeys = await getKeys(identityKeysParam)
  const peerIdentityPublicKey = await getKeys(peerIdentityPublicKeyParam)

  const handshake = initiator ? initiatorHandshake : receiverHandshake

  let lastTXMessageID = -1
  const receivedMessageIDs = []

  const {
    sessionKey,
    authContext,
    iceServers: receivedIceServers,
  } = await handshake({
    currentConnection,
    protocol,
    sessionID,
    identityKeys,
    peerIdentityPublicKey,
    request,
    authToken,
    authenticate,
    iceServers: initiatorIceServers,
  })

  const iceServers = initiator ? initiatorIceServers : receivedIceServers

  debug({ iceServers })

  const nextConnection = Connection({
    sessionID,
    authContext,
    iceServers,
    send: async (data) => {
      lastTXMessageID += 1

      const message = {
        id: lastTXMessageID,
        ...data,
      }

      txDebug(message)

      /*
       * due to the asynchronous nature of encryption message IDs may be sent
       * out of order.
       */
      const encryptedData = await encrypt(message, { sessionKey })

      currentConnection.send(encryptedDataMessage({
        peerIdentityPublicKey,
        sessionID,
        encryptedData,
      }))
    },
    close: () => {
      currentConnection.close()
    },
  })

  const onError = (error) => {
    nextConnection.emit('error', error)
  }

  const onData = async ({ encryptedData }) => {
    let data
    try {
      data = decrypt(encryptedData, { sessionKey })
    } catch (e) {
      // invalid encrypted data could be because of a third party. Discard it.
      return
    }
    if (receivedMessageIDs[data.id] !== true) {
      rxDebug(data)

      receivedMessageIDs[data.id] = true

      if (data.type === UNAUTHORIZED) {
        rxDebug('UNAUTHORIZED ACCESS')
        currentConnection.emit('error', new UnauthorizedAccess())
        currentConnection.close()
      } else {
        nextConnection.emit('data', data)
      }
    }
  }

  currentConnection.on('data', (message) => {
    onData(message).catch(onError)
  })

  currentConnection.on('error', onError)

  currentConnection.on('close', () => {
    nextConnection.emit('close')
  })

  nextConnection.on('close', () => {
    // clean up
    setTimeout(() => nextConnection.removeAllListeners(), 0)
  })

  if (!initiator && authContext === false) {
    await nextConnection.send(unauthorizedMessage())
    nextConnection.close()

    throw new UnauthorizedAccess()
  }

  return nextConnection
}

export default EncryptedConnection
