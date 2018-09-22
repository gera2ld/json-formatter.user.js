module.exports = {
  root: true,
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
    'no-mixed-operators': 'off',
    'arrow-parens': 'off',
    'no-plusplus': 'off',
    'no-param-reassign': 'off',
    'consistent-return': 'off',
    'no-console': ['warn', {
      allow: ['error', 'warn', 'info'],
    }],
    'no-bitwise': ['error', { int32Hint: true }],
    'import/prefer-default-export': 'off',
    indent: ['error', 2, { MemberExpression: 0 }],
    'react/jsx-uses-react': 'error',
    'react/react-in-jsx-scope': 'error',
  },
  settings: {
    'import/resolver': {
      'babel-module': {},
    },
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
