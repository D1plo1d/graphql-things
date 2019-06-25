import { ENCRYPTION_ALGORITHM } from '../p2pCrypto/encryption'

import {
  HANDSHAKE_REQ,
  HANDSHAKE_ALGORITHM,
} from '../constants'

export const validateHandshakeReq = (handshakeReq) => {
  const {
    type,
    protocol,
    handshakeAlgorithm,
    encryptionAlgorithm,
    identityPublicKey: idPK,
    ephemeralPublicKey: epPK,
  } = handshakeReq

  if (type !== HANDSHAKE_REQ) {
    throw new Error('type must be HANDSHAKE_REQ')
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

const handshakeReqMessage = ({
  peerIdentityPublicKey,
  identityKeys,
  ephemeralKeys,
  protocol,
  sessionID,
}) => ({
  id: 0,
  type: HANDSHAKE_REQ,
  protocol,
  sessionID,
  handshakeAlgorithm: HANDSHAKE_ALGORITHM,
  encryptionAlgorithm: ENCRYPTION_ALGORITHM,
  peerIdentityPublicKey,
  identityPublicKey: identityKeys.publicKey,
  ephemeralPublicKey: ephemeralKeys.publicKey,
})

export default handshakeReqMessage
