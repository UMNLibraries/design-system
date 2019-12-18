//*********** Gulp file for v4


//*********** Gulp variables & plugins
const gulp        = require('gulp'),
      autoprefixer = require('autoprefixer'), //in case it helps postcss-preset-env
      cssbrief    = require('gulp-shorthand'), //shorthands css code where possible
      del         = require('del'), //removes files and folders
      log         = require('fancy-log'), //log output like gulp's
      plumber     = require('gulp-plumber'),
      postcss     = require('gulp-postcss'), //needed for polyfills
      postcsspart = require('postcss-partial-import'),
      postcsspre  = require('postcss-preset-env'), //polyfills the snot out of the code
      uglifycss   = require('gulp-uglifycss'); //squash css code so it isn't human readable

//*********** Gulp individual tasks

// Removes processed files to be re-written
gulp.task('pre-build', function(done) {
  del('./docs/s/ds.css').then(paths => {
    log('Deleted:', paths.join('\n'));
    done();
  });
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
})

//*********** Primary tasks

gulp.task('default', gulp.series('pre-build', 'css', 'postcss'));


//*********** EOF
