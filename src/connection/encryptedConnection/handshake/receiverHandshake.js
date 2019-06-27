import { createECDHKey, createSessionKey } from '../../../p2pCrypto/keys'

import handshakeResMessage from '../../../messages/handshakeResMessage'
import { validateHandshakeReq } from '../../../messages/handshakeReqMessage'

const receiverHandshake = async ({
  currentConnection,
  protocol,
  sessionID,
  identityKeys,
  peerIdentityPublicKey,
  request,
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

  /*
   * send a handshake response
   */
  const response = handshakeResMessage({
    protocol,
    sessionID,
    identityKeys,
    peerIdentityPublicKey,
    ephemeralKeys,
  })

  currentConnection.send(response)

  return {
    sessionKey,
  }
}

export default receiverHandshake
