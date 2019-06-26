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

  let lastMessageID = -1

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
      const encryptedData = await encrypt(data, { sessionKey })

      currentConnection.send({
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
    if (data.id > lastMessageID) {
      lastMessageID = data.id
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

  return nextConnection
}

export default EncryptedConnection
