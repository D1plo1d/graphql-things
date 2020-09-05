import msgpack from 'msgpack-lite'
import * as dc from '@saltyrtc/chunked-dc/dist/chunked-dc.es2015'

/*
 * 1 byte for S|H|C, 16 bytes for the message's ID, 1 byte for ':'
 * Note: the message ID is repeated in each chunk for that message
 */
const ID_BYTES = 16
const MAX_ID = (2 ** ID_BYTES) - 1

const setImmediate = fn => setTimeout(fn, 0)

/*
 * for asynchronusly encoding messages into an array of chunks
 */
export const chunkifier = (opts, callback) => {
  const { channel, maximumMessageSize } = opts

  let nextID = 0
  const chunks = []
  // const bufferedAmountLowThreshold = channel.bufferedAmountLowThreshold || 0

  let timeout = null

  const sendNextChunks = () => {
    // console.log({ bufferedAmountLowThreshold, bufferedAmount: channel.bufferedAmount, chunks })

    while (chunks.length > 0 && !chunks[0].hasNext) {
      chunks.shift()
    }

    if (
      chunks.length > 0
      && chunks[0].hasNext
      // && bufferedAmountLowThreshold >= channel.bufferedAmount
    ) {
      const chunk = chunks[0].next().value
      callback(chunk)
      timeout = setTimeout(sendNextChunks, 0)
    }
  }

  // // eslint-disable-next-line no-param-reassign
  // channel.onbufferedamountlow = sendNextChunks

  return message => setImmediate(() => {
    const buf = msgpack.encode(message)
    // const previouslyEmptyChunks = chunks.length === 0

    chunks.push(new dc.UnreliableUnorderedChunker(nextID, buf, maximumMessageSize))

    nextID += 1
    if (nextID > MAX_ID) nextID = 0

    // if (
    //   previouslyEmptyChunks
    //   // && (channel.bufferedAmount <= bufferedAmountLowThreshold)
    // ) {
    if (timeout != null) clearTimeout(timeout)
    sendNextChunks()
    // }
  })
}

/*
 * for decoding messages from a series of chunks
 */
export const dechunkifier = (callback) => {
  const unchunker = new dc.UnreliableUnorderedUnchunker()

  unchunker.onMessage = (payload) => {
    const message = msgpack.decode(payload)
    callback(message)
  }

  return (data) => {
    unchunker.add(data)
  }
}
