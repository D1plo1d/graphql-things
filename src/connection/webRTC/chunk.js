import msgpack from 'msgpack-lite'
import Debug from 'debug'

const debug = Debug('graphql-things:chunk')

// SaltyRTC Chunking Protocol
// See https://github.com/saltyrtc/saltyrtc-meta/blob/master/Chunking.md

const splitSlice = (str, len) => {
  const ret = []
  for (let offset = 0, strLen = str.length; offset < strLen; offset += len) {
    ret.push(str.slice(offset, len + offset))
  }
  return ret
}

/*
 * 1 byte for S|H|C, 16 bytes for the message's ID, 1 byte for ':'
 * Note: the message ID is repeated in each chunk for that message
 *
 * TODO: This math is not correct. I've added 10 to the header bytes to
 * account for msgpack overhead but this is just a guess. It would be
 * better to stop using msgpack for header encoding
 */
const bitfield = {
  RELIABLE_ORDERED: 6,
  UNORDERED_UNRELIABLE: 0,
  END_OF_MESSAGE: 1,
}

const headerBytes = {
  RELIABLE_ORDERED: 1,
  UNORDERED_UNRELIABLE: 9,
}

const MAX_ID = (2 ** 32) - 1

const createChunk = ({
  // id,
  // serial,
  payload,
  endOfMessage = false,
}) => {
  let bf = bitfield.RELIABLE_ORDERED

  if (endOfMessage) {
    // eslint-disable-next-line no-bitwise
    bf |= bitfield.END_OF_MESSAGE
  }

  const buf = Buffer.alloc(payload.length + headerBytes.RELIABLE_ORDERED)

  payload.copy(buf, headerBytes.RELIABLE_ORDERED)
  buf.writeUInt8(bf, 0)
  // buf.writeUInt32(id, 1)
  // buf.writeUInt32(serial, 5)

  return buf
}

const splitMessageIntoChunks = ({
  maxPayloadSize,
  id,
  buf,
}) => {
  const slices = splitSlice(buf, maxPayloadSize)

  return slices.map((chunkPayload, i) => (
    createChunk({
      id,
      serial: i,
      payload: chunkPayload,
      endOfMessage: i === slices.length - 1,
    })
  ))
}

const setImmediate = fn => setTimeout(fn, 0)

/*
 * for asynchronusly encoding messages into an array of chunks
 */
export const chunkifier = (opts, callback) => {
  const { maximumMessageSize } = opts

  const maxPayloadSize = maximumMessageSize - headerBytes.RELIABLE_ORDERED
  // const highWaterMark = 1048576 // 1 MiB

  let nextID = 1
  let chunks = []
  // const bufferedAmountLowThreshold = channel.bufferedAmountLowThreshold || 0

  // Based on https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/datatransfer/js/main.js
  // let timeout

  const sendNextChunks = () => {
    // timeout = null
    // let { bufferedAmount } = channel

    while (
      chunks.length > 0
      // && bufferedAmountLowThreshold >= channel.bufferedAmount
    ) {
      // if (bufferedAmount < highWaterMark) {
      const chunk = chunks.shift()
      callback(chunk)
      // bufferedAmount += chunk.length
      // } else {
      //   timeout = setTimeout(sendNextChunks, 0)
      //   return
      // }
    }
  }

  // // eslint-disable-next-line no-param-reassign
  // channel.onbufferedamountlow = sendNextChunks

  return message => setImmediate(() => {
    // console.log('SEND', message)
    const encodingStartedAt = Date.now()
    const buf = msgpack.encode(message)
    debug(`Message encoded in ${((Date.now() - encodingStartedAt) / 1000).toFixed(1)} seconds`)

    const previouslyEmptyChunks = chunks.length === 0

    chunks = chunks.concat(splitMessageIntoChunks({
      maxPayloadSize,
      id: nextID,
      buf,
    }))

    nextID += 1
    if (nextID > MAX_ID) nextID = 1

    if (
      previouslyEmptyChunks
      // && (channel.bufferedAmount <= bufferedAmountLowThreshold)
    ) {
      // if (timeout != null) clearTimeout(timeout)
      sendNextChunks()
    }
  })
}

/*
 * for decoding messages from a series of chunks
 */
export const dechunkifier = (callback) => {
  const incommingMessages = {}

  return (data) => {
    const bf = data.readUInt8(0)

    // eslint-disable-next-line no-bitwise
    const endOfMessage = bf & bitfield.END_OF_MESSAGE

    let id
    let payload
    // let serial

    // eslint-disable-next-line no-bitwise
    if (bf & bitfield.RELIABLE_ORDERED) {
      id = 0 // IDs zero is not used for RELIABLE_ORDERED messages
      payload = data.slice(headerBytes.RELIABLE_ORDERED)
    // eslint-disable-next-line no-bitwise
    } else if (bf & bitfield.UNORDERED_UNRELIABLE) {
      // id = data.readUInt32(1)
      // payload = data.slice(9)
      // const serial = data.readUInt32(5)
      throw new Error('Unreliable unorder not yet implemented')
    } else {
      throw new Error(`Invalid bitfield value ${bf}`)
    }

    if (incommingMessages[id] == null) {
      incommingMessages[id] = {
        expectedChunksCount: null,
        chunks: [],
      }
    }

    const { chunks } = incommingMessages[id]

    chunks.push(payload)

    if (endOfMessage) {
      const decodingStartedAt = Date.now()
      const message = msgpack.decode(Buffer.concat(chunks))
      debug(`Message decoded in ${((Date.now() - decodingStartedAt) / 1000).toFixed(1)} seconds`)

      delete incommingMessages[id]

      // console.log('RECEIVE', message)
      callback(message)
    }
  }
}
