const devConfig = require('./development');

// The only change is the socket URL
devConfig.socket.url = 'https://colists.herokuapp.com/';

module.exports = devConfig;
