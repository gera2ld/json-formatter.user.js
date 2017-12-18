module.exports = {
  extends: 'airbnb-base',
  env: {
    browser: true,
  },
  plugins: [
    'import'
  ],
  rules: {
    'no-use-before-define': ['error', 'nofunc'],
    'no-mixed-operators': 0,
    'arrow-parens': 0,
    'no-plusplus': 0,
    'no-param-reassign': 0,
    'consistent-return': 0,
  },
  globals: {
    GM_getValue: true,
    GM_setValue: true,
    GM_registerMenuCommand: true,
    GM_addStyle: true,
    GM_setClipboard: true,
  },
};
