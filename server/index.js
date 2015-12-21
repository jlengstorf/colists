'use strict';

/*
 * This loads config data from a file in the `config` folder. It starts by
 * looking for a file that matches the current `NODE_ENV` before trying
 * `default.js`.
 */
const config = require('getconfig');

// Load the rest of the dependencies for the app.
const io = require('socket.io');

const handleListEvents = require('./list');
const server = require('./server');

const debug = require('debug')('server/index');

/*
 * Almost all of this server's functionality is built on the back of Socket.IO.
 * The app listens for events sent by connected users, performs the required
 * actions, saves the state, and relays information to connected peers.
 */
io(server).on('connection', handleListEvents);

// Start up a server on the specified port.
server.listen(config.server.port, () => {
  debug(`listening on *:${config.server.port}`);
});
