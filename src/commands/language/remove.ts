import { Command, flags } from '@oclif/command'
import chalk from 'chalk'
import * as fs from 'fs'

export default class LanguageRemove extends Command {
  static description = 'Removes language support from your chatbot.'
  static flags = {}
  static args = [{ name: 'nameOrLocale' }]

  async run() {
    const { args, flags } = this.parse(LanguageRemove)
    if (!fs.existsSync('./node_modules/powerbot-cms')) return this.log(chalk.red('\nNot in Powerbot CMS project.\n'))
    this.log()
    const config = eval(fs.readFileSync('./config/config.js', 'utf-8'))
    const knex = require('knex')({
      client: 'pg',
      useNullAsDefault: true,
      connection: process.env.DATABASE_URL || {
        host: config.database.host,
        user: config.database.user,
        password: config.database.password,
        database: config.database.name
      }
    })

    try {
      const langs = await knex('languages')
      if(langs.length === 1) {
        this.log(chalk.red(`You can't remove all languages from your chatbot.\n`))
        return process.exit(0)
      }
      const lang = await knex('languages').where('name', args.nameOrLocale).orWhere('locale', args.nameOrLocale).first()

      if (!lang) {
        this.log(chalk.red('Passed languege is not present in database.\n'))
        return process.exit(0)
      }

      if(lang.default) {
        this.log(chalk.red('You can\'t remove default language.\n'))
        return process.exit(0)
      }
      const messages = await knex('messages')
      this.log(chalk.cyan(`Removing ${lang.locale} locale from ${messages.length} messages and creating database transaction...`))

      await knex.transaction((trx: any) => {
        let queries = []
        queries.push(trx('languages').where('locale', lang.locale).del())

        messages.map((message: any) => {
          delete message.json[lang.locale]
          queries.push(trx('messages').update('json', message.json).where('id', message.id))
        })

        console.log(chalk.cyan('Running transaction...'))
        return Promise.all(queries)
      })

      this.log(chalk.green(`\nLanguage has been removed!\n`))
      process.exit(0)
    } catch (e) {
      throw e
    }
  }
}
