#! /usr/bin/env node

const child = require('child_process')
const os = require('os')
const chalk = require('chalk')
const shell = require('shelljs')
const fs = require('fs')
const pack = require('./package.json')

let program = require('commander')
const npm = (os.platform() === 'win32') ? 'npm.cmd' : 'npm'
// const nodemon = (os.platform() === 'win32') ? 'nodemon.cmd' : 'nodemon'

program
  .command('init <name>')
  .action((name, cmd) => {
    console.log(chalk.blue(`\nRunning incredbot-cli - version ${pack.version}`))
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
    child.execFileSync(npm, ['install', 'maxtomczyk/incredbot-cms', '--save'], {
      stdio: 'inherit',
      cwd: `./${name}`
    })
    console.log(chalk.green(`\nProject initialized successfully. Now you need to configure your database connection in config.js file and then run 'incredbot database setup' inside project directory.`))
  })

program
  .command('dev <end>')
  .action((end, cmd) => {
    if (!fs.existsSync('./node_modules/incredbot-cms/index.js')) return console.log(chalk.red('\nNot an incredbot-cms project directory!'))

    switch (end) {
      case 'cms':
        child.execFileSync(npm, ['run', 'dev'], {
          stdio: 'inherit',
          cwd: `./node_modules/incredbot-cms`
        })
        break

      case 'bot':
        child.execFileSync('node', ['./node_modules/nodemon/bin/nodemon.js'], {
          stdio: 'inherit'
        })
        break
      default:
        console.log(chalk.red('\nUnknown dev option.'))
    }
  })

program
  .command('create <object> <name>')
  .action((object, name, cmd) => {
    if (!fs.existsSync('./node_modules/incredbot-cms/index.js')) return console.log(chalk.red('\nNot an incredbot-cms project directory!'))

    switch (object) {
      case 'view':
        const viewDuplicate = fs.existsSync(`./node_modules/incredbot-cms/src/views/${name}.vue`)
        if (viewDuplicate) return console.log(chalk.red(`\nThis view name is already used. If it's not yours it's probably one of reserved names.`))
        fs.copyFileSync('./node_modules/incredbot-cms/scripts/files/EmptyVueFile.vue', `./cms/views/${name}.vue`)
        fs.symlinkSync(`../../../../cms/views/${name}.vue`, `./node_modules/incredbot-cms/src/views/${name}.vue`)
        console.log(chalk.green(`\n'${name}' view has been created!`))
        console.log(chalk.blue(`\nDon't forget to create route in router.js. You may also want to create CMS menu link in App.vue`))
        break

      case 'component':
        const componentDuplicate = fs.existsSync(`./node_modules/incredbot-cms/src/components/${name}.vue`)
        if (componentDuplicate) return console.log(chalk.red(`\nThis component name is already used. If it's not yours it's probably one of reserved names.`))
        fs.copyFileSync('./node_modules/incredbot-cms/scripts/files/EmptyVueFile.vue', `./cms/components/${name}.vue`)
        fs.symlinkSync(`../../../../cms/components/${name}.vue`, `./node_modules/incredbot-cms/src/components/${name}.vue`)
        console.log(chalk.green(`\n'${name}' component has been created!`))
        console.log(chalk.blue(`\nDon't forget to register component in main.js.`))
        break
      default:
        console.log(chalk.red('\nUnknown object to create.'))
    }
  })

program
  .command('database <operation>')
  .action((operation, cmd) => {
    switch (operation) {
      case 'setup':
        try {
          child.execFileSync('node', ['init_db.js'], {
            stdio: 'inherit',
            cwd: `./node_modules/incredbot-cms/scripts`
          })
          console.log(chalk.green(`\nDatabase has been setted up successfully!`))
        } catch (e) {
          console.log(chalk.red('\nAn error occured during setting up a database. Details should be logged above.'))
        }
        break
      default:
    }
  })

program.parse(process.argv)
