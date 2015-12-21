var webpack = require('webpack');

/*
 * --------
 *  CONFIG
 * --------
 */

var BUILD_ENV = process.env.BUILD_ENV || 'development';

var deployConfig;

try {
  deployConfig = require('./deploy.config.js')[BUILD_ENV] || {};
} catch (e) {
  console.log('WARNING: No deploy.config.js found.');
  deployConfig = {
    clientConfig: 'development',
    debug: true,
  };
}

/*
 * webpack plugin to replace:
 *
 *     import config from 'config';
 *
 * with the contents of `/config/<env>.js`.
 *
 * The value of <env> is set in `./deploy.config.js` as `clientConfig`.
 */
var replaceConfig = new webpack.NormalModuleReplacementPlugin(
    /^config$/,
    __dirname + '/config/' + deployConfig.clientConfig + '.js'
);

var config = {

  debug: deployConfig.debug,
  devtool: deployConfig.debug ? 'source-map' : undefined,

  entry: {
    'app': ['./src/js/main.js'],
    'vendors': ['debug', 'socket.io-client', 'immutable', 'events'],
  },

  resolve: {
    root: 'src',
  },

  output: {
    path: __dirname + '/public/assets',
    filename: '[name].min.js',
    publicPath: '/assets/',
  },

  module: {
    preLoaders: [],

    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
      {
        test: /\.css$/,
        loader: 'style!css!postcss-loader',
      },
    ],
  },

  plugins: [
    replaceConfig,
    new webpack.optimize.CommonsChunkPlugin('vendors', 'vendors.js'),
  ],

  postcss: function () {
    return [
      require('postcss-import')(),
      require('postcss-nested'),
      require('postcss-simple-vars'),
      require('cssnext')(),
      require('cssnano')(),
    ];
  },

};

/*
 * For development, we want to run our code against a style guide checker to
 * enforce consistent, readable code. To accomplish this, we're using the
 * fantastic [JSCS](http://jscs.info/) style linter.
 */
if (deployConfig.debug) {
  config.module.preLoaders.push({
    test: /\.js$/,
    exclude: /node_modules|bower_components/,
    loader: 'jscs-loader',
  });
}

module.exports = config;
