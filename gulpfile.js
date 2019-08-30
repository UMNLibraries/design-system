//*********** Gulp file for v4
// Task management with Gulp
// Available CLI main tasks:
//   gulp stage  - build for stage deployment ('stage' task)
//   gulp prod   - build for production including git flow ('prod' task)

//Available CLI individual tasks:
//   gulp icons - compiles all svg files into a single icon files
//   gulp minify:css - concatenates and minifies css code
//   gulp minify:js  - concatenates and minifies js code
//   gulp optimize:img - image optimization for all gif, jpeg, png, and svg files in /img
//   gulp test - runs full testing suite for final checks pre prod build
//   gulp test:accessibility - runs accessibility testing
//   gulp test:load - performs load performance testing against stage server
//   gulp test:accessibility - runs accessibility tests
//   gulp watch - watches and updates js and css file saves for dev and stage builds

//*********** Gulp variables & plugins
const gulp       = require('gulp'),
      access     = require('gulp-accessibility'), //accessibility auditing
      del        = require('del'), //removes files and folders
      ext        = require('gulp-ext-replace'), //modifies file extensions
      htmltidy   = require('gulp-htmltidy'), //makes code readable
      fs         = require('fs'), //file syncing to read package.json version parameter
      git         = require('gulp-git'), // Git support for build repository publishing
      haml       = require('gulp-ruby-haml'),
      imagemin   = require('gulp-imagemin'), //image optimization
      includes   = require('gulp-file-include'), //process includes
      log        = require('fancy-log'), // makes gulp log output available instead of console.log()
      notify     = require('gulp-notify'), //to write messages into CLI
      noop       = require('gulp-noop'), //for its ternary loop ability
      plumber    = require('gulp-plumber'),
      psi        = require('psi'), //PageSpeed Insights for web performance ranking
      replace    = require('gulp-string-replace'), //to write in asset URLs
      through    = require('through2'),
      utimes     = require('fs').utimes; //to force files to update modify date when partials are edited

// GLOBAL VARIABLES
// defaults to a list of available environments
var globals = {environments: ['stage','prod'], git: {currentCommit: null, currentBranch: null}},
    _onError = function(err) {log(err);};

// Define an env task for each defined environment
// The loop can be unrolled if differences are needed for env tasks
globals.environments.forEach(function(env) {
  gulp.task('env:' + env, function(done) {
    require('dotenv').config({path: '.env.' + env});
    // Merge globals defaults
    globals = Object.assign(globals, setVariables(process.env.NODE_ENV));
    // Load the current umnlib-drupal-theme commit into a variable
    // to be used later by build commits to the frozen build repo
    git.exec({args: 'log -n1 --pretty=format:%h'}, function(err, rev) {
      globals.git.currentCommit = rev;
      git.revParse({args: '--abbrev-ref HEAD'}, function(err, branch) {
        globals.git.currentBranch = branch;
        done();
      });
    })
  });
});

//temporary solution to force file modify date to update since partials editing doesn't trigger it
var touch = through.obj(function(file, enc, done) {
  var now = new Date;
  utimes(file.path, now, now, done);
});

//set file variables
function setVariables(env) {
  return {
    env: env,
    dir: './build/' + env,
    all: './build/'+ env + '/**/*.*',
    asset: process.env.ASSET_VERSION,
    deploy: {
      url: process.env.URL,
      git: process.env.GIT,
      ga: process.env.GA_ACCOUNT_ID,
      buildRepo: process.env.BUILD_REPO,
      repoDir: process.cwd() + '/buildrepo',
      remote: 'origin',
      // Clone the shipit config so we can change params locally if needed
      config: JSON.parse(JSON.stringify(shipit.config))
    },
    html: {
      all: './build/' + env + '/**/*.php',
      dest: './build/' + env + '/templates'
    },
    images: {
      source: './src/img/**/*.*',
      dest: './build/' + env + '/img'
    },
    glyph: {
      source: './src/glyph/**.*',
      dest: './build/' + env + '/glyph'
    },
    misc: {
      source: [
        './src/favicon.ico'
      ]
    }
  }
}

