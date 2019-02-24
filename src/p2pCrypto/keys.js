import Promise from 'any-promise'
import hkdf from 'futoin-hkdf'
import Elliptic from 'elliptic'
import randomBytes from './randomBytes'

const ec = Elliptic.ec('secp256k1')

export const getPublicKey = (privateKeyHex) => {
  const key = ec.keyFromPrivate(Buffer.from(privateKeyHex, 'hex'))
  return Buffer.from(key.getPublic('arr')).toString('hex')
}

export const createECDHKey = async () => {
  const privateKeyBuffer = await randomBytes(32)
  const privateKey = privateKeyBuffer.toString('hex')

  return {
    privateKey,
    publicKey: getPublicKey(privateKey),
  }
}

/*
 * KDF(KM) represents 32 bytes of output from the HKDF algorithm [3] with
 * inputs:
 * HKDF input key material = F || KM, where KM is an input byte sequence
 * containing secret key material, and F is a byte sequence containing 32 0xFF
 * bytes if curve is X25519, and 57 0xFF bytes if curve is X448. F is used for
 * cryptographic domain separation with XEdDSA [2].
 * HKDF salt = A zero-filled byte sequence with length equal to the hash output length.
 * HKDF info = The info parameter from Section 2.1.
 *
 * Source: https://signal.org/docs/specifications/x3dh/
 */
const kdf = (km) => {
  const hashOutputLength = 32
  const f = String.fromCharCode(0xFF).repeat(32)

  const inputKeyMaterial = `${f}${km.toString('binary')}`

  const salt = String.fromCharCode(0x00).repeat(hashOutputLength)

  return hkdf(
    inputKeyMaterial,
    hashOutputLength,
    { salt },
  )
}

const derive = (privateKeyHex, peerPublicKeyHex) => {
  const privateKey = ec.keyFromPrivate(Buffer.from(privateKeyHex, 'hex'))
  const publicKey = ec.keyFromPublic(Buffer.from(peerPublicKeyHex, 'hex'))

  const sharedKey = privateKey.derive(publicKey.getPublic())

  return Buffer.from(sharedKey.toArray())
}

export const createSessionKey = async ({
  isHandshakeInitiator,
  identityKeys,
  ephemeralKeys,
  peerIdentityPublicKey,
  peerEphemeralPublicKey,
}) => {
  if (typeof peerIdentityPublicKey !== 'string') {
    throw new Error('peerIdentityPublicKey must be a string')
  }
  if (typeof peerEphemeralPublicKey !== 'string') {
    throw new Error('peerEphemeralPublicKey must be a string')
  }

  // Triple Diffie Helman
  const dhs = await Promise.all([
    derive(identityKeys.privateKey, peerEphemeralPublicKey),
    derive(ephemeralKeys.privateKey, peerIdentityPublicKey),
    derive(ephemeralKeys.privateKey, peerEphemeralPublicKey),
  ])

  const consitentlyOrderedDHs = (() => {
    if (isHandshakeInitiator) return dhs
    return [dhs[1], dhs[0], dhs[2]]
  })()

  const concatenatedDHs = Buffer.concat(consitentlyOrderedDHs)

  const sessionKey = kdf(concatenatedDHs)

  return sessionKey
}
