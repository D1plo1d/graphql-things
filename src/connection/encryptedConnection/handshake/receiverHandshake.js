import { createECDHKey, createSessionKey } from '../../../p2pCrypto/keys'
import { encrypt } from '../../../p2pCrypto/encryption'

import handshakeResMessage from '../../../messages/handshakeResMessage'
import { validateHandshakeReq } from '../../../messages/handshakeReqMessage'

const receiverHandshake = async ({
  currentConnection,
  protocol,
  sessionID,
  identityKeys,
  peerIdentityPublicKey,
  request,
  meta,
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

  return {
    sessionKey,
  }
}

export default receiverHandshake
