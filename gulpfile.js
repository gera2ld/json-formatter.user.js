const gulp = require('gulp');
const log = require('fancy-log');
const rollup = require('rollup');
const del = require('del');
const { getRollupPlugins, getExternal } = require('./scripts/util');
const pkg = require('./package.json');

const DIST = 'dist';
const FILENAME = 'json-formatter';
const BANNER = false;

const external = getExternal();
const rollupConfig = [
  {
    input: {
      input: 'src/index.js',
      plugins: getRollupPlugins({ browser: true }),
    },
    output: {
      format: 'iife',
      file: `${DIST}/${FILENAME}.user.js`,
      name: 'iife',
    },
  },
];

function clean() {
  return del([DIST]);
}

function buildJs() {
  return Promise.all(rollupConfig.map(async config => {
    const bundle = await rollup.rollup(config.input);
    await bundle.write({
      ...config.output,
      ...BANNER && {
        banner: BANNER,
      },
    });
  }));
}

function wrapError(handle) {
  const wrapped = () => handle()
  .catch(err => {
    log(err.toString());
  });
  wrapped.displayName = handle.name;
  return wrapped;
}

function watch() {
  gulp.watch('src/**', safeBuildJs);
}

const safeBuildJs = wrapError(buildJs);

exports.clean = clean;
exports.build = buildJs;
exports.dev = gulp.series(safeBuildJs, watch);
