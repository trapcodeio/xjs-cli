#!/usr/bin/env node

const program = require('commander');
// Require logic.js file and extract controller functions using JS destructuring assignment
const commands = require('./src/commands');
let packages = require('./package.json');

let hasXjs = commands.checkIfInXjsFolder(true);

program
    .version(packages.version)
    .description('Xjs Framework CLI');

if (!hasXjs) {
    program
        .command('new [name]')
        .description('Create new xjs project')
        .action(name => commands.new(name));

    program
        .command('install')
        .description('Install xjs in current dir.')
        .action(() => commands.install());
}

if (hasXjs) {
    program
        .command('start [env]')
        .description('Start app.')
        .action(env => commands.start(env));

    program
        .command('migrate')
        .description('Migrate database of current project')
        .action(() => commands.migrate());

    program
        .command('migrate:make <name>')
        .description('Generate new Middleware.')
        .action((name) => commands.migrateMake(name));

    program
        .command('migrate:rollback')
        .description('Rollback the last set of migrations')
        .action(() => commands.migrateRollback());

    program
        .command('migrate:refresh')
        .description('Rollback the last set of migrations')
        .action(() => commands.migrateRefresh());

    program
        .command('run <job...>')
        .alias('@')
        .description('Run Jobs')
        .action((name) => commands.runJob(name));

    program
        .command('make:job <name> [command]')
        // .alias('mk:job')
        .description('Generate new Job.')
        .action((name, command) => commands.makeJob(name, command));


    program
        .command('make:view <name>')
        // .alias('mk:v')
        .description('Generate new view.')
        .action((name) => commands.makeView(name));

    program
        .command('make:model <name> <table>')
        // .alias('mk:model')
        .description('Generate new Model.')
        .action((name, table) => commands.makeModel(name, table));

    program
        .command('make:controller <name>')
        // .alias('mk:ctrl')
        .description('Generate new Controller.')
        .action((name) => commands.makeController(name));

    program
        .command('make:migration <name>')
        .description('Generate new Middleware.')
        .action((name) => commands.migrateMake(name));

    program
        .command('make:middleware <name>')
        // .alias('mk:guard')
        .description('Generate new Middleware.')
        .action((name) => commands.makeMiddleware(name));

    program
        .command('cron [env] [from_cmd]')
        .description('Start cron registered commands.')
        .action((env, from_cmd) => commands.cron(env, from_cmd));

    program
        .command('stop <process>')
        .description('Stop Server or Cron')
        .action((process) => commands.stop(process));

    program
        .command('restart <process>')
        .description('Stop Server or Cron')
        .action((process) => commands.restart(process));

    program
        .command('install-prod-tools')
        .description('Install Production tools')
        .action(() => commands.installProdTools());
    program
        .command('check-for-update [package_manager]')
        .description('Update Xjs using your desired package manager.')
        .action((package_manager) => commands.checkForUpdate(package_manager));
}

program.on('command:*', function () {
    console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
    process.exit(1);
});

program.parse(process.argv);