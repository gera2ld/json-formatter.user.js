module.exports = {
  root: true,
  env: {
    browser: true,
  },
  extends: 'airbnb-base',
  globals: {
    GM_addStyle: true,
    GM_getValue: true,
    GM_setValue: true,
    GM_registerMenuCommand: true,
  },
  rules: {
    'arrow-parens': ['off'],
    'no-mixed-operators': ['error', {allowSamePrecedence: true}],
    'no-use-before-define': ['error', 'nofunc'],
    'consistent-return': ['off'],
  },
};
