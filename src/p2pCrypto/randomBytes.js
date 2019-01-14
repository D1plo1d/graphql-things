import crypto from 'crypto'

const randomBytes = size => new Promise((resolve, reject) => {
  crypto.randomBytes(size, (err, buf) => {
    if (err == null) {
      resolve(buf)
    } else {
      reject(err)
    }
  })
})


export default randomBytes
