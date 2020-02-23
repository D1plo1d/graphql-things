import { UNAUTHORIZED } from '../constants'

const unauthorizedMessage = () => ({
  type: UNAUTHORIZED,
})

export default unauthorizedMessage
