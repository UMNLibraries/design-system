//*********** Gulp file for v4


//*********** Gulp variables & plugins
const gulp        = require('gulp'),
      autoprefixer = require('autoprefixer'), //in case it helps postcss-preset-env
      cssbrief    = require('gulp-shorthand'), //shorthands css code where possible
      del         = require('del'), //removes files and folders
      includes    = require('gulp-file-include'), //process includes
      log         = require('fancy-log'), //log output like gulp's
      plumber     = require('gulp-plumber'),
      postcss     = require('gulp-postcss'), //needed for polyfills
      postcsspart = require('postcss-partial-import'),
      postcsspre  = require('postcss-preset-env'), //polyfills the snot out of the code
      through     = require('through2'),
      utimes      = require('fs').utimes, //to force files to update modify date when partials are edited
      uglifycss   = require('gulp-uglifycss'); //squash css code so it isn't human readable
      webserver   = require('gulp-webserver');

// GLOBAL VARIABLES
var _onError = function(err) { console.log(err); };

//temporary solution to force file modify date to update since partials editing doesn't trigger it
var touch = through.obj(function(file, enc, done) {
  var now = new Date;
  utimes(file.path, now, now, done);
});

//*********** Gulp individual tasks

// Removes processed files to be re-written
gulp.task('pre-build', function(done) {
  del('./docs/*.*').then(paths => {
    log('Deleted:', paths.join('\n'));
    done();
  });
});

gulp.task('write:includes', function() {
  console.log('Process includes');
  return gulp.src('./src/docs/**/*.html')
    .pipe(plumber({
      errorHandler: _onError
    }))
    //write includes in first so haml is processed
    .pipe(includes({
      prefix: '@@',
      basepath: './',
      indent: true
    }))
    .pipe(gulp.dest('./docs'))
    //update file modified date
    .pipe(touch);
});

//Image copy
gulp.task('copy:images', function() {
  console.log('Copy image files');
  return gulp.src('./src/img/**/*.*')
    .pipe(plumber({
      errorHandler: _onError
    }))
    .pipe(gulp.dest('./docs/img/'));
});

// CSS processing, add prefixes, & minify
gulp.task('css', function() {
  return gulp.src('./src/local/ds.css')
    .pipe(plumber())
    .pipe(postcss([postcsspart()]))
    .pipe(cssbrief())
    .pipe(uglifycss())
    .pipe(gulp.dest('./docs/s/'));
});

gulp.task('postcss', function() {
  return gulp.src('./docs/s/ds.css')
    .pipe(postcss([
      postcsspre({
        importFrom: './src/css/root.css',
        browsers: '> 0.1%',
        autoprefixer: {
          grid: true,
          browsers: ['> 0.1%']
        }
      })
    ]))
    .pipe(gulp.dest('./docs/s/'));
});

// Local development via `gulp webserver`
gulp.task('webserver', function() {
  gulp.src('./docs')
    .pipe(webserver({
      // GULP_LIVERELOAD env var set false to turn off, or true (default)
      livereload: (typeof process.env.GULP_LIVERELOAD == 'undefined' || String(process.env.GULP_LIVERELOAD).toLowerCase() === 'true'),
      directoryListing: false,
      open: '/design-system',
      liveReload: true,
      path: '/design-system',
      port: process.env.GULP_PORT || '8000'
    }));
});

//*********** Primary tasks

gulp.task('default', gulp.series('pre-build', 'write:includes', 'copy:images', 'css', 'postcss'));


//*********** EOF
