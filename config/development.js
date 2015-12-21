module.exports = {
  animation: {
    timeout: 210,
  },
  classes: {
    item: 'items__item item',
    editing: 'item--edit-in-progress',
    hidden: 'item--hidden',
    complete: 'item--completed',
    text: 'item__text',
    button: {
      complete: 'item__complete',
      delete: 'item__delete',
    },
  },
  database: {
    version: 1,
    name: 'colists',
  },
  debug: true,
  socket: {
    url: 'http://localhost:3001',
  },
  server: {
    host: process.env.HOST || 'localhost',
    port: process.env.PORT || 3001,
  },
  mongodb: {
    uri: process.env.MONGOLAB_URI || 'mongodb://localhost/colists',
  },
};
