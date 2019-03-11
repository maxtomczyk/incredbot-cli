const { Command } = require('@oclif/command')
const chalk = require('chalk')
const fs = require('fs')

class InfoCommand extends Command {
  async run () {
    const cliVersion = this.config.pjson.version
    let cmsVersion = null
    let localPackage = null
    if (fs.existsSync('./package.json')) localPackage = JSON.parse(fs.readFileSync('./package.json'))
    if (localPackage && localPackage.dependencies['powerbot-cms']) cmsVersion = localPackage.dependencies['powerbot-cms'].match(/#.*$/gi)[0].replace('#', '')
    this.log()
    this.log(`${chalk.bold('CLI VERSION: ')}${chalk.green(cliVersion)}`)
    if (cmsVersion) this.log(`${chalk.bold('CMS VERSION: ')}${chalk.green(cmsVersion)}`)
    else this.log((`${chalk.bold('CMS VERSION: ')}${chalk.red('Not a Powerbot CMS Project directory.')}`))
    this.log()
    process.exit(0)
  }
}

InfoCommand.description = `Shows info about CLI and Powerbot CMS project`

module.exports = InfoCommand
