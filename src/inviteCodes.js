import msgpack from 'msgpack-lite'
import { createECDHKey, getPublicKey } from './p2pCrypto/keys'

export const getInviteCode = ({
  identityKeys,
  inviteKeys,
}) => {
  const inviteJSON = {
    peerIPK: Buffer.from(identityKeys.publicKey, 'hex'),
    isk: Buffer.from(inviteKeys.privateKey, 'hex'),
  }
  const inviteCode = msgpack.encode(inviteJSON).toString('base64')

  return inviteCode
}

export const createInvite = async ({
  identityKeys,
}) => {
  const inviteKeys = await createECDHKey()

  const code = getInviteCode({
    identityKeys,
    inviteKeys,
  })

  return {
    keys: inviteKeys,
    code,
  }
}

export const parseInviteCode = (inviteCode) => {
  const msg = Buffer.from(atob(inviteCode), 'binary')

  const json = msgpack.decode(msg)

  const identityKeys = {
    publicKey: getPublicKey(json.isk.toString('hex')),
    privateKey: json.isk.toString('hex'),
  }
  const peerIdentityPublicKey = json.peerIPK.toString('hex')

  return {
    identityKeys,
    peerIdentityPublicKey,
  }
}
