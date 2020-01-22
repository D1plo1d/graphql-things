import { createECDHKey, createSessionKey } from '../../../p2pCrypto/keys'
import { encrypt, decrypt } from '../../../p2pCrypto/encryption'

import eventTrigger from '../../../eventTrigger'

import handshakeReqMessage from '../../../messages/handshakeReqMessage'
import { validateHandshakeRes } from '../../../messages/handshakeResMessage'
import authMessage from '../../../messages/authMessage'
import encryptedDataMessage from '../../../messages/encryptedDataMessage'

const initiatorHandshake = async ({
  currentConnection,
  protocol,
  sessionID,
  identityKeys,
  peerIdentityPublicKey,
  authToken,
}) => {
  const ephemeralKeys = await createECDHKey()

  /*
   * send a handshake request
   */
  const request = handshakeReqMessage({
    peerIdentityPublicKey,
    identityKeys,
    ephemeralKeys,
    protocol,
    sessionID,
  })

  currentConnection.send(request)

  /*
   * wait for a vaild handshake response
   */
  const {
    sessionKey,
    meta,
  } = await eventTrigger(currentConnection, 'data', {
    filter: result => result != null,
    map: async (response) => {
      try {
        validateHandshakeRes(response)

        const key = await createSessionKey({
          isHandshakeInitiator: true,
          identityKeys,
          ephemeralKeys,
          peerIdentityPublicKey,
          peerEphemeralPublicKey: response.ephemeralPublicKey,
        })

        const data = await decrypt(response.encryptedData, { sessionKey: key })

        return { sessionKey: key, meta: data.meta }
      } catch (e) {
        /*
         * invalid messages may be caused by MITM attacks with invalid data so
         * ignore them all.
         */
        // TODO: do not use exceptions for flow control
      }
    },
  })

  /*
   * send the authToken
   */
  const encryptedData = await encrypt(authMessage({ authToken }), { sessionKey })

  currentConnection.send(
    encryptedDataMessage({
      peerIdentityPublicKey,
      sessionID,
      encryptedData,
    }),
  )

  return {
    meta,
    sessionKey,
  }
}

export default initiatorHandshake
