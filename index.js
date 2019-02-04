#! /usr/bin/env node

const child = require('child_process')
const os = require('os')
const chalk = require('chalk')
const shell = require('shelljs')
const fs = require('fs')
const pack = require('./package.json')
const version = '1.0.0'

let program = require('commander')
const npm = (os.platform() === 'win32') ? 'npm.cmd' : 'npm'

program
  .command('info')
  .description('Show info about CLI and CMS versions')
  .action((cmd) => {
    console.log(chalk.green(`\nPowerbot CLI: ${version}`))
    if (!fs.existsSync('./package.json')) return console.log(chalk.red('\nPowerbot CMS not detected in current catalog.'))
    let packageJSON = JSON.parse(fs.readFileSync('./package.json'))
    if (!packageJSON.dependencies || !packageJSON.dependencies['powerbot-cms']) return console.log(chalk.red('\nPowerbot CMS not detected in current catalog.'))
    let cmsVersion = packageJSON.dependencies['powerbot-cms'].match(/#.*$/gi)[0].replace('#', '')
    console.log(chalk.green(`Powerbot CMS: ${cmsVersion}`))
  })

program
  .command('init <name> <version>')
  .description('Create new catalog and initialize project inside.')
  .action((name, version, cmd) => {
    console.log(chalk.blue(`\nRunning powerbot-cli - version ${pack.version}`))
    console.log(chalk.blue(`\nCreating directory '${name}'...`))
    shell.exec(`mkdir ${name}`)
    console.log(chalk.blue('Running npm init...\n'))
    child.execSync(`cd ${name} && npm init`, {
      stdio: 'inherit'
    })
    console.log(chalk.blue(`\nInstalling nodemon...\n`))
    child.execFileSync(npm, ['install', 'nodemon', '--save-dev'], {
      stdio: 'inherit',
      cwd: `./${name}`
    })
    console.log(chalk.blue(`\nStarting installation in '${name}'...\n`))
    child.execFileSync(npm, ['install', `maxtomczyk/powerbot-cms#${version}`, '--save'], {
      stdio: 'inherit',
      cwd: `./${name}`
    })
    console.log(chalk.green(`\nProject initialized successfully. Now you need to configure your database connection in config.js file and then run 'powerbot database setup' inside project directory.`))
  })

program
  .command('dev <end>')
  .description('Start development server of desired part. End is bot or cms.')
  .usage('bot|cms')
  .action((end, cmd) => {
    if (!fs.existsSync('./node_modules/powerbot-cms/index.js')) return console.log(chalk.red('\nNot an powerbot-cms project directory!'))

    switch (end) {
      case 'cms':
        child.execFileSync(npm, ['run', 'dev'], {
          stdio: 'inherit',
          cwd: `./node_modules/powerbot-cms`
        })
        break

      case 'bot':
        child.execFileSync('node', ['./node_modules/nodemon/bin/nodemon.js'], {
          stdio: 'inherit'
        })
        break
      default:
        console.log(chalk.red('\nUnknown dev option.'))
        break
    }
  })

program
  .command('create <object> <name>')
  .description('Create new component or view for CMS panel.')
  .usage('component|view <name>')
  .action((object, name, cmd) => {
    if (!fs.existsSync('./node_modules/powerbot-cms/index.js')) return console.log(chalk.red('\nNot an powerbot-cms project directory!'))

    switch (object) {
      case 'view':
        const viewDuplicate = fs.existsSync(`./node_modules/powerbot-cms/src/views/${name}.vue`)
        if (viewDuplicate) return console.log(chalk.red(`\nThis view name is already used. If it's not yours it's probably one of reserved names.`))
        fs.copyFileSync('./node_modules/powerbot-cms/scripts/files/EmptyVueFile.vue', `./cms/views/${name}.vue`)
        fs.symlinkSync(`../../../../cms/views/${name}.vue`, `./node_modules/powerbot-cms/src/views/${name}.vue`)
        console.log(chalk.green(`\n'${name}' view has been created!`))
        console.log(chalk.blue(`\nDon't forget to create route in router.js. You may also want to create CMS menu link in App.vue`))
        break

      case 'component':
        const componentDuplicate = fs.existsSync(`./node_modules/powerbot-cms/src/components/${name}.vue`)
        if (componentDuplicate) return console.log(chalk.red(`\nThis component name is already used. If it's not yours it's probably one of reserved names.`))
        fs.copyFileSync('./node_modules/powerbot-cms/scripts/files/EmptyVueFile.vue', `./cms/components/${name}.vue`)
        fs.symlinkSync(`../../../../cms/components/${name}.vue`, `./node_modules/powerbot-cms/src/components/${name}.vue`)
        console.log(chalk.green(`\n'${name}' component has been created!`))
        console.log(chalk.blue(`\nDon't forget to register component in main.js.`))
        break
      default:
        console.log(chalk.red('\nUnknown object to create.'))
    }
  })

program
  .command('database <operation>')
  .description('Perform operation on a database.')
  .usage('setup')
  .action((operation, cmd) => {
    switch (operation) {
      case 'setup':
        try {
          child.execFileSync('node', ['init_db.js'], {
            stdio: 'inherit',
            cwd: `./node_modules/powerbot-cms/scripts`
          })
          console.log(chalk.green(`\nDatabase has been setted up successfully!`))
        } catch (e) {
          console.error(e)
          console.log(chalk.red('\nAn error occured during setting up a database. Details should be logged above.'))
        }
        break
    }
  })

program.parse(process.argv)
