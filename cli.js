#!/usr/bin/env node

const program = require('commander');
// Require logic.js file and extract controller functions using JS destructuring assignment
const commands = require('./src/commands');
let packages = require('./package.json');


program
    .version(packages.version)
    .description('Xjs Framework CLI');


program
    .command('new [name]')
    .description('Create new xjs project')
    .action(name => commands.new(name));

program
    .command('start [env]')
    .description('Start app.')
    .action(env => commands.start(env));

program
    .command('migrate')
    .description('Migrate database of current project')
    .action(() => commands.migrate());

program
    .command('run <job>')
    .alias('@')
    .description('Run Jobs')
    .action((name) => commands.runJob(name));

program
    .command('make:job <name> [command]')
    .alias('mk:job')
    .description('Generate new Job.')
    .action((name, command) => commands.makeJob(name, command));


program
    .command('make:view <name>')
    .alias('mk:v')
    .description('Generate new view.')
    .action((name) => commands.makeView(name));

program
    .command('make:model <name> <table>')
    .alias('mk:model')
    .description('Generate new Model.')
    .action((name, table) => commands.makeModel(name, table));

program
    .command('make:controller <name>')
    .alias('mk:ctrl')
    .description('Generate new Controller.')
    .action((name) => commands.makeController(name));

program
    .command('make:middleware <name>')
    .alias('mk:guard')
    .description('Generate new Middleware.')
    .action((name) => commands.makeMiddleware(name));

program.on('command:*', function () {
    console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
    process.exit(1);
});

program.parse(process.argv);