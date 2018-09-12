const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const log = require('fancy-log');
const rollup = require('rollup');
const del = require('del');
const babel = require('rollup-plugin-babel');
const replace = require('rollup-plugin-replace');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');
const precss = require('precss');
const cssModules = require('postcss-modules');
const cssnano = require('cssnano');
const pkg = require('./package.json');

const DIST = 'dist';
const IS_PROD = process.env.NODE_ENV === 'production';
const values = {
  'process.env.VERSION': pkg.version,
  'process.env.NODE_ENV': process.env.NODE_ENV || 'development',
};
const USE_CSS_MODULES = false;
const cssExportMap = {};
const postcssPlugins = [
  precss(),
  autoprefixer(),
  USE_CSS_MODULES && cssModules({
    getJSON(id, json) {
      cssExportMap[id] = json;
    },
  }),
  IS_PROD && cssnano(),
].filter(Boolean);

const getRollupPlugins = ({ babelConfig, browser } = {}) => [
  {
    transform(code, id) {
      if (path.extname(id) !== '.css') return;
      return postcss(postcssPlugins).process(code, { from: id })
      .then(result => {
        const classMap = cssExportMap[id];
        return [
          `export const css = ${JSON.stringify(result.css)};`,
          classMap && `export const classMap = ${JSON.stringify(classMap)};`,
        ].filter(Boolean).join('\n');
      });
    },
  },
  babel({
    exclude: 'node_modules/**',
    ...browser ? {
      // Combine all helpers at the top of the bundle
      externalHelpers: true,
    } : {
      // Require helpers from '@babel/runtime'
      runtimeHelpers: true,
      plugins: [
        '@babel/plugin-transform-runtime',
      ],
    },
    ...babelConfig,
  }),
  replace({ values }),
  resolve(),
  commonjs(),
];
const getExternal = (externals = []) => id => {
  return id.startsWith('@babel/runtime/') || externals.includes(id);
};

const rollupConfig = [
  {
    input: {
      input: 'src/index.js',
      plugins: getRollupPlugins({ browser: false }),
      external: getExternal(),
    },
    output: {
      format: 'cjs',
      file: `${DIST}/index.user.js`,
    },
  },
];

function clean() {
  return del(DIST);
}

function buildJs() {
  return Promise.all(rollupConfig.map(config => {
    return rollup.rollup(config.input)
    .then(bundle => bundle.write(config.output));
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
