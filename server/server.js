'use strict';

const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');

const debug = require('debug')('server/server');

module.exports = http.createServer((request, response) => {
  const uri = url.parse(request.url).pathname;
  let filename = path.join(__dirname, '/public/', uri);

  debug(`Requested: ${filename}`);

  fs.exists(filename, exists => {

    // If the requested URI doesn't exist or is a directory, load `index.html`.
    if (!exists || fs.statSync(filename).isDirectory()) {
      debug(`${filename} does not exist`);
      filename = path.join(__dirname, '/../public/index.html');
    }

    fs.readFile(filename, 'binary', (error, file) => {
      if (error) {
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write(error + '\n');
        response.end();
        return;
      }

      response.writeHead(200);
      response.write(file, 'binary');
      response.end();
    });
  });
});
