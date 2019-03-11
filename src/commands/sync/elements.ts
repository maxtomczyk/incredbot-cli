import { Command, flags } from '@oclif/command'
import chalk from 'chalk'
import * as path from 'path'
import * as fs from 'fs'
import * as keytar from 'keytar'
import * as lodash from 'lodash'

export default class Sync extends Command {
  static description = 'Sync static elements between two environments.'
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

      this.log(chalk.cyan('Synchronizing elements...'))
      let sourceElements = await sourceKnex('static_elements').orderBy('name', 'asc')
      let targetElements = await targetKnex('static_elements').orderBy('name', 'asc')
      let targetElementsMapped: any = {}
      targetElements.map((a: any) => {
        targetElementsMapped[a.name] = a
      })
      const elementsToUpdate: any = lodash.intersectionBy(sourceElements, targetElements, 'name').filter((source: any) => {
        let target: any = targetElementsMapped[source.name]

        if (source.value !== target.value || !lodash.isEqual(target.json, source.json)) return true
        else return false
      })

      const elementsToDelete: any = lodash.differenceBy(targetElements, sourceElements, 'name')
      const elementsToCreate: any = lodash.differenceBy(sourceElements, targetElements, 'name')

      this.log(chalk.cyan(`Elements to update: ${elementsToUpdate.length}`))
      this.log(chalk.cyan(`Elements to create: ${elementsToCreate.length}`))
      this.log(chalk.cyan(`Elements to delete: ${elementsToDelete.length}`))

      await targetKnex.transaction((trx: any) => {
        let queries = []
        for (const element of elementsToUpdate) {
          queries.push(trx('static_elements').update({
            value: element.value,
            json: element.json,
            force_update: true
          }).where('name', element.name))
        }

        for (let element of elementsToCreate) {
          delete element.id
          element.force_update = true
          queries.push(trx('static_elements').insert(element))
        }

        for (const element of elementsToDelete) {
          queries.push(trx('static_elements').where('name', element.name).del())
        }

        this.log(chalk.cyan('\nTransacting all operations...'))
        return Promise.all(queries)
      })
      this.log(chalk.green('\nAll elements are now synchronized!\n'))
      process.exit(0)
    } catch (e) {
      throw e
    }
  }
}
