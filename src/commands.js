const {cyan, yellow, whiteBright, magenta, red, white, green} = require('chalk');
const {prompt} = require('inquirer');

const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const mkdirp = require('mkdirp');
const shell = require('shelljs');
const xjs = '@trapcode/xjs';


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

const cyanWithBars = (str) => cyan('{' + str.trim() + '}');
const yellowWithBars = (str) => yellow('{' + str.trim() + '}');
const whiteWithBars = (str) => whiteBright('{' + str.trim() + '}');
const magentaWithBars = (str) => magenta('{' + str.trim() + '}');
const redWithBars = (str) => red('{' + str.trim() + '}');


let commands = {
    new(name, overwrite = false, fromRoot = false) {
        if (name === undefined || typeof name === 'string' && !name.length) {
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


        name = name.split('/');
        if (name.length > 1) {
            name = name[name.length - 1];
        } else {
            name = name[0];
        }

        log(`Creating new project ${yellow(name)}`);

        mkdirp.sync(appFullPath);

        // Get Latest dotenv and latest xjs

        // let latestDotEnv = shell.exec('npm show dotenv version', {silent: true}).stdout.trim();
        // let latestXjs = shell.exec(`npm show ${xjs} version`, {silent: true}).stdout.trim();

        fs.writeFileSync(appFullPath + '/package.json', JSON.stringify({
                name,
                version: "1.0.0",
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

        if (process.platform === 'linux' || process.platform === 'win64') {
            log(`Due To ${yellow('npm --prefix')} is not compatible in ${yellow('windows')}`);
            log(`Enter your project folder (${yellow('cd ' + name)})`);
            log(`Then run ${yellow('xjs install')}`);
            process.exit();
        }

        const installInApp = (lib) => {
            return shell.exec(`npm install --prefix ${appFullPath} ${lib} --save --no-audit --silent`)
        };

        log(`Installing ${yellow('dotenv')}...`);
        installInApp('dotenv');

        log(`Installing ${yellow(xjs)}...`);
        console.log(white('This may take a while, Approx 2-5 Minutes depending on your connection.'));
        installInApp(xjs);


        // create install.js file
        fs.writeFileSync(appPath('install.js'), fs.readFileSync(cliPath('install.txt')).toString());

        log('Generating needed files...');
        shell.exec(`node ${appFullPath}/install.js`, {silent: true});

        log(`Renaming ${yellow('env.example')} to ${yellow('.env')}`);
        fs.copyFileSync(appPath('env.example'), appPath('.env'));

        log(`Installation complete!!`);

        let appPackageDotJson = require(appPath('package.json'));

        if (!appPackageDotJson.hasOwnProperty('dependencies')) {
            console.log(appPackageDotJson);
        }

        console.log(white('..........'));
        console.log(green(`Run the following commands to migrate your ${whiteBright('database')} and ${whiteBright('start')} your app.`));
        console.log(white('..........'));

        log(`Run ${yellow(`cd ${name}`)}`);
        log(`Run ${yellow('xjs migrate')} to migrate our database.`);
        log(`Run ${yellow('node server.js')} to start app. `);
    },

    checkIfInXjsFolder() {
        if (!fs.existsSync(basePath('knexfile.js'))) {
            logError('Xjs project not found in this folder.');
            return process.exit();
        }
    },

    migrate() {
        this.checkIfInXjsFolder();
        shell.exec('knex migrate:latest');
    },

    start(env = 'development') {
        this.checkIfInXjsFolder();
        if (env !== 'development') {
            return shell.exec('node server.js');
        }

        return shell.exec('nodemon server.js');
    },

    makeView(name) {
        this.checkIfInXjsFolder();
        shell.exec('node cli make:view ' + name);
    },

    makeController(name) {
        this.checkIfInXjsFolder();
        shell.exec('node cli make:controller ' + name)
    },

    makeModel(...args) {
        this.checkIfInXjsFolder();
        shell.exec('node cli make:model ' + args.join(' '))
    },

    makeMiddleware(name) {
        this.checkIfInXjsFolder();
        shell.exec('node cli make:middleware ' + name)
    },

    makeJob(...args) {
        this.checkIfInXjsFolder();
        shell.exec('node cli make:job ' + args.join(' '))
    },

    runJob(name) {
        this.checkIfInXjsFolder();
        shell.exec('node cli @' + name.trim())
    }
};


module.exports = commands;