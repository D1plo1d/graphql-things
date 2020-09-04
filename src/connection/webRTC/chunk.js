import msgpack from 'msgpack-lite'

const splitSlice = (str, len) => {
  const ret = []
  for (let offset = 0, strLen = str.length; offset < strLen; offset += len) {
    ret.push(str.slice(offset, len + offset))
  }
  return ret
}

const PREFIXES = {
  SMALL_UNCHUNKED_MESSAGE: 'S',
  HEADER: 'H',
  CHUNKED_MESSAGE: 'C',
}
/*
 * 1 byte for S|H|C, 16 bytes for the message's ID, 1 byte for ':'
 * Note: the message ID is repeated in each chunk for that message
 */
const ID_BYTES = 16
const HEADER_BYTES = ID_BYTES + 2
const MAX_ID = (2 ** ID_BYTES) - 1

const splitMessageIntoChunks = ({
  maxPayloadSize,
  id,
  buf,
}) => {
  if (buf.length < maxPayloadSize) {
    // small messages are not chunked
    return [
      msgpack.encode([PREFIXES.SMALL_UNCHUNKED_MESSAGE, id, buf]),
    ]
  }

  const chunks = splitSlice(buf, maxPayloadSize).map(chunkPayload => (
    msgpack.encode([PREFIXES.CHUNKED_MESSAGE, id, chunkPayload])
  ))

  const header = msgpack.encode([PREFIXES.HEADER, id, chunks.length])

  chunks.unshift(header)

  return chunks
}

const setImmediate = fn => setTimeout(fn, 0)

/*
 * for asynchronusly encoding messages into an array of chunks
 */
export const chunkifier = (opts, callback) => {
  const { channel, maximumMessageSize } = opts

  const maxPayloadSize = maximumMessageSize - HEADER_BYTES

  let nextID = 0
  let chunks = []
  const bufferedAmountLowThreshold = channel.bufferedAmountLowThreshold || 0

  const sendNextChunks = () => {
    if (
      chunks.length > 0
      && bufferedAmountLowThreshold >= channel.bufferedAmount
    ) {
      callback(chunks.shift())
      setTimeout(sendNextChunks, 0)
    }
  }

  // eslint-disable-next-line no-param-reassign
  channel.onbufferedamountlow = sendNextChunks

  return message => setImmediate(() => {
    const buf = msgpack.encode(message)
    const previouslyEmptyChunks = chunks.length === 0

    chunks = chunks.concat(splitMessageIntoChunks({
      maxPayloadSize,
      id: nextID,
      buf,
    }))

    nextID += 1
    if (nextID > MAX_ID) nextID = 0

    if (
      previouslyEmptyChunks
      && (channel.bufferedAmount <= bufferedAmountLowThreshold)
    ) {
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
    const [prefix, id, payload] = msgpack.decode(data)

    switch (prefix) {
      case PREFIXES.SMALL_UNCHUNKED_MESSAGE: {
        const message = msgpack.decode(payload)
        callback(message)
        break
      }
      case PREFIXES.HEADER: {
        incommingMessages[id] = {
          expectedChunksCount: payload,
          chunks: [],
        }
        break
      }
      case PREFIXES.CHUNKED_MESSAGE: {
        const { expectedChunksCount, chunks } = incommingMessages[id]

        chunks.push(payload)

        if (chunks.length >= expectedChunksCount) {
          const message = msgpack.decode(Buffer.concat(chunks))
          callback(message)
        }
        break
      }
      default: {
        throw new Error(`Invalid prefix: ${prefix}`)
      }
    }
  }
}
