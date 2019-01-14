import fs from 'fs'
import path from 'path'

import { createECDHKey } from '../src'

const createKeys = async () => {
  const clientKeys = await createECDHKey()
  const hostKeys = await createECDHKey()
  const json = JSON.stringify({
    clientKeys,
    hostKeys,
  }, null, 2)

  const dir = path.join(__dirname, '../example/keys/')

  try {
    fs.mkdirSync(dir, '0744')
  // eslint-disable-next-line no-empty
  } catch {
  }
  fs.writeFileSync(path.join(dir, 'keys.json'), json)
}

createKeys()
