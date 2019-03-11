import { Command, flags } from '@oclif/command'
import chalk from 'chalk'
import * as fs from 'fs'

export default class Component extends Command {
  static description = 'Creates new component for CMS. Type paramter is `view` or `component`.'
  static flags = {}
  static args = [{ name: 'type' }, { name: 'name' }]

  async run() {
    const { args, flags } = this.parse(Component)
    if (!fs.existsSync('./node_modules/powerbot-cms')) return this.log(chalk.red('\nNot in Powerbot CMS project.\n'))
    if (!args.type) return this.log(chalk.red('\nYou must provide type of component. Run `powerbot help component` for more informations.\n'))
    if (!args.name) return this.log(chalk.red('\nYou must provide name of component. Run `powerbot help component` for more informations.\n'))

    switch (args.type) {
      case 'component':
        const componentDuplicate = fs.existsSync(`./node_modules/powerbot-cms/src/components/${args.name}.vue`)
        if (componentDuplicate) return this.log(chalk.red(`\nThis component name is already used. If it's not yours it's probably one of reserved names.`))
        fs.copyFileSync('./node_modules/powerbot-cms/scripts/files/EmptyVueComponent.vue', `./cms/components/${args.name}.vue`)
        fs.symlinkSync(`../../../../cms/components/${args.name}.vue`, `./node_modules/powerbot-cms/src/components/${args.name}.vue`)
        this.log(chalk.green(`\n'${args.name}' component has been created!`))
        this.log(chalk.blue(`\nDon't forget to register component in cms/main.js.`))
        process.exit(0)

        break

      case 'view':
        const viewDuplicate = fs.existsSync(`./node_modules/powerbot-cms/src/views/${args.name}.vue`)
        if (viewDuplicate) return console.log(chalk.red(`\nThis view name is already used. If it's not yours it's probably one of reserved names.`))
        fs.copyFileSync('./node_modules/powerbot-cms/scripts/files/EmptyVueFile.vue', `./cms/views/${args.name}.vue`)
        fs.symlinkSync(`../../../../cms/views/${args.name}.vue`, `./node_modules/powerbot-cms/src/views/${args.name}.vue`)
        console.log(chalk.green(`\n'${args.name}' view has been created!`))
        console.log(chalk.blue(`\nDon't forget to create route in cms/vue_router.js. You may also want to create CMS menu link in CustomRoutes.js\n`))
        process.exit(0)
        break

      default:
        this.log(chalk.red('\nType can be only `view` or `component`.\n'))
        process.exit(0)
        break
    }
  }
}
