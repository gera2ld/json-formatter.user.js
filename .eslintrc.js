module.exports = {
  extends: 'airbnb-base',
  parser: 'babel-eslint',
  parserOptions: {
    sourceType: 'module'
  },
  env: {
    browser: true,
  },
  plugins: [
    'import',
    'react',
  ],
  rules: {
    'no-use-before-define': ['error', 'nofunc'],
    'no-mixed-operators': 0,
    'arrow-parens': 0,
    'no-plusplus': 0,
    'no-param-reassign': 0,
    'consistent-return': 0,
    'no-console': ['warn', {
      allow: ['error', 'warn', 'info'],
    }],
    'no-bitwise': ['error', { int32Hint: true }],
    indent: ['error', 2, { MemberExpression: 0 }],
    'react/jsx-uses-react': 'error',
    'react/react-in-jsx-scope': 'error',
  },
  settings: {
    react: {
      pragma: 'h',
    },
  },
  globals: {
    VM: true,
    GM_getValue: true,
    GM_setValue: true,
    GM_addStyle: true,
    GM_registerMenuCommand: true,
    GM_setClipboard: true,
  },
};
