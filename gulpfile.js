//*********** Gulp file for v4
// Task management with Gulp
// Available CLI main tasks:
//   gulp dev   - default build process for dev testing ('dev' task)
//   gulp stage  - build for stage deployment ('stage' task)
//   gulp prod   - build for production including git flow ('prod' task)
//   gulp local  - similar build process to dev, targeting local web server development ('local' task)

//Available CLI individual tasks:
//   gulp git - runs git flow for production release
//   gulp icons - compiles all svg files into a single icon files
//   gulp lint - reviews js code for standard formatting errors
//   gulp minify:css - concatenates and minifies css code
//   gulp minify:js  - concatenates and minifies js code
//   gulp new  - runs git flow to begin a new release
//   gulp optimize:img - image optimization for all gif, jpeg, png, and svg files in /img
//   gulp sass - processes sass files into css
//   gulp test - runs full testing suite for final checks pre prod build
//   gulp test:acessibility - runs accessibility testing
//   gulp test:load - performs load performance testing against stage server
//   gulp test:accessibility - runs accessibility tests
//   gulp watch - watches and updates js and css file saves for dev and stage builds

//*********** Gulp variables & plugins
const gulp       = require('gulp'),
      access     = require('gulp-accessibility'), //accessibility auditing
      del        = require('del'), //removes files and folders
      //dotenv    = require('dotenv'), //defined later - set environmental variables from .env files
      ext        = require('gulp-ext-replace'), //modifies file extensions
      htmltidy   = require('gulp-htmltidy'), //makes code readable
      fs         = require('fs'), //file syncing to read package.json version parameter
      git         = require('gulp-git'), // Git support for build repository publishing
      //gitflow   = require('gulp-release'), //gitflow for releasing production code
      haml       = require('gulp-ruby-haml'),
      imagemin   = require('gulp-imagemin'), //image optimization
      includes   = require('gulp-file-include'), //process includes
      log        = require('fancy-log'), // makes gulp log output available instead of console.log()
      notify     = require('gulp-notify'), //to write messages into CLI
      noop       = require('gulp-noop'), //for its ternary loop ability
      phplint    = require('gulp-phplint'), //checks for valid well formed php
      plumber    = require('gulp-plumber'),
      psi        = require('psi'), //PageSpeed Insights for web performance ranking
      replace    = require('gulp-string-replace'), //to write in asset URLs
      shipit     = require('./shipit-config'),
      shipitCaptain = require('shipit-captain'),
      through    = require('through2'),
      utimes     = require('fs').utimes; //to force files to update modify date when partials are edited

// GLOBAL VARIABLES
// defaults to a list of available environments
var globals = {environments: ['dev','stage','prod','local'], git: {currentCommit: null, currentBranch: null}},
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
      haml: [
        './src/*.haml',
        './src/templates/**/*.haml',
        '!./src/templates/**/_*.haml',
        '!./src/glyph/*.haml'
      ],
      hamltemplates: [
        './build/' + env + '/templates/page--*.tpl.php'
      ],
      php: ['./src/**/*.php'],
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
        './src/favicon.ico',
        './src/robots.txt',
        './src/humans.txt',
        './src/screenshot.png',
        './src/umnlib.info',
        './src/manifest.json',
        './src/service-worker.js'
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
gulp.task('write:haml', function() {
  log('Process HAML');
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
    .pipe(haml({
      noEscapeAttrs:true,
      cdata: false,
      outExtension: '.php'
    }))
    // force indents for non-production versions for legibility - temporary extra element replacement cannot work with this
    .pipe(globals.env === 'dev' || globals.env === 'local' ? htmltidy({indent:true, 'drop-empty-elements':false}) : noop())
    .pipe(gulp.dest(globals.html.dest))
    //update file modified date
    .pipe(touch);
});

