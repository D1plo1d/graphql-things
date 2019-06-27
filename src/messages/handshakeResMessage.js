import { ENCRYPTION_ALGORITHM } from '../p2pCrypto/encryption'

import {
  HANDSHAKE_RES,
  HANDSHAKE_ALGORITHM,
} from '../constants'

export const validateHandshakeRes = (handshakeReq) => {
  const {
    type,
    protocol,
    handshakeAlgorithm,
    encryptionAlgorithm,
    identityPublicKey: idPK,
    ephemeralPublicKey: epPK,
  } = handshakeReq

  if (type !== HANDSHAKE_RES) {
    throw new Error('type must be HANDSHAKE_RES')
  }
  if (typeof protocol !== 'string') {
    throw new Error(`Unsupported protocol: ${protocol}`)
  }
  if (handshakeAlgorithm !== HANDSHAKE_ALGORITHM) {
    throw new Error(`Unsupported handshakeAlgorithm: ${handshakeAlgorithm}`)
  }
  if (encryptionAlgorithm !== ENCRYPTION_ALGORITHM) {
    throw new Error(`Unsupported encryptionAlgorithm: ${encryptionAlgorithm}`)
  }
  if (typeof idPK !== 'string') {
    throw new Error(`Invalid peer identity public key: ${idPK}`)
  }
  if (typeof epPK !== 'string') {
    throw new Error(`Invalid peer ephemeral public key: ${epPK}`)
  }
}

/*
 * TODO: send an encrypted value back to prove that we own the
 * correct ephemeral key
 */
const handshakeResMessage = ({
  identityKeys,
  ephemeralKeys,
  peerIdentityPublicKey,
  protocol,
  sessionID,
}) => ({
  type: HANDSHAKE_RES,
  protocol,
  sessionID,
  peerIdentityPublicKey,
  handshakeAlgorithm: HANDSHAKE_ALGORITHM,
  encryptionAlgorithm: ENCRYPTION_ALGORITHM,
  identityPublicKey: identityKeys.publicKey,
  ephemeralPublicKey: ephemeralKeys.publicKey,
})

export default handshakeResMessage
