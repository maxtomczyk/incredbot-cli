import { Command, flags } from '@oclif/command'
import chalk from 'chalk'
import * as fs from 'fs'
import * as path from 'path'

export default class EnvList extends Command {
  static description = 'Lists environments for current project dir'

  async run() {
    if (!fs.existsSync('./node_modules/powerbot-cms')) return this.log(chalk.red('\nNot in Powerbot CMS project.\n'))
    this.log()
    const homedir: any = (process.platform === 'win32') ? process.env.HOMEPATH : process.env.HOME
    const projectPath = process.cwd().split('/')
    const projectName = projectPath[projectPath.length - 1]
    const all = fs.readdirSync(path.join(homedir, '.powerbot-cli', 'environments'))
    let projectEnvs = all.filter((env: any) => {
      const exp = new RegExp(projectName, 'gi')
      return exp.test(env)
    }).map((env: any) => {
      return env.replace(`${projectName}-`, '').replace('.json', '')
    })
    if (!projectEnvs.length) {
      this.log(chalk.yellow(`No environments configured for project '${projectName}'\n`))
      return process.exit(0)
    }
    this.log(chalk.cyan(`Following environments are configured for project '${projectName}':`))
    for (const env of projectEnvs) {
      this.log(chalk.cyan(`  * ${env}`))
    }
    this.log()
    process.exit(0)
  }
}