//PHP copy
gulp.task('copy:php', function() {
  log('Copy php files');
  return gulp.src(globals.html.php)
    .pipe(plumber({
      errorHandler: _onError
    }))
    .pipe(gulp.dest(globals.dir));
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


gulp.task('write:replace-extra-elems', function() {
  log('Build asset paths');
  return gulp.src(globals.html.hamltemplates)
    .pipe(plumber({
      errorHandler: _onError
    }))
    .pipe(replace('<!DOCTYPE html><html><head><title></title></head><body>', '',
      {
        logs: {
          enabled: false
        }
      }
    )) //Assets path
    .pipe(replace('</body></html>', '',
      {
        logs: {
          enabled: false
        }
      }
    )) //Google Analytics URL
    .pipe(gulp.dest(globals.html.dest));
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

// lint php files
gulp.task('clean:php', function() {
  return gulp.src(globals.html.all)
    //.pipe(phplint())
    // Log all problems that were found
    .pipe(phplint.reporter('fail'));
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

gulp.task('buildrepo:clone', function(done) {
  var doCheckout = function() {
    // Checkout the env branch or create it if it does not exist
    git.fetch(globals.deploy.remote, '', {cwd: globals.deploy.repoDir}, function(err) {
      git.checkout(globals.env, {cwd: globals.deploy.repoDir}, function(err) {
        if (err) {
          console.error('Could not switch to branch ' + globals.env + '. Make sure the branch exists in the remote build repo.');
          throw err;
        }
        git.pull(globals.deploy.remote, globals.env, {cwd: globals.deploy.repoDir}, function(err) {
          if (err) throw err;
          git.merge('master', {cwd: globals.deploy.repoDir}, function(err) {
            log('master merged')
            if (err) throw err;
            done();
          });
        });
      });
    });
  };
  if (!fs.existsSync(globals.deploy.repoDir)) {
    git.clone((globals.deploy.buildRepo), {args: globals.deploy.repoDir}, function(err) {
      if (err) throw err;
      doCheckout();
    });
  }
  else {
    doCheckout();
  }
});

gulp.task('buildrepo:commit', function(done) {
  // git add doesn't work with a stream outside the repo, so actually change working dir
  var lastDir = process.cwd();
  process.chdir(globals.deploy.repoDir);

  // Recursively copy the build into the buildrepo to stage changes
  var copySrc = [
        fs.realpathSync(lastDir + '/' + globals.dir) + '/**/*',
      ],
      addSrc = [
        globals.deploy.repoDir + '/**/*',
      ];
  return gulp.src(copySrc)
    .pipe(gulp.dest(globals.deploy.repoDir))
    .pipe(gulp.src(addSrc, {passthrough: true}))
    .pipe(git.add())
    .pipe(git.commit('Gulp build env:' + globals.env + '|umnlib-drupal-theme|rev:' + globals.git.currentCommit + '|branch:' + globals.git.currentBranch + ' Build: ' + (new Date()).toString()), {cwd: globals.deploy.repoDir})
    .on('end', function() {
      // Return to the original working directory (gulp root)
      process.chdir(lastDir);
      done();
    });
});

gulp.task('buildrepo:push', function(done) {
  // Push the HEAD revison to the build's branch
  git.push(globals.deploy.remote, globals.env, {cwd: globals.deploy.repoDir}, function(err) {
    done();
  });
});

function doShipit(config, action, cb) {
  var options = {
    init: shipit.init,
    // Run the requested action, and then clear the cache
    // which is necessary for any changes to the theme
    run: [action, 'drush:cacheclear'],
    targetEnv: globals.env,
    confirm: false
  };
  shipitCaptain(config, options, cb)
}
gulp.task('deploy:head', function(done) {
  // Deploy the HEAD revision of the environment branch
  process.env.THEME_REVISION = globals.env;
  doShipit(globals.deploy.config, 'deploy', done);
});
gulp.task('rollback', function(done) {
  doShipit(globals.deploy.config, 'rollback', done);
});

//*********** Primary tasks
gulp.task('write', gulp.series('clean:pre-build', 'write:haml', gulp.parallel('copy:php', 'write:svg', 'copy:misc'), 'write:replace-strings', 'write:replace-extra-elems'));

gulp.task('build:dev', gulp.series('env:dev', 'write', gulp.parallel('clean:php', 'optimize:img')));
gulp.task('build:stage', gulp.series('env:stage', 'write', 'optimize:img'));
gulp.task('build:prod', gulp.series('env:prod', 'write', 'optimize:img'));
gulp.task('build:local', gulp.series('env:local', 'write', 'clean:php', 'optimize:img'));

//only run against stage
gulp.task('qa', gulp.series('env:stage', 'test:performance-mobile', 'test:performance-desktop', 'test:accessibility'));

// Commit build (defines a task to load env and make release for each valid stage)
globals.environments.forEach(function(env) {
  gulp.task('deploy:' + env, gulp.series('env:' + env, 'deploy:head'));
  gulp.task('rollback:' + env, gulp.series('env:' + env, 'rollback'));
  gulp.task('build:freeze:' + env, gulp.series('env:' + env, 'buildrepo:clone', 'buildrepo:commit', 'buildrepo:push'));
  gulp.task('publish:' + env, gulp.series('env:' + env, 'build:freeze:' + env, 'deploy:head'))
});

//*********** EOF
