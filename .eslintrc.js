module.exports = {
  root: true,
  extends: [
    require.resolve('@gera2ld/plaid/eslint'),
  ],
  settings: {
    'import/resolver': {
      'babel-module': {},
    },
    react: {
      pragma: 'VM',
    },
  },
  globals: {
    VM: true,
    GM_addStyle: true,
    GM_getValue: true,
    GM_setValue: true,
    GM_setClipboard: true,
    GM_registerMenuCommand: true,
  },
  rules: {
    'no-constant-condition': 'off',
  },
};
