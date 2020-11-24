const fs = require('fs');
const { getRollupPlugins } = require('@gera2ld/plaid');
const pkg = require('./package.json');

const DIST = 'dist';
const FILENAME = 'json-formatter';
const BANNER = fs.readFileSync('src/meta.js', 'utf8')
.replace('process.env.VERSION', pkg.version);

const postcssOptions = {
  ...require('@gera2ld/plaid/config/postcssrc'),
  inject: false,
  minimize: true,
};
const rollupConfig = [
  {
    input: {
      input: 'src/index.js',
      plugins: getRollupPlugins({
        browser: true,
        postcss: postcssOptions,
      }),
    },
    output: {
      format: 'iife',
      file: `${DIST}/${FILENAME}.user.js`,
      name: 'iife',
    },
  },
];

rollupConfig.forEach((item) => {
  item.output = {
    indent: false,
    ...item.output,
    ...BANNER && {
      banner: BANNER,
    },
  };
});

module.exports = rollupConfig.map(({ input, output }) => ({
  ...input,
  output,
}));
