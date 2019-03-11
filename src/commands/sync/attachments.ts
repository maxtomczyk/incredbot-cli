import { Command, flags } from '@oclif/command'
import chalk from 'chalk'
import * as path from 'path'
import * as fs from 'fs'
import * as keytar from 'keytar'
import * as lodash from 'lodash'

export default class Sync extends Command {
  static description = 'Sync attachments table between two environments'
  static args = [{ name: 'source' }, { name: 'target' }]

  async run() {
    const { args, flags } = this.parse(Sync)
    if (!fs.existsSync('./node_modules/powerbot-cms')) return this.log(chalk.red('\nNot in Powerbot CMS project.\n'))
    this.log()
    if (!args.source) {
      this.log(chalk.red('You need to specify source!\n'))
      process.exit(0)
    }
    if (!args.target) {
      this.log(chalk.red('You need to specify target!\n'))
      process.exit(0)
    }

    try {
      const homedir: any = (process.platform === 'win32') ? process.env.HOMEPATH : process.env.HOME
      const projectPath = process.cwd().split('/')
      const projectName = projectPath[projectPath.length - 1]
      const allEnvs = fs.readdirSync(path.join(homedir, '.powerbot-cli', 'environments'))
      const config = eval(fs.readFileSync('./config/config.js', 'utf-8'))
      let projectEnvs = allEnvs.filter((env: any) => {
        const exp = new RegExp(projectName, 'gi')
        return exp.test(env)
      }).map((env: any) => {
        return env.replace(`${projectName}-`, '').replace('.json', '')
      })

      if (args.source !== 'local' && projectEnvs.indexOf(args.source) === -1) {
        this.log(chalk.red('Source argument is not a valid environment.\n'))
        process.exit(0)
      }

      if (args.target !== 'local' && projectEnvs.indexOf(args.target) === -1) {
        this.log(chalk.red('Target argument is not a valid environment.\n'))
        process.exit(0)
      }

      interface DBConfig {
        ssl: boolean;
        host: string;
        user: string;
        database: string;
        password: string;
      }

      let sourceConfig: DBConfig = {
        ssl: true,
        user: '',
        host: '',
        database: '',
        password: ''
      }

      let targetConfig: DBConfig = {
        ssl: true,
        user: '',
        host: '',
        database: '',
        password: ''
      }

      if (args.source === 'local') {
        sourceConfig = config.database
        //@ts-ignore
        sourceConfig.database = sourceConfig.name
        //@ts-ignore
        delete sourceConfig.name
      } else {
        const serviceName = `${projectName}-${args.source}`
        const json = JSON.parse(fs.readFileSync(path.join(homedir, '.powerbot-cli', 'environments', `${serviceName}.json`), 'utf-8'))
        const [sensitive] = await keytar.findCredentials(`${serviceName}-db`)
        sourceConfig.host = json.host
        sourceConfig.user = sensitive.account
        sourceConfig.database = json.name
        sourceConfig.password = sensitive.password
      }

      if (args.target === 'local') {
        targetConfig = config.database
        //@ts-ignore
        targetConfig.database = targetConfig.name
        //@ts-ignore
        delete targetConfig.name
      } else {
        const serviceName = `${projectName}-${args.target}`
        const json = JSON.parse(fs.readFileSync(path.join(homedir, '.powerbot-cli', 'environments', `${serviceName}.json`), 'utf-8'))
        const [sensitive] = await keytar.findCredentials(`${serviceName}-db`)
        targetConfig.host = json.host
        targetConfig.user = sensitive.account
        targetConfig.database = json.name
        targetConfig.password = sensitive.password
      }

      const sourceKnex = require('knex')({
        client: 'pg',
        useNullAsDefault: true,
        connection: sourceConfig
      })

      const targetKnex = require('knex')({
        client: 'pg',
        useNullAsDefault: true,
        connection: targetConfig
      })

      this.log(chalk.cyan('Synchronizing attachments...\n'))
      let sourceAttachments = await sourceKnex('attachments').orderBy('name', 'asc')
      let targetAttachments = await targetKnex('attachments').orderBy('name', 'asc')

      const attachmentsToUpdate: any = lodash.intersectionBy(sourceAttachments, targetAttachments, 'name')
      const attachmentsToDelete: any = lodash.differenceBy(targetAttachments, sourceAttachments, 'name')
      const attachmentsToCreate: any = lodash.differenceBy(sourceAttachments, targetAttachments, 'name')

      await targetKnex.transaction((trx: any) => {
        let queries = []
        for (const attachment of attachmentsToUpdate) {
          this.log(chalk.cyan(`${attachment.name} will be updated.`))
          queries.push(trx('attachments').update({
            friendly_name: attachment.friendly_name,
            description: attachment.description,
            url: attachment.url,
            force_update: true
          }).where('name', attachment.name))
        }

        for (let attachment of attachmentsToCreate) {
          this.log(chalk.cyan(`${attachment.name} will be created`))
          delete attachment.id
          delete attachment.attachment_id
          attachment.force_update = true
          queries.push(trx('attachments').insert(attachment))
        }

        for (const attachment of attachmentsToDelete) {
          this.log(chalk.cyan(`${attachment.name} will be destroyed`))
          queries.push(trx('attachments').where('name', attachment.name).del())
        }

        this.log(chalk.cyan('Transacting all operations...'))
        return Promise.all(queries)
      })
      this.log(chalk.green('\nAll attachments are now synchronized!\n'))
      process.exit(0)
    } catch (e) {
      throw e
    }
  }
}
