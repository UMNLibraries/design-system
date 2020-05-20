# UMN Libraries Design System
The design system provides guidance for writing content and code for University Libraries' web assets developed or managed by the Web Development Team.

## Install Requirements
Install NodeJS and Gulp CLI manually.
* [Node](https://nodejs.org/en/download/) / version 6 or higher
* [GulpCLI](http://gulpjs.com/) / `npm install gulp-cli -g` in terminal

The design system is built with pure HTML and CSS. The code is intended to be simplified enough to not require additional pre-processing language such as HAML and SCSS.

## Installation Instructions
After cloning the repository, run `npm install` in the NodeJS CLI from the repository's local root folder to install the required packages from package.json.

### Build & Deploy
No build is necessary for HTML changes.

For CSS changes, run a gulp build, using the command `gulp`.

The design system site automatically updates when Git commits are synced to GitHub.
