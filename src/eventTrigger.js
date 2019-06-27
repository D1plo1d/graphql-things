import Promise from 'any-promise'

const eventTrigger = (eventEmitter, eventName, {
  map = result => result,
  filter = () => true,
} = {}) => (
  new Promise((resolve, reject) => {
    const useBrowerAPI = eventEmitter.addEventListener != null
    const ADD = useBrowerAPI ? 'addEventListener' : 'on'
    const REMOVE = useBrowerAPI ? 'removeEventListener' : 'removeListener'

    let eventListener

    const errorListener = (event) => {
      // WebSockets use event.error instead of passing the error itself
      const error = event.error || event

      eventEmitter[REMOVE]('error', errorListener)
      eventEmitter[REMOVE](eventName, eventListener)

      reject(error instanceof Error ? error : new Error(error))
    }

    eventListener = async (result) => {
      let mappedResult = map(result)

      if (mappedResult != null && mappedResult.then != null) {
        mappedResult = await mappedResult
      }

      if (filter(mappedResult)) {
        eventEmitter[REMOVE]('error', errorListener)
        eventEmitter[REMOVE](eventName, eventListener)
        resolve(mappedResult)
      }
    }

    eventEmitter[ADD]('error', errorListener)
    eventEmitter[ADD](eventName, eventListener)
  })
)

export default eventTrigger
