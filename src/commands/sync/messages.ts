import { Command, flags } from '@oclif/command'
import chalk from 'chalk'
import * as path from 'path'
import * as fs from 'fs'
import * as keytar from 'keytar'
import * as lodash from 'lodash'

export default class Sync extends Command {
  static description = 'Sync messsages and groups between environments'
  static args = [{ name: 'source' }, { name: 'target' }]

  async run() {
    const { args, flags } = this.parse(Sync)
    if (!fs.existsSync('./node_modules/powerbot-cms')) {
      this.log(chalk.red('\nNot in Powerbot CMS project.\n'))
      process.exit(0)
    }
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

      this.log(chalk.cyan('Synchronizing messages groups...'))
      let sourceGroups = await sourceKnex('messages_groups')
      let targetGroups = await targetKnex('messages_groups')

      const groupsToDelete: any = lodash.differenceBy(targetGroups, sourceGroups, 'name')
      const groupsToCreate: any = lodash.differenceBy(sourceGroups, targetGroups, 'name')

      this.log(chalk.cyan(`Groups to create: ${groupsToCreate.length}`))
      this.log(chalk.cyan(`Groups to delete: ${groupsToDelete.length}`))
      this.log()
      await targetKnex.transaction((trx: any) => {
        let queries1 = []

        for (let group of groupsToCreate) {
          delete group.id
          queries1.push(trx('messages_groups').insert(group))
        }

        for (const group of groupsToDelete) {
          queries1.push(trx('messages_groups').where('name', group.name).del())
        }

        console.log(chalk.cyan('Transacting groups sync...'))
        return Promise.all(queries1)
          .then(async () => {
            this.log(chalk.cyan('\nSynchronizing messages...'))
            let updatedGroups = await trx('messages_groups')
            let queries2 = []
            let oldGroups = await sourceKnex('messages_groups')
            
            let groupsMapped: any = {}
            updatedGroups.map((g: any) => {
              groupsMapped[g.name] = g.id
            })
            
            let oldToNewGroupId: any = {}
            oldGroups.map((og: any) => {
              oldToNewGroupId[og.id] = groupsMapped[og.name]
            })

            let sourceMessages = await sourceKnex('messages')
            let targetMessages = await trx('messages')
            let targetMessagesMapped: any = {}
            targetMessages.map((m: any) => {
              targetMessagesMapped[m.name] = m
            })

            const messagesToUpdate: any = lodash.intersectionBy(sourceMessages, targetMessages, 'name').filter((source: any) => {
              let target: any = targetMessagesMapped[source.name]

              if(source.friendly_name !== target.friendly_name || source.description !== target.description || !lodash.isEqual(source.json, target.json) || source.type !== target.type) return true
              else return false
            })
            const messagesToDelete: any = lodash.differenceBy(targetMessages, sourceMessages, 'name')
            const messagesToCreate: any = lodash.differenceBy(sourceMessages, targetMessages, 'name')

            this.log(chalk.cyan(`Messages to update: ${messagesToUpdate.length}`))
            this.log(chalk.cyan(`Messages to create: ${messagesToCreate.length}`))
            this.log(chalk.cyan(`Messages to delete: ${messagesToDelete.length}`))
            this.log()
            for (const message of messagesToUpdate) {
              let gId = oldToNewGroupId[message.group_id]
              queries2.push(trx('messages').update({
                friendly_name: message.friendly_name,
                description: message.description,
                json: message.json,
                type: message.type,
                group_id: gId
              }).where('name', message.name))
            }

            for (let message of messagesToCreate) {
              delete message.id
              let oldGroup = await sourceKnex('messages_groups').where('id', message.group_id).first()
              message.group_id = groupsMapped[oldGroup.name]
              queries2.push(trx('messages').insert(message))
            }

            for (const message of messagesToDelete) {
              queries2.push(trx('messages').where('name', message.name).del())
            }
            console.log(chalk.cyan('Transacting messages changes...'))
            return Promise.all(queries2)
          })
          .catch(e => { throw e })
      })
      this.log(chalk.green('\nMessages and groups are synchronized!\n'))
      process.exit(0)
    } catch (e) {
      throw e
    }
  }
}
