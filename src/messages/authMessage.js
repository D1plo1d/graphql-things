export const AUTH = 'AUTH'

export const validateAuthMessage = (handshakeReq) => {
  const {
    type,
    authToken,
  } = handshakeReq

  if (type !== AUTH) {
    throw new Error('type must be AUTH')
  }
  if (typeof authToken !== 'string') {
    throw new Error('Invalid authToken')
  }
}

/*
 * TODO: send an encrypted value back to prove that we own the
 * correct ephemeral key
 */
const authMessage = ({
  authToken,
}) => ({
  type: AUTH,
  authToken,
})

export default authMessage
