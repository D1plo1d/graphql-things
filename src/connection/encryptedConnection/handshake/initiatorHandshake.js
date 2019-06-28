import { createECDHKey, createSessionKey } from '../../../p2pCrypto/keys'

import eventTrigger from '../../../eventTrigger'


import handshakeReqMessage from '../../../messages/handshakeReqMessage'
import { validateHandshakeRes } from '../../../messages/handshakeResMessage'

const initiatorHandshake = async ({
  currentConnection,
  protocol,
  sessionID,
  identityKeys,
  peerIdentityPublicKey,
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
  const sessionKey = await eventTrigger(currentConnection, 'data', {
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

        return key
      } catch (e) {
        /*
         * invalid messages may be caused by MITM attacks with invalid data so
         * ignore them all.
         */
        // TODO: do not use exceptions for flow control
      }
    },
  })

  return {
    sessionKey,
  }
}

export default initiatorHandshake
