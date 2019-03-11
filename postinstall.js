const fs = require('fs')
const path = require('path')

const homedir = (process.platform === 'win32') ? process.env.HOMEPATH : process.env.HOME

if (!fs.existsSync(path.join(homedir, '.powerbot-cli'))) fs.mkdirSync(path.join(homedir, '.powerbot-cli'))
if (!fs.existsSync(path.join(homedir, '.powerbot-cli', 'environments'))) fs.mkdirSync(path.join(homedir, '.powerbot-cli', 'environments'))
