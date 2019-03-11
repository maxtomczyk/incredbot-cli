import {Command, flags} from '@oclif/command'
import chalk from 'chalk'
import * as fs from 'fs'

export default class LanguageDefault extends Command {
  static description = 'Sets passed language or locale as default.'

  static args = [{name: 'langOrLocale'}]

  async run() {
    const {args, flags} = this.parse(LanguageDefault)

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
      const lang = await knex('languages').where('name', args.langOrLocale).orWhere('locale', args.langOrLocale).first()
      if (!lang) {
        this.log(chalk.red('Passed language is not present in database.\n'))
        return process.exit(0)
      }

      await knex.transaction((trx: any) => {
        let queries = []
        queries.push(trx('languages').update('default', false))
        queries.push(trx('languages').update('default', true).where('id', lang.id))

        console.log(chalk.cyan('Changing...'))
        return Promise.all(queries)
      })

      this.log(chalk.green(`\nChanged default language to ${lang.name} (${lang.locale})\n`))
      process.exit(0)
    } catch (e) {
      throw e
    }
  }
}
