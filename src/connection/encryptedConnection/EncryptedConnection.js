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

  const {
    sessionKey,
  } = await handshake({
    sessionID,
    currentConnection,
    identityKeys,
    peerIdentityPublicKey,
    request,
  })

  const nextConnection = Connection({
    sessionID,
    send: async (data) => {
      const encryptedData = await encrypt(data, { sessionKey })

      currentConnection.send(encryptedData)
    },
    close: () => {
      currentConnection.close()
    },
  })

  currentConnection.on('data', async (encryptedData) => {
    const data = await decrypt(encryptedData, { sessionKey })

    nextConnection.emit('data', data)
  })

  currentConnection.on('error', (error) => {
    nextConnection.emit('error', error)
  })

  currentConnection.on('close', () => {
    nextConnection.emit('close')
  })

  return nextConnection
}

export default EncryptedConnection
