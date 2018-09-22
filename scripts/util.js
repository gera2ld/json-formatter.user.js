const fs = require('fs');
const path = require('path');
const babel = require('rollup-plugin-babel');
const replace = require('rollup-plugin-replace');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const alias = require('rollup-plugin-alias');
const postcss = require('postcss');
const cssModules = require('postcss-modules');
const pkg = require('../package.json');

const values = {
  'process.env.VERSION': pkg.version,
};

const rollupPluginMap = {
  css: () => cssPlugin(),
  alias: aliases => alias(aliases),
  babel: ({ babelConfig, browser }) => babel({
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
    exclude: 'node_modules/**',
    ...babelConfig,
  }),
  replace: () => replace({ values }),
  resolve: () => resolve(),
  commonjs: () => commonjs(),
};

exports.getRollupPlugins = getRollupPlugins;
exports.getExternal = getExternal;

function getPostcssPlugins({ cssModules } = {}) {
  return [
    require('precss'),
    require('postcss-color-function'),
    require('postcss-calc'),
    cssModules && require('postcss-modules')(cssModules),
    require('cssnano'),
  ].filter(Boolean);
}

function cssPlugin() {
  const cssMap = {};
  const postcssPlugins = {
    css: getPostcssPlugins(),
    cssModules: getPostcssPlugins({ cssModules: { cssMap } }),
  };
  return {
    name: 'CSSPlugin',
    resolveId(importee, importer) {
      if (importee.endsWith('.css')) {
        return path.resolve(path.dirname(importer), `${importee}.js`);
      }
    },
    load(id) {
      if (id.endsWith('.css.js')) {
        return new Promise((resolve, reject) => {
          fs.readFile(id.slice(0, -3), 'utf8', (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
      }
    },
    transform(code, id) {
      let plugins;
      const filename = id.slice(0, -3);
      if (filename.endsWith('.module.css')) {
        plugins = postcssPlugins.cssModules;
      } else if (filename.endsWith('.css')) {
        plugins = postcssPlugins.css;
      }
      if (plugins) {
        return postcss(plugins).process(code, {
          from: filename,
          parser: require('postcss-scss'),
        })
        .then(result => {
          const classMap = cssMap[filename];
          return [
            `export const css = ${JSON.stringify(result.css)};`,
            classMap && `export const classMap = ${JSON.stringify(classMap)};`,
          ].filter(Boolean).join('\n');
        });
      }
    },
  };
}

function getRollupPlugins({ babelConfig, browser, aliases } = {}) {
  return [
    aliases && rollupPluginMap.alias(aliases),
    rollupPluginMap.css(),
    rollupPluginMap.babel({ babelConfig, browser }),
    rollupPluginMap.replace(),
    rollupPluginMap.resolve(),
    rollupPluginMap.commonjs(),
  ].filter(Boolean);
}

function getExternal(externals = []) {
  return id => id.startsWith('@babel/runtime/') || externals.includes(id);
}
