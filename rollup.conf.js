const fs = require('fs');
const rollup = require('rollup');
const { getRollupPlugins, getExternal, DIST } = require('./scripts/util');
const pkg = require('./package.json');

const FILENAME = 'json-formatter';
const BANNER = fs.readFileSync('src/meta.js', 'utf8')
.replace('process.env.VERSION', pkg.version);

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
