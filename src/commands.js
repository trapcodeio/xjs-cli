const {cyan, yellow, whiteBright, magenta, red, white, green} = require('chalk');
const {prompt} = require('inquirer');
/**
 * fs
 * @type {module:fs}
 */
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
    new(name, overwrite = false) {
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
        // process.exit();
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

        mkdirp.sync(appFullPath);

        const installInApp = (lib) => {
            return shell.exec(`npm install --prefix ${appFullPath} ${lib} --no-audit --no-package-lock --silent`)
        };

        name = name.split('/');
        if (name.length > 1) {
            name = name[name.length - 1];
        } else {
            name = name[0];
        }

        log(`Creating new project ${yellowWithBars(name)}`);
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
            log(`Installing ${yellowWithBars('knex')} globally.`)
            shell.exec('npm install knex -g', {silent: true})
        }

        let hasNodemon = shell.exec('npm ls -g nodemon', {silent: true}).stdout;
        if (!hasNodemon.includes('nodemon@')) {
            log(`Installing ${yellowWithBars('nodemon')} globally.`);
            shell.exec('npm install nodemon -g', {silent: true})
        }

        log(`Installing ${yellowWithBars('dotenv')}...`);
        installInApp('dotenv');

        log(`Installing ${yellowWithBars(xjs)}...`);
        console.log(white('This may take a while, Approx 2-5 Minutes depending on your connection.'));
        installInApp(xjs);

        // create install.js file
        fs.writeFileSync(appPath('install.js'), fs.readFileSync(cliPath('install.txt')).toString());

        log('Generating needed files...');
        shell.exec(`node ${appFullPath}/install.js`, {silent: true});

        log(`Renaming ${yellowWithBars('env.example')} to ${yellowWithBars('.env')}`);
        fs.copyFileSync(appPath('env.example'), appPath('.env'));

        log(`Installation complete!!`);
        
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
        shell.exec('node xjs make:view ' + name);
    },

    makeController(name) {
        this.checkIfInXjsFolder();
        shell.exec('node xjs make:controller ' + name)
    },

    makeModel(...args) {
        this.checkIfInXjsFolder();
        shell.exec('node xjs make:model ' + args.join(' '))
    },

    makeMiddleware(name) {
        this.checkIfInXjsFolder();
        shell.exec('node xjs make:middleware ' + name)
    },

    makeJob(...args) {
        this.checkIfInXjsFolder();
        shell.exec('node xjs make:job ' + args.join(' '))
    },

    runJob(name) {
        this.checkIfInXjsFolder();
        shell.exec('node xjs @' + name.trim())
    }
};


module.exports = commands;