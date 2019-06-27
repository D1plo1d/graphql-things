import { encrypt, decrypt } from '../../p2pCrypto/encryption'

import Connection from '../Connection'

import initiatorHandshake from './handshake/initiatorHandshake'
import receiverHandshake from './handshake/receiverHandshake'

const EncryptedConnection = ({
  initiator,
  identityKeys: identityKeysParam,
  peerIdentityPublicKey: peerIdentityPublicKeyParam,
  // the connection request message if initiator = false
  request,
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
  } = await handshake({
    currentConnection,
    protocol,
    sessionID,
    identityKeys,
    peerIdentityPublicKey,
    request,
  })

  const nextConnection = Connection({
    sessionID,
    send: async (data) => {
      lastTXMessageID += 1

      /*
       * due to the asynchronous nature of encryption message IDs may be sent
       * out of order.
       */
      const encryptedData = await encrypt({
        id: lastTXMessageID,
        ...data,
      }, { sessionKey })

      currentConnection.send({
        peerIdentityPublicKey,
        sessionID,
        encryptedData,
      })
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
    } catch {
      // invalid encrypted data could be because of a third party. Discard it.
      return
    }
    if (receivedMessageIDs[data.id] !== true) {
      receivedMessageIDs[data.id] = true
      nextConnection.emit('data', data)
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

  return nextConnection
}

export default EncryptedConnection
