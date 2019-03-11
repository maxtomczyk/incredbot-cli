import { Command, flags } from '@oclif/command'
import chalk from 'chalk'
import * as keytar from 'keytar'
import * as fs from 'fs'
import * as path from 'path'

export default class EnvRemove extends Command {
  static description = 'Removes selected environment data from system.'

  static args = [{ name: 'name' }]

  async run() {
    const { args, flags } = this.parse(EnvRemove)
    this.log()
    if (!fs.existsSync('./node_modules/powerbot-cms')) return this.log(chalk.red('\nNot in Powerbot CMS project.\n'))
    if (!args.name) this.log(chalk.red('You need to provide name of environment you want to remove.'))
    const projectPath = process.cwd().split('/')
    const projectName = projectPath[projectPath.length - 1]
    const envName = args.name
    const serviceName = `${projectName}-${envName}`
    const homedir: any = (process.platform === 'win32') ? process.env.HOMEPATH : process.env.HOME

    try {
      if (!fs.existsSync(path.join(homedir, '.powerbot-cli', 'environments', `${serviceName}.json`))) {
        this.log(chalk.red(`No '${envName}' environment configured for project '${projectName}'\n`))
        return process.exit(0)
      }
      const storedForProject = await keytar.findCredentials(`${serviceName}-db`)
      for (let row of storedForProject) {
        await keytar.deletePassword(`${serviceName}-db`, row.account)
      }
      this.log(chalk.cyan('Removed from system keystore.'))
      fs.unlinkSync(path.join(homedir, '.powerbot-cli', 'environments', `${serviceName}.json`))
      this.log(chalk.cyan('Removed environment file.'))
      this.log(chalk.green('\nDone. All environment data has been removed.\n'))
      process.exit(0)
    } catch (e) {
      throw e
    }

  }
}
