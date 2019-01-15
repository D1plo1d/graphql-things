import { ENCRYPTION_ALGORITHM } from '../p2pCrypto/encryption'

import {
  HANDSHAKE_REQ,
  MESSAGE_PROTOCOL_VERSION,
  HANDSHAKE_ALGORITHM,
} from '../constants'

export const validateHandshakeReq = (handshakeReq) => {
  const {
    type,
    protocolVersion,
    handshakeAlgorithm,
    encryptionAlgorithm,
    identityPublicKey: idPK,
    ephemeralPublicKey: epPK,
  } = handshakeReq

  if (type !== HANDSHAKE_REQ) {
    throw new Error('type must be HANDSHAKE_REQ')
  }
  if (protocolVersion !== MESSAGE_PROTOCOL_VERSION) {
    throw new Error(`Unsupported protocolVersion: ${protocolVersion}`)
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
  identityKeys,
  ephemeralKeys,
  sessionID,
}) => ({
  type: HANDSHAKE_REQ,
  protocolVersion: MESSAGE_PROTOCOL_VERSION,
  sessionID,
  handshakeAlgorithm: HANDSHAKE_ALGORITHM,
  encryptionAlgorithm: ENCRYPTION_ALGORITHM,
  identityPublicKey: identityKeys.publicKey,
  ephemeralPublicKey: ephemeralKeys.publicKey,
})

export default handshakeReqMessage
