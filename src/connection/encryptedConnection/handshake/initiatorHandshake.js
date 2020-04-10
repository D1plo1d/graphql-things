import Debug from 'debug'

import { createECDHKey, createSessionKey } from '../../../p2pCrypto/keys'
import { encrypt, decrypt } from '../../../p2pCrypto/encryption'

import eventTrigger from '../../../eventTrigger'

import handshakeReqMessage from '../../../messages/handshakeReqMessage'
import { validateHandshakeRes } from '../../../messages/handshakeResMessage'
import authMessage from '../../../messages/authMessage'
import encryptedDataMessage from '../../../messages/encryptedDataMessage'

const debug = Debug('graphql-things:initiator:handshake:tx')

const initiatorHandshake = async ({
  currentConnection,
  protocol,
  sessionID,
  identityKeys,
  peerIdentityPublicKey,
  authToken,
  iceServers,
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

        return { sessionKey: key }
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

  const authPayload = authMessage({ authToken, iceServers })
  debug(authPayload)

  const encryptedData = await encrypt(
    authPayload,
    { sessionKey },
  )

  currentConnection.send(
    encryptedDataMessage({
      peerIdentityPublicKey,
      sessionID,
      encryptedData,
    }),
  )

  return {
    sessionKey,
  }
}

export default initiatorHandshake
