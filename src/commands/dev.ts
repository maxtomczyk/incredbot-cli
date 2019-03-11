import { Command, flags } from '@oclif/command'
import chalk from 'chalk'
import * as child from 'child_process'
import * as fs from 'fs'

export default class Dev extends Command {
  static description = 'Starts commands set for project development.\nAs module accepts `cms` or `chatbot`'
  static flags = {}
  static args = [{ name: 'module' }]

  async run() {
    const { args, flags } = this.parse(Dev)
    this.log()
    if (!fs.existsSync('./node_modules/powerbot-cms')) return this.log(chalk.red('\nNot in Powerbot CMS project.\n'))
    if (!args.module) return this.log(chalk.red('You need to select which server start. Run `powerbot help dev` for details.\n'))

    switch (args.module) {
      case 'chatbot':
        child.execSync('npm run dev', {
          stdio: 'inherit'
        })
        process.exit(0)
        break
      case 'cms':
        child.execSync('npm run dev', {
          stdio: 'inherit',
          cwd: `./node_modules/powerbot-cms`
        })
        process.exit(0)
        break
      default:
        this.log(chalk.red('\nOnly `cms` and `chatbot` options are valid.\n'))
        process.exit(0)
        break
    }
  }
}
