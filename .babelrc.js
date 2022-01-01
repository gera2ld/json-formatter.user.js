module.exports = {
  extends: require.resolve('@gera2ld/plaid/config/babelrc-base'),
  presets: [
  ],
  plugins: [
    ['@babel/plugin-transform-react-jsx', {
      pragma: 'VM.hm',
      pragmaFrag: 'VM.Fragment',
    }],
  ].filter(Boolean),
};
