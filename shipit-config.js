// Recommended config per https://github.com/timkelty/shipit-captain
// Permits shipit to be run from the CLI or from gulp
const fs = require('fs'),
      roles = require('shipit-roles'),
      packageVersion = JSON.parse(fs.readFileSync('./package.json', 'utf8')).version;

var config = {
  default: {
    keepReleases: 10,
    deleteOnRollback: true,
    workspace: 'tmp',
    deployTo: '/swadm/var/www/deploy/umnlib-drupal-theme',
    repositoryUrl: 'git@github.umn.edu:Libraries/umnlib-drupal-theme-build',
    // shallow clones only the latest revision for a one-off deploy
    // but that won't work if we also wish to support THEME_REVISION as an
    // env var option. If we don't ever use THEME_REVISION to deploy specific
    // commits in practice, switch this to true to improve performance
    shallowClone: false
  },
  dev: {
    //servers: ['swadm@lib-orbis-dev-01.oit.umn.edu', 'swadm@lib-orbis-dev-02.oit.umn.edu']
    servers: [
      {user: 'swadm', host: 'lib-orbis-dev-01.oit.umn.edu', role: 'drush'},
      {user: 'swadm', host: 'lib-orbis-dev-02.oit.umn.edu'}
    ]
  },
  stage: {
    servers: [
      {user: 'swadm', host: 'lib-orbis-qat-01.oit.umn.edu', role: 'drush'},
      {user: 'swadm', host: 'lib-orbis-qat-02.oit.umn.edu'}
    ]
  },
  prod: {
    servers: [
      {user: 'swadm', host: 'lib-orbis-prd-01.oit.umn.edu', role: 'drush'},
      {user: 'swadm', host: 'lib-orbis-prd-02.oit.umn.edu'}
    ]
  },
  local: {
    servers: [
      {user: require('os').userInfo().username, host: 'localhost', role: 'drush'}
    ]
  }
};

module.exports.config = config;
module.exports.init = function(shipit) {

	// Make sure dotenv has been loaded
	require('dotenv').config({path: '.env.' + shipit.environment});

  require('shipit-deploy')(shipit);
  // Use specific commit if given in env $THEME_REVISION (like on the command line)
  // then NODE_ENV (defined in gulp)
  // finally the shipit command line environment var
  config.default.branch = process.env.THEME_REVISION || process.env.NODE_ENV || shipit.environment;

  shipit.initConfig(config);
  roles(shipit);

  shipit.task('drush:cacheclear', function() {
    // Only clear on the host defined with a drush role
    // Path to Drupal install (and drush) is static
    // or can be overridden with env var $DRUPAL_PATH
    return shipit.remote('cd ' + (process.env.DRUPAL_PATH || '/swadm/var/www/www-drupal/current') + ' && sites/default/vendor/bin/drush cache-clear all', {role: 'drush'});
  })
};
