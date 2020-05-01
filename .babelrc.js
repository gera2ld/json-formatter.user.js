module.exports = {
  extends: require.resolve('@gera2ld/plaid/config/babelrc-base'),
  presets: [
  ],
  plugins: [
    // JSX
    '@babel/plugin-transform-react-jsx',
  ].filter(Boolean),
};
