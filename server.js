'use strict';

var http = require('http'),
    express = require('express'),
    app = express(),
    reporting = express();

var PORT = 2000;

app.use('/reporting', reporting);

var server = http.createServer(app);

var jsreport = require('jsreport')({
  express: {
    app: reporting,
    server: server
  }
}).init().then(function() {
  server.listen(PORT);
  console.log('Server started at', PORT);
});