const {cyan, yellow, whiteBright, magenta, red, white, green} = require('chalk');
const {prompt} = require('inquirer');

const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const mkdirp = require('mkdirp');
const shell = require('shelljs');
const _ = require("lodash");
const ObjectCollection = require("./ObejctCollection");


// Xjs npm id
const xjs = 'xpresser';

const defaultConfig = {

    development: {
        'main': "app.js",
        'console': "node",
        'server': "node",
    },

    production: {
        'main': "app.js",
        'console': "node",
        'server': "forever start",
    },

    jobsPath: 'backend/jobs'
};


/**
 * Get Base path
 * @param path
 * @return {string|*}
 */
const basePath = (path = '') => {
    if (path.length) {
        return process.cwd() + '/' + path;
    }
    return process.cwd()
};

const cliPath = ($path = '') => {
    return path.resolve(__dirname + '/../' + $path)
};

const log = (...args) => {
    args.unshift('=> ');
    console.log(cyan(...args))
};

const logError = (...args) => {
    console.log(red(...args))
};

const logErrorAndExit = (...args) => {
    args.unshift('Error: ');
    logError(...args);
    process.exit();
};

// const cyanWithBars = (str) => cyan('{' + str.trim() + '}');
const yellowWithBars = (str) => yellow('{' + str.trim() + '}');
const whiteWithBars = (str) => whiteBright('{' + str.trim() + '}');
// const magentaWithBars = (str) => magenta('{' + str.trim() + '}');
const redWithBars = (str) => red('{' + str.trim() + '}');


const currentXjsVersion = () => {
    let packageDotJson = require(basePath('package.json'));
    let packages = packageDotJson.dependencies;
    let packagesKeys = Object.keys(packages);
    let version = '0.0.0';

    for (let i = 0; i < packagesKeys.length; i++) {
        const packagesKey = packagesKeys[i];
        if (packagesKey === xjs) {
            version = packages[packagesKey];
            break;
        }
    }

    if (version.substr(0, 1) === '^') {
        version = version.substr(1);
    }

    return version;
};

const HasYarnLock = () => fs.existsSync(basePath('yarn.lock'));

const updateXjs = () => {
    let command = `npm install ${xjs} --save --no-audit --silent`;
    if (HasYarnLock()) {
        log('Using Yarn...');
        command = `yarn add ${xjs} --silent`
    } else {
        log('Using Npm...');
        // if NPM remove xjs first
        shell.exec(`npm remove ${{xjs}}`, {silent: true})
    }

    console.log(white('............'));
    log('Updating....');
    console.log(white('............'));

    return shell.exec(command);
};

const loadJobs = function (path = false) {
    if (path === false) {
        path = basePath('backend/jobs');
    }
    let commands = {};

    if (fs.existsSync(path)) {
        let jobFiles = fs.readdirSync(path);
        for (let i = 0; i < jobFiles.length; i++) {
            let jobFile = jobFiles[i];
            let jobFullPath = path + '/' + jobFile;

            if (fs.lstatSync(jobFullPath).isDirectory()) {
                return loadJobs(jobFullPath);
            } else if (fs.lstatSync(jobFullPath).isFile()) {

                let job = require(jobFullPath);
                if (typeof job !== 'object') {
                    logErrorAndExit('Job: {' + jobFile + '} did not return object!');

                    if (job.hasOwnProperty('command') || !job.hasOwnProperty('handler')) {
                        logErrorAndExit('Job: {' + jobFile + '} is not structured properly!')
                    }
                }


                if (typeof job.schedule === "function") {
                    job.schedule = job.schedule();
                }

                if (typeof job.schedule === "string") {
                    job.path = jobFullPath;
                    commands[job.command] = job;
                }
            }
        }
    }

    return commands;
};

let commands = {
    init(lang = 'js') {
        const UseFile = basePath('use-xjs-cli.json');

        if (fs.existsSync(UseFile)) {
            return logErrorAndExit('Init file already exists.');
        }

        if (lang === 'typescript') lang = 'ts';
        if (lang === 'javascript') lang = 'js';

        if (lang === 'ts') {
            fs.copyFileSync(cliPath('factory/use-xjs-cli.ts.json'), UseFile)
        } else {
            fs.copyFileSync(cliPath('factory/use-xjs-cli.js.json'), UseFile)
        }

        log("Init file created.")
    },
    new(name, overwrite = false, fromRoot = false) {
        if (!fromRoot && ((name === undefined || typeof name === 'string') && !name.length)) {
            return prompt({
                type: 'input',
                name: 'app_name',
                message: 'Enter App Name:',
                validate: name => name.length ? true : 'Provide a project name to continue.'
            }).then(({app_name}) => this.new(app_name));
        }

        const appFullPath = basePath(name);
        const appPath = (str = '') => {
            return appFullPath + (str.length ? '/' + str : str)
        };

        name = appFullPath.split('/');
        if (name.length > 1) {
            name = name[name.length - 1];
        } else {
            name = name[0];
        }


        if (!fromRoot) {
            if (fs.existsSync(appFullPath) && !overwrite) {

                let self = this;
                return prompt({
                    'type': 'confirm',
                    name: 'app_overwrite',
                    message: red(`Folder ${whiteWithBars(name)} exists in dir ${whiteWithBars(basePath())}, should i try overwriting this folder?`)
                }).then(({app_overwrite}) => {
                    if (app_overwrite) {
                        return self.new(name, app_overwrite);
                    } else {
                        return log(`Delete ${redWithBars(appFullPath)} first.`);
                    }
                });

            }

            if (overwrite) {
                fse.removeSync(appFullPath);
            }


            log(`Creating new project ${yellow(name)}`);

            mkdirp.sync(appFullPath);
        }


        fs.writeFileSync(appFullPath + '/package.json', JSON.stringify({
                name,
                version: "0.0.1",
                description: "",
                main: "server.js",
                scripts: {
                    "start": "node server.js",
                    "watch": "cross-env NODE_ENV=development node_modules/webpack/bin/webpack.js --watch --progress --hide-modules --config=node_modules/laravel-mix/setup/webpack.config.js",
                    "prod": "npm run production",
                    "production": "cross-env NODE_ENV=production node_modules/webpack/bin/webpack.js --progress --hide-modules --config=node_modules/laravel-mix/setup/webpack.config.js"
                },
                keywords: [],
                author: "",
                license: "ISC"
            }, null, 2
        ));

        let hasKnex = shell.exec('npm ls -g knex', {silent: true}).stdout;
        if (!hasKnex.includes('knex@')) {
            log(`Installing ${yellow('knex')} globally.`);
            shell.exec('npm install knex -g', {silent: true})
        }

        let hasNodemon = shell.exec('npm ls -g nodemon', {silent: true}).stdout;
        if (!hasNodemon.includes('nodemon@')) {
            log(`Installing ${yellow('nodemon')} globally.`);
            shell.exec('npm install nodemon -g', {silent: true})
        }

        if (!fromRoot && (process.platform === 'win32' || process.platform === 'win64')) {
            log(`Due To ${yellow('npm --prefix')} is not compatible on ${yellow('windows')}`);
            log(`Enter your project folder (${yellow('cd ' + name)})`);
            log(`Then run ${yellow('xjs install')}`);
            process.exit();
        }

        const installInApp = (lib) => {
            let command = '';
            if (fromRoot) {
                if (HasYarnLock()) {
                    command = `yarn add ${lib} --silent`
                } else {
                    command = `npm install ${lib} --no-audit --silent`
                }
            } else {
                let prefix = `--prefix ${appFullPath}`;
                command = `npm install ${prefix} ${lib} --save --no-audit --silent`;
            }

            return shell.exec(command)
        };

        log(`Installing ${yellow('dotenv')}...`);
        installInApp('dotenv');

        log(`Installing ${yellow(xjs)}...`);
        console.log(white('This may take a while, Approx 2-5 Minutes depending on your connection.'));
        installInApp(xjs);


        // create install.js file
        fs.writeFileSync(appPath('install.js'), fs.readFileSync(cliPath('factory/install.txt')).toString());

        log('Generating needed files...');
        shell.exec(`node ${appFullPath}/install.js`, {silent: true});

        log(`Renaming ${yellow('env.example')} to ${yellow('.env')}`);
        fs.copyFileSync(appPath('env.example'), appPath('.env'));

        // Copy Empty Demo Database
        let DemoDatabase = appPath('storage/app/db');
        if (!fs.existsSync(DemoDatabase)) {
            mkdirp.sync(DemoDatabase);
        }

        DemoDatabase += '/database.sqlite';
        fs.copyFileSync(cliPath('factory/database.sqlite'), DemoDatabase);


        log(`Installation complete!!`);

        console.log(white('..........'));
        console.log(green(`Run the following commands to migrate your ${whiteBright('database')} and ${whiteBright('start')} your app.`));
        console.log(white('..........'));

        if (!fromRoot) {
            log(`Run ${yellow(`cd ${name}`)}`);
        }

        log(`Run ${yellow('xjs migrate')} to migrate your database.`);
        log(`Run ${yellow('node server.js')} to start app. `);
    },

    install() {
        let hasXjs = this.checkIfInXjsFolder(true);
        if (hasXjs) {
            return logErrorAndExit(`Xjs project already exists in this folder.`);
        }

        log('Preparing for installation...');
        this.new('', true, true);
    },

    installProdTools() {
        log(`Checking if ${yellow('knex')} exists...`);
        let hasKnex = shell.exec('npm ls -g knex', {silent: true}).stdout;
        if (!hasKnex.includes('knex@')) {
            log(`Installing ${yellow('knex')} globally.`);
            shell.exec('npm install knex -g', {silent: true})
        }

        log(`Checking if ${yellow('forever')} exists...`);
        let hasForever = shell.exec('npm ls -g forever', {silent: true}).stdout;
        if (!hasForever.includes('forever@')) {
            log(`Installing ${yellow('forever')} globally.`);
            shell.exec('npm install forever -g', {silent: true})
        }

        log('All production tools are installed!');
    },

    checkIfInXjsFolder(trueOrFalse = false, $returnData = false) {

        if (typeof XjsCliConfig !== "undefined") {
            if (trueOrFalse) {
                return true;
            } else if ($returnData) {
                return XjsCliConfig;
            }
        }

        let appHasXjs = basePath('use-xjs-cli.json');
        if (fs.existsSync(appHasXjs)) {
            if ($returnData) {
                try {
                    let config = require(appHasXjs);
                    if (typeof config === "object") {
                        config = _.merge(defaultConfig, config);
                        global['XjsCliConfig'] = new ObjectCollection(config);

                        if (
                            !XjsCliConfig.has('development.main')
                            ||
                            !XjsCliConfig.has('production.main')
                        ) {
                            return logErrorAndExit(" No development/production settings in use-xjs-cli.json");
                        } else {
                            return config;
                        }
                    }
                } catch (e) {
                    return logErrorAndExit(e.message);
                }
            }
        } else {
            const msg = 'Xjs project not found in this folder.';
            return trueOrFalse ? false : logErrorAndExit(msg);
        }

    },

    migrate() {
        return this.cli("migrate");
    },

    migrateMake(...args) {
        this.cli(`migrate make ${args.join(' ')}`);
    },

    migrateRefresh(skip = false) {
        if (!skip) {
            this.checkIfInXjsFolder();
            log('Rolling back migrations...');
        }

        let rollback = this.cli(`migrate rollback`, {silent: true}).stdout;

        if (!rollback.toLowerCase().includes('already')) {
            return this.migrateRefresh(true);
        } else {
            this.cli('migrate latest');
            return log('Migrations refreshed successfully!');
        }
    },

    migrateRollback() {
        return this.cli('migrate rollback');
    },

    start(env = 'development') {
        let config = XjsCliConfig;

        if (env === 'prod' || env === 'production') {
            config = XjsCliConfig.get('production');
            const command = `${config.server} ${config.main}`;
            const startServer = shell.exec(command, {silent: config.server.includes('forever')});

            if (!startServer.stderr.trim().length) {
                log(command);
                log('Server started.');
            } else {
                logErrorAndExit(startServer.stderr);
            }
        } else {
            config = XjsCliConfig.get('development');
            shell.exec(`${config.server} ${config.main}`);
        }
    },

    cli(command) {
        const config = XjsCliConfig.get('development');
        const shellCommand = `${config.console} ${config.main} cli ${command}`;
        shell.exec(shellCommand);
        process.exit();
    },

    makeView(name) {
        return this.cli("make:view " + name)
    },

    makeController(name) {
        return this.cli('make:controller ' + name)
    },

    makeModel(...args) {
        return this.cli('make:model ' + args.join(' '))
    },

    makeMiddleware(name) {
        return this.cli('make:middleware ' + name)
    },

    makeJob(...args) {
        return this.cli('make:job ' + args.join(' '))
    },

    runJob(args) {
        return this.cli('@' + args.join(' '))
    },

    cron(env = 'development', from = undefined) {
        if (env === 'prod') env = 'production';

        const config = XjsCliConfig.get(env);
        // Require Project Xjs
        require(basePath(config['main']));

        const cron = require('node-cron');

        let cronJobs = loadJobs(basePath(XjsCliConfig.get("jobsPath")));

        let cronJobKeys = Object.keys(cronJobs);
        const cronCmd = basePath('cron-cmd.js');

        if (!fs.existsSync(cronCmd)) {
            fs.writeFileSync(cronCmd, fs.readFileSync(cliPath('factory/cron-cmd.txt')));
        }

        env = env === 'production' ? 'prod' : env;

        if (from === undefined && env === 'prod') {
            let startCronCmd = shell.exec(`forever start ./cron-cmd.js`, {silent: true});
            if (startCronCmd.stdout.trim().length) {
                return log('Cron Started.');
            }
        }

        for (let i = 0; i < cronJobKeys.length; i++) {
            const cronJobKey = cronJobKeys[i];
            const cronJob = cronJobs[cronJobKey];
            let duration = cronJob['schedule'];

            if (duration === 'everyMinute') {
                duration = "* * * * *";
            }

            cron.schedule(duration, () => {
                shell.exec('xjs @ ' + cronJob.command);
            }, {});

            log(`Job: ${yellowWithBars(cronJob.command)} added to cron`)
        }
    },

    checkForUpdate() {
        log('Checking npm registry for version update...');
        let version = shell.exec(`npm show ${xjs} version`, {silent: true}).stdout.trim();
        let currentVersion = currentXjsVersion();
        if (currentVersion < version) {
            log(`Xjs latest version is ${yellow(version)} but yours is ${whiteBright(currentVersion)}`);
            return prompt({
                'type': 'confirm',
                name: 'update',
                message: `Would you like to update?`
            }).then(({update}) => {
                if (update) {
                    updateXjs();
                } else {
                    return log(`No changes made.`);
                }
            });
        }

        log(`You already have the latest version of ${yellow('Xjs')}`);
        log(`Version: ${whiteBright(currentVersion)}`)
    },

    stop(process) {
        const PM_PATH = basePath(`node_modules/${xjs}/src/console/ProcessManager.js`);

        if (!fs.existsSync(PM_PATH)) {
            return logErrorAndExit('Xjs Cannot find ProcessManager in this project');
        }
        let ProcessManager = {};

        try {
            ProcessManager = new (require(PM_PATH))(basePath());
        } catch (e) {
            return logErrorAndExit(e.message);
        }


        if (process === 'all' || process === 'cron') {
            let stopCron = shell.exec('forever stop ./cron-cmd.js', {silent: true});
            if (stopCron.stdout.trim().length) {
                // End all process associated with file
                ProcessManager.endProcess(basePath('cron-cmd.js'), 'all');
                log('Cron Stopped.');
            }
        }
        if (process === 'all' || process === 'server') {
            let stopServer = shell.exec('forever stop ./server.js', {silent: true});
            if (stopServer.stdout.trim().length) {
                // End all process associated with file
                ProcessManager.endProcess(basePath('server.js'), 'all');
                log('Server Stopped.');
            }
        }
    },

    restart(process) {
        if (process === 'all' || process === 'cron') {
            this.stop('cron');
            this.cron('prod')
        }
        if (process === 'all' || process === 'server') {
            this.stop('server');
            this.start('prod');
        }
    },

    installPlugin($plugin) {
        return this.cli(`install ${$plugin}`);
    }
};


module.exports = commands;