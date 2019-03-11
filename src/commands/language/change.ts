import {Command, flags} from '@oclif/command'
import chalk from 'chalk'
import * as fs from 'fs'

export default class LanguageChange extends Command {
  static description = 'Changes languege into another.'
  static flags = {}
  static args = [{name: 'nameOrLocaleToChange'}, {name: 'newLangName'}, {name: 'newLangLocale'}]

  async run() {
    const {args, flags} = this.parse(LanguageChange)
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
      const lang = await knex('languages').where('name', args.nameOrLocaleToChange).orWhere('locale', args.nameOrLocaleToChange).first()
      if (!lang) {
        this.log(chalk.red('Passed language to change is not present in database.\n'))
        return process.exit(0)
      }

      const messages = await knex('messages')
      this.log(chalk.cyan(`Changing language to ${args.newLangLocale} in ${messages.length} messages and creating database transaction`))      
      
      await knex.transaction((trx: any) => {
        let queries = []
        queries.push(trx('languages').update({name: args.newLangName, locale: args.newLangLocale}).where('id', lang.id))

        messages.map((message: any) => {
          let localeToChangeData = JSON.parse(JSON.stringify(message.json[lang.locale]))
          delete message.json[lang.locale]
          message.json[args.newLangLocale] = localeToChangeData
          queries.push(trx('messages').update('json', message.json).where('id', message.id))
        })

        console.log(chalk.cyan('Running transaction...'))
        return Promise.all(queries)
      })

      this.log(chalk.green(`\nLanguage identified as ${args.nameOrLocaleToChange} has been changed to ${args.newLangName} (${args.newLangLocale})\n`))
      process.exit(0)
    } catch (e) {
      throw e
    }
  }
}
