import { createECDHKey, createSessionKey } from '../../../p2pCrypto/keys'
import { encrypt, decrypt } from '../../../p2pCrypto/encryption'
import eventTrigger from '../../../eventTrigger'

import handshakeResMessage from '../../../messages/handshakeResMessage'
import { validateHandshakeReq } from '../../../messages/handshakeReqMessage'
import { validateAuthMessage } from '../../../messages/authMessage'

const receiverHandshake = async ({
  currentConnection,
  protocol,
  sessionID,
  identityKeys,
  peerIdentityPublicKey,
  request,
  meta,
  authenticate,
}) => {
  /*
   * parse and validate the handshake request
   */
  validateHandshakeReq(request)

  const ephemeralKeys = await createECDHKey()

  const sessionKey = await createSessionKey({
    isHandshakeInitiator: false,
    identityKeys,
    ephemeralKeys,
    peerIdentityPublicKey,
    peerEphemeralPublicKey: request.ephemeralPublicKey,
  })

  const encryptedData = await encrypt({ meta }, { sessionKey })


  /*
   * send a handshake response
   */
  const response = handshakeResMessage({
    protocol,
    sessionID,
    identityKeys,
    peerIdentityPublicKey,
    ephemeralKeys,
    encryptedData,
  })

  currentConnection.send(response)

  /*
   * wait for a properly encrypted auth token response
   */
  const auth = await eventTrigger(currentConnection, 'data', {
    filter: result => result != null,
    map: async (authRes = {}) => {
      try {
        const data = await decrypt(authRes.encryptedData, { sessionKey })

        return data
      } catch (e) {
        /*
         * invalid messages may be caused by MITM attacks with invalid data so
         * ignore them all.
         */
        // TODO: do not use exceptions for flow control
      }
    },
  })

  validateAuthMessage(auth)
  const { authToken } = auth

  const authContext = await authenticate({
    peerIdentityPublicKey,
    authToken,
  })

  if (authContext === false) {
    throw new Error('Unauthorized')
  }

  return {
    sessionKey,
    authContext,
  }
}

export default receiverHandshake
