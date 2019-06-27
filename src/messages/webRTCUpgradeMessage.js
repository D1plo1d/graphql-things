import { SIGNAL } from '../constants'

const webRTCUpgradeMessage = ({
  sdp,
}) => ({
  type: SIGNAL,
  sdp,
})

export const isValidSignal = data => (
  data.type === SIGNAL
  && typeof data.sdp === 'object'
)

export default webRTCUpgradeMessage
