import { Command, flags } from '@oclif/command'
import * as child from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import chalk from 'chalk'
import Init from './init';

export default class Setup extends Command {
  static description = 'Runs setup procedure like database import etc.'
  static flags = {}
  static nullDir = (os.platform() === 'win32') ? 'nul' : '/dev/null'

  async run() {
    const { args, flags } = this.parse(Setup)

    if (!fs.existsSync('./node_modules/powerbot-cms')) return this.log(chalk.red('\nNot in Powerbot CMS project.\n'))
    this.log()
    this.log(chalk.cyan('Running database creation...'))
    try {
      child.execSync(`node create_db.js > ${Init.nullDir}`, {
        stdio: 'inherit',
        cwd: `./node_modules/powerbot-cms/scripts`
      })

      this.log(chalk.cyan('Running database initialize...'))
      child.execSync(`node init_db.js > ${Init.nullDir}`, {
        stdio: 'inherit',
        cwd: `./node_modules/powerbot-cms/scripts`
      })

      this.log(chalk.cyan('Running database migrations...'))
      child.execSync(`knex migrate:latest > ${Init.nullDir}`, {
        stdio: 'inherit',
        cwd: './node_modules/powerbot-cms'
      })

      this.log(chalk.green(`\nDatabase is ready!\n`))
      process.exit(0)
    } catch (e) {
      console.error(e)
      console.log(chalk.red('\nAn error occured during database setup. Details should be logged above.'))
    }
  }
}
