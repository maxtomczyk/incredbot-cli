import { Command, flags } from '@oclif/command'
import chalk from 'chalk'
import * as keytar from 'keytar'
import * as readline from 'readline'
import * as fs from 'fs'
import * as path from 'path'
const { promisify } = require('util')

// @ts-ignore
readline.Interface.prototype.question[promisify.custom] = function (prompt: any) {
  return new Promise(resolve =>
    readline.Interface.prototype.question.call(this, prompt, resolve),
  )
}
readline.Interface.prototype.questionAsync = promisify(
  readline.Interface.prototype.question,
)

const rl = readline.createInterface(process.stdin, process.stdout);

rl._writeToOutput = function _writeToOutput(stringToWrite) {
  if (rl.stdoutMuted)
    rl.output.write("\x1B[2K\x1B[200D" + rl.query + "[" + ((rl.line.length % 2 == 1) ? "=-" : "-=") + "]");
  else
    rl.output.write(stringToWrite);
};

export default class EnvCreate extends Command {
  static description = `Manages environments (database connection params) used for sync module.`
  static args = [{ name: 'name' }]

  async run() {
    const { args } = this.parse(EnvCreate)
    if (!fs.existsSync('./node_modules/powerbot-cms')) return this.log(chalk.red('\nNot in Powerbot CMS project.\n'))
    const projectPath = process.cwd().split('/')
    const projectName = projectPath[projectPath.length - 1]
    const envName = args.name

    this.log()
    if (!args.name) {
      this.log(chalk.red('You need to provide name of environment.\n'))
      process.exit(0)
    }
    this.log(chalk.cyan('You need to provide connection credentials to desired database. All sensitive data will be stored in your system keychain.\n'))

    interface DBObject {
      host: string;
      user: string;
      password: string;
      name: string;
    }
    
    let db: DBObject = {
      host: '',
      user: '',
      password: '',
      name: ''
    }

    try {
      db.host = await rl.questionAsync(chalk.cyan('Database host: '))
      db.user = await rl.questionAsync(chalk.cyan('Database user: '))
      db.name = await rl.questionAsync(chalk.cyan('Database name: '))
      rl.query = chalk.cyan('Database password: ')
      rl.stdoutMuted = true
      db.password = await rl.questionAsync(chalk.cyan('Database password: '))
      rl.stdoutMuted = false
      this.log('\n')
      const serviceName = `${projectName}-${envName}`
      const storedForProject = await keytar.findCredentials(`${serviceName}-db`)
      for (let row of storedForProject) {
        await keytar.deletePassword(`${serviceName}-db`, row.account)
      }
      this.log(chalk.cyan(`Saving access data for ${serviceName.replace('-', ' - ')}...`))
      keytar.setPassword(serviceName + '-db', db.user, db.password)
      this.log(chalk.cyan('Saved sensitive data in system keychain.'))
      delete db.user
      delete db.password
      const homedir: any = (process.platform === 'win32') ? process.env.HOMEPATH : process.env.HOME
      if (!fs.existsSync(path.join(homedir, '.powerbot-cli'))) fs.mkdirSync(path.join(homedir, '.powerbot-cli'))
      if (!fs.existsSync(path.join(homedir, '.powerbot-cli', 'environments'))) fs.mkdirSync(path.join(homedir, '.powerbot-cli', 'environments'))
      fs.writeFileSync(path.join(homedir, '.powerbot-cli', 'environments', `${serviceName}.json`), JSON.stringify(db))
      this.log(chalk.cyan('Saved less sensitive data to env file.'))
      this.log(chalk.green('\nDone! Environment is now ready to use.\n'))
      process.exit(0)
    } catch (e) {
      throw e
    }
  }
}
