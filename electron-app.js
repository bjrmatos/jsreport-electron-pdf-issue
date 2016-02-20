'use strict';

var path = require('path'),
    url = require('url'),
    electron = require('electron'),
    app = electron.app,
    BrowserWindow = electron.BrowserWindow,
    registerProtocol = require('./registerProtocol');

var mainWindow = null;

console.log('starting..');

function log() {
  console.log.apply(console, [].slice.apply(arguments));
}

app.on('window-all-closed', function () {
  log('exiting electron process..');
  app.quit();
});

// el problema es cuando existe custom protocol..........
// sin eso el html carga bien y emite el did-finish-load

app.on('ready', function () {
  var protocol = electron.protocol;

  log('electron process ready..');

  var browserWindowOpts =  {
    width: 1300,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      javascript: true,
      webSecurity: false,
      preload: 'D:\\workspace\\jsreport-playground\\node_modules\\jsreport-electron-pdf\\node_modules\\electron-html-to\\lib\\scripts\\preload.js'
    },
    show: true
  };

  // the issue is caused because a custom protocol
  registerProtocol(protocol, false, log, function (registrationErr) {
    if (registrationErr) {
      return app.quit();
    }

    mainWindow = new BrowserWindow(browserWindowOpts);
    var mainWindowId = mainWindow.id;

    global.windowsData = {};
    global.windowsData[mainWindowId] = {};

    mainWindow.on('closed', function () {
      log('browser-window closed..');
      mainWindow = null;
    });

    mainWindow.webContents.on('did-start-loading', function() {
      log('did start loading..');
    });

    mainWindow.webContents.on('did-stop-loading', function() {
      log('did stop loading..');
    });

    mainWindow.webContents.on('crashed', function() {
      log('crashed..');
    })

    mainWindow.webContents.on('did-fail-load', function(event, errorCode, errorDescription, validateURL) {
      log('Error loading page:' + errorCode, + ' ' + errorDescription);
    });

    mainWindow.webContents.on('dom-ready', function() {
      log('dom loaded..');
    });

    mainWindow.webContents.on('did-finish-load', function () {
      log('browser window loaded..');
      mainWindow.webContents.openDevTools();
    });

    var urlToFile = url.format({
      protocol: 'file',
      pathname: path.join(__dirname, 'simple-html.html'),
      query: {
        'ELECTRON-HTML-TO-LOAD-PAGE': true
      }
    });

    console.log(urlToFile);

    mainWindow.loadURL(urlToFile);
    mainWindow.focus();
  });
});