//var versioning = minimist(process.argv.slice(2), options.minimist);

//*********** Gulp individual tasks

// Returns the umnlib-assets "version" key from package.json
function getPackageJsonVersion () {
  // We parse the json file instead of using require because require caches
  // multiple calls so the version number won't be updated
  return JSON.parse(fs.readFileSync('./package.json', 'utf8')).version;
};

//removes directory to be re-written
gulp.task('clean:pre-build', function(done) {
  del(globals.dir).then(paths => {
    log('Deleted:', paths.join('\n'));
    done();
  });
});

//HAML => HTML
//file names like _file.haml, not _file.html.haml
gulp.task('write:html', function() {
  log('Process HTML');
  return gulp.src(globals.html.haml)
    .pipe(plumber({
      errorHandler: _onError
    }))
    //write includes in first so haml is processed
    .pipe(includes({
      prefix:'@@',
      basepath:'./',
      indent:true
    }))
    // process haml into html
    // force indents for non-production versions for legibility - temporary extra element replacement cannot work with this
    .pipe(globals.env === 'dev' || globals.env === 'local' ? htmltidy({indent:true, 'drop-empty-elements':false}) : noop())
    .pipe(gulp.dest(globals.html.dest))
    //update file modified date
    .pipe(touch);
});

//Other files copy
gulp.task('copy:misc', function() {
  log('Copy meta files');
  return gulp.src(globals.misc.source)
    .pipe(plumber({
      errorHandler: _onError
    }))
    .pipe(gulp.dest(globals.dir));
});

//Image copy
gulp.task('copy:images', function() {
  log('Copy image files');
  return gulp.src(globals.images.source)
    .pipe(plumber({
      errorHandler: _onError
    }))
    .pipe(gulp.dest(globals.images.dest));
});

gulp.task('write:replace-strings', function() {
  log('Build asset paths');
  return gulp.src(globals.all)
    .pipe(plumber({
      errorHandler: _onError
    }))
    .pipe(replace('asset/path/', globals.deploy.url + '/assets/' + globals.asset + '/',
      {
        logs: {
          enabled: false
        }
      }
    )) //Assets path
    .pipe(replace('ga/account/', globals.deploy.ga,
      {
        logs: {
          enabled: false
        }
      }
    )) //Google Analytics URL
    .pipe(gulp.dest(globals.dir));
    //.pipe(notify({
    //  message: 'URL destinations complete'
    //}));
});

//Basic image optimization
gulp.task('optimize:img', function() {
  log('Begin image optimization');
  return gulp.src(globals.images.source)
    .pipe(plumber({
      errorHandler: _onError
    }))
    .pipe(imagemin([
      imagemin.optipng({optimizationLevel:5}),
      imagemin.jpegtran({progressive:true}), //set for progressive jpeg rendering
      imagemin.gifsicle({interlaced:true})], //set for progressive gif rendering
      {
        cache:false,
        verbose: globals.env === 'dev' || globals.env === 'local' ? true : false //logs info for if image is optimized and how much on stage build
      }
    ))
    .pipe(gulp.dest(globals.images.dest));
});

//SVG optimization
gulp.task('write:svg', function() {
  log('Begin svg optimization');
  return gulp.src(globals.glyph.source)
    .pipe(plumber({
      errorHandler: _onError
    }))
    .pipe(haml({
      noEscapeAttrs:true
    }))
    .pipe(ext('.svg'))
    .pipe(imagemin([
      imagemin.svgo()
    ],
    {
      cache: false,
      verbose: globals.env === 'dev' || globals.env === 'local' ? true : false // glyph by glyph details
    }
    ))
    .pipe(gulp.dest(globals.glyph.dest));
});

// Watch files for changes
gulp.task('watch', function() {
  gulp.watch(options.images.files, ['optimize:img']);
});

