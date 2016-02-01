'use strict';

import fs from 'fs';
import path from 'path';
import gulp from 'gulp';
import sass from 'gulp-sass';
import bower from 'gulp-bower';
// import babel from 'gulp-babel';
// import zip from 'gulp-zip';
// import ignore from 'gulp-ignore';
// import foreach from 'gulp-foreach';
import gutil from 'gulp-util';
// import debug from 'gulp-debug';
import del from 'del';
import jsonfile from 'jsonfile';
// import merge from 'merge-stream';
// import config from 'config';
import packager from 'electron-packager';
import browserify from 'browserify';
import glob from 'glob';
import source from 'vinyl-source-stream';
import runSeq from 'run-sequence';
import { execSync } from 'child_process';
import * as yargs from 'yargs';

const pjson = jsonfile.readFileSync('./package.json');

const argv = yargs.options({
    c: {
        alias: 'clean',
        demand: false,
        default: false,
        describe: 'Cleans the build folder before creating packages.',
        type: 'boolean'
    },
    z: {
        alias: 'zip',
        demand: false,
        default: false,
        describe: 'Creates SFX executables after package creation.',
        type: 'boolean'
    },
    nzc: {
        alias: 'no_zip_clean',
        demand: false,
        default: false,
        describe: 'Removes package folders after SFX executables have been created.',
        type: 'boolean'
    },
    r: {
        alias: 'release',
        demand: false,
        default: false,
        describe: 'Bundles the -c and -z switches.',
        type: 'boolean'
    }
}).argv;

jsonfile.spaces = "\t";

const paths = {
    sass: "./src/sass",
    bower: "./bower_components"
};

gulp.task('bower', () => {
    return bower().pipe(gulp.dest(paths.bower));
});

gulp.task('icons', () => {
    return gulp.src(`${paths.bower}/fontawesome/fonts/**.*`).pipe(gulp.dest('dist/fonts'));
});

gulp.task('css', () => {
    return gulp.src(`${paths.sass}/style.scss`).pipe(sass({
        includePaths: [
            paths.sass,
            `${paths.bower}/bootstrap-sass/assets/stylesheets`,
            `${paths.bower}/fontawesome/scss`
        ]
    })).pipe(gulp.dest('dist/css'));
});

gulp.task('babel', () => {
    let entries = glob.sync('./src/js/**/*.js');
    return browserify({ entries }).transform('babelify', {
        presets: ['es2015']
    }).transform('config-browserify').bundle().pipe(source('bundle.js'))
        .pipe(gulp.dest('dist/js'));
});

gulp.task('build', ['bower', 'icons', 'css', 'babel']);

gulp.task('package-clean', () => {
    let builds = glob.sync('./build/**/*');
    return del(builds).then((paths) => {
        console.log(`Deleted ${paths.length} files.`);
    });
});

gulp.task('package-make', (cb) => {
    let igDirs = ['build', 'src', 'bower_components'];
    let pjDeps = Object.keys(pjson.dependencies);
    let nodeDeps = fs.readdirSync('./node_modules').filter((file) => {
        if (pjDeps.indexOf(file) !== -1) return false;
        return fs.statSync(path.join('./node_modules', file)).isDirectory();
    });
    let opts = {
        arch: 'all',
        dir: __dirname,
        name: pjson.name,
        platform: 'win32',
        out: 'build/',
        overwrite: true,
        ignore: new RegExp(`(${igDirs.join('|')}|node_modules/(${nodeDeps.join('|')}))`)
    };
    packager(opts, (err, appPath) => {
        if (err) throw err;
        gutil.log(`Application has been packaged at: ${appPath}`);
        cb();
    });
});

gulp.task('zip-make', (cb) => {
    let builds = glob.sync('build/recorder-win32-*');
    var arch;
    for (var build of builds) {
        arch = build.split('/')[1].split('-')[2];
        execSync(`rar a -r -sfx -z"../../build.conf" ../recorder-${arch} *`,{
            cwd: build
        });
        console.log(`Created Executable: build/recorder-${arch}.exe`);
    }
    cb();
});

gulp.task('zip-clean', () => {
    let builds = glob.sync('build/recorder-win32-*');
    return del(builds);
});

gulp.task('package', (cb) => {
    var tasks = [];

    if (argv.release) {
        tasks = tasks.concat(['package-clean', 'package-make', 'zip-make', 'zip-clean']);
    } else {
        if (argv.clean) tasks.push('package-clean');
        tasks.push('package-make');
        if (argv.zip || argv.no_zip_clean) {
            tasks.push('zip-make');
            if (!argv.no_zip_clean) {
                tasks.push('zip-clean');
            }
        }
    }
    tasks.push(cb);
    console.log(JSON.stringify(tasks, null, 2));
    runSeq(...tasks);
});

gulp.task('gutil-test', function(cb) {
    gutil.log('stuff happened', 'Really it did', gutil.colors.magenta('123'));
    cb();
});
