import { Command, flags } from '@oclif/command'
import chalk from 'chalk'
import * as fs from 'fs'

export default class LanguageAdd extends Command {
  static description = `Creates new language and messages variants for new locale.
  As locale you have to provide valid Facebook locale like en_US`
  static flags = {}
  static args = [{ name: 'name' }, { name: 'locale' }]

  async run() {
    const { args, flags } = this.parse(LanguageAdd)
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
      const messages = await knex('messages')
      this.log(chalk.cyan(`Adding ${args.locale} to ${messages.length} messages and creating database transaction...`))
      await knex.transaction((trx: any) => {
        let queries = []
        queries.push(trx('languages').insert(args).returning('*'))
        messages.map((message: any) => {
          const anyLocaleData = JSON.parse(JSON.stringify(message.json[Object.keys(message.json)[0]]))
          message.json[args.locale] = anyLocaleData
          if(message.json[args.locale].texts) message.json[args.locale].texts = [`${message.name} default text in ${args.name} (${args.locale}) language.`]
          queries.push(trx('messages').update('json', message.json).where('id', message.id))
        })
        console.log(chalk.cyan('Running transaction...'))
        return Promise.all(queries)
      })

      this.log(chalk.green('\nNew language is ready to use.\n'))
      process.exit(0)
    } catch (e) {
      throw e
    }
  }
}