//Run code against WCAGAA for accessibility
gulp.task('test:accessibility', function() {
  return gulp.src(globals.html.all)
    .pipe(access({
      force: true,
      accessibilityLevel: 'WCAG2AA',
      reportLevels: {
        notice:false,
        warning:false,
        error:true
      },
      ignore: [
        'WCAG2AA.Principle3.Guideline3_1.3_1_1.H57.2', //false positives on partials for missing <html lang="en">
        'WCAG2AA.Principle3.Guideline3_1.3_1_1.H57.3.Lang', //false positives on partials for missing <html lang="en">
        'WCAG2AA.Principle2.Guideline2_4.2_4_2.H25.1.NoTitleEl' //false positives on partials for missing <title>
      ],
      reportLocation: 'reports' //default, but here if we want to change it
    }))
    .pipe(access.report({reportType: 'txt'}))
    .pipe(ext('txt'))
    .pipe(gulp.dest('reports/txt'));
});

// Performance and accessibility auditing
gulp.task('test:performance-desktop', function () {
    return psi(globals.deploy.url, {
        key: process.env.PSI_KEY,
        strategy: 'desktop',
    }).then(function (data) {
        console.log('Performance audit for ' + globals.deploy.url);
        console.log('Desktop speed score: ' + data.ruleGroups.SPEED.score);
        //console.log(data.pageStats); //full blob
        console.log('Goals listed for 2018');
        console.log('----------------------');
        console.log('Resources:   ' + data.pageStats.numberResources + ' / 25 ');
        console.log('HTML size:   ' + data.pageStats.htmlResponseBytes + ' / 20000 ');
        console.log('Img size:   ' + data.pageStats.imageResponseBytes + ' / 120000 ');
        console.log('Font size:   ' + data.pageStats.otherResponseBytes + ' / 19000 ');
        console.log('JS size:   ' + data.pageStats.javascriptResponseBytes + ' / 13000 ( ' + data.pageStats.numberJsResources + ' file(s) )');
        console.log('CSS size:   ' + data.pageStats.cssResponseBytes + ' / 6000 ( ' + data.pageStats.numberCssResources + ' file(s) )');
    });
    //.pipe(plumber({errorHandler: _onError}));
});

gulp.task('test:performance-mobile', function () {
    return psi(globals.deploy.url, {
        key: process.env.PSI_KEY,
        strategy: 'mobile',
    }).then(function (data) {
        console.log('Mobile speed score: ' + data.ruleGroups.SPEED.score);
        console.log('Mobile usability score: ' + data.ruleGroups.USABILITY.score);
        console.log('Goals listed for 2018');
        console.log('----------------------');
        console.log('Resources:   ' + data.pageStats.numberResources + ' / 25 ');
        console.log('HTML size:   ' + data.pageStats.htmlResponseBytes + ' / 20000 ');
        console.log('Img size:   ' + data.pageStats.imageResponseBytes + ' / 120000 ');
        console.log('Font size:   ' + data.pageStats.otherResponseBytes + ' / 19000 ');
        console.log('JS size:   ' + data.pageStats.javascriptResponseBytes + ' / 13000 ( ' + data.pageStats.numberJsResources + ' file(s) )');
        console.log('CSS size:   ' + data.pageStats.cssResponseBytes + ' / 6000 ( ' + data.pageStats.numberCssResources + ' file(s) )');
    });
    //.pipe(plumber({errorHandler: _onError}));
});

//*********** Primary tasks
gulp.task('write', gulp.series('clean:pre-build', 'write:html', gulp.parallel('write:svg', 'copy:misc'), 'write:replace-strings', 'write:replace-extra-elems'));

gulp.task('build:stage', gulp.series('env:stage', 'write', 'optimize:img'));
gulp.task('build:prod', gulp.series('env:prod', 'write', 'optimize:img'));

//only run against stage
gulp.task('qa', gulp.series('env:stage', 'test:performance-mobile', 'test:performance-desktop', 'test:accessibility'));

// Commit build (defines a task to load env and make release for each valid stage)
globals.environments.forEach(function(env) {
  gulp.task('deploy:' + env, gulp.series('env:' + env, 'deploy:head'));
  gulp.task('rollback:' + env, gulp.series('env:' + env, 'rollback'));
  gulp.task('publish:' + env, gulp.series('env:' + env, 'deploy:head'))
});

//*********** EOF
