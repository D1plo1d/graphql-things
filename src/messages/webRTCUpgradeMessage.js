const webRTCUpgradeMessage = ({
  id,
  sdp,
  protocol,
}) => ({
  id,
  connection: 'upgrade',
  upgrade: `webrtc-chunk-${protocol}`,
  sdp,
})

export default webRTCUpgradeMessage
