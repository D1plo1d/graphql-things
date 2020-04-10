import { SIGNAL } from '../constants'

const webRTCUpgradeMessage = ({
  sdp,
  meta,
}) => ({
  type: SIGNAL,
  sdp,
  meta,
})

export const isValidSignal = data => (
  data.type === SIGNAL
  && typeof data.sdp === 'object'
)

export default webRTCUpgradeMessage
