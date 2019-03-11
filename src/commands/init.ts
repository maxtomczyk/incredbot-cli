import Command from '@oclif/command'
import chalk from 'chalk'
import * as child from 'child_process'
import * as os from 'os'
import * as fs from 'fs'

export default class Init extends Command {
  static description = `Creates directory and initializes Powerbot CMS inside.
As version you can use any release available on https://github.com/maxtomczyk/powerbot-cms/releases
`
  static flags = {}
  static args = [{ name: 'name' }, { name: 'version' }]
  static aliases = ['create']
  static npm = (os.platform() === 'win32') ? 'npm.cmd' : 'npm'
  static nullDir = (os.platform() === 'win32') ? 'nul' : '/dev/null'

  async run() {
    const { args, flags } = this.parse(Init)

    this.log()

    if (!args.name) {
      return this.log(chalk.red('You need to specify name for new project. Run `powerbot help init` for details.\n'))
    }
    if (!args.version) {
      return this.log(chalk.red('You need to specify version of Powerbot CMS. Run `powerbot help init` for details.\n'))
    }

    this.log(chalk.cyan(`Creating directory '${args.name}'...`))
    fs.mkdirSync(`./${args.name}`)
    this.log(chalk.cyan('Running npm init...'))
    child.execSync(`cd ${args.name} && npm init --loglevel error -y > ${Init.nullDir}`, {
      stdio: 'inherit'
    })
    this.log(chalk.cyan(`Installing nodemon...`))
    child.execSync(`${Init.npm} install nodemon --save-dev --loglevel error > ${Init.nullDir}`, {
      stdio: 'inherit',
      cwd: `./${args.name}`
    })
    this.log(chalk.cyan(`Installing Powerbot CMS ${args.version} in '${args.name}' directory...`))
    child.execSync(`${Init.npm} install maxtomczyk/powerbot-cms#${args.version} --save --loglevel error > ${Init.nullDir}`, {
      stdio: 'inherit',
      cwd: `./${args.name}`
    })
    this.log(chalk.green(`\nProject initialized successfully. Now you need to configure your database connection in config.js file and then run 'powerbot setup' inside project directory.\n`))
    process.exit(0)
  }
}
