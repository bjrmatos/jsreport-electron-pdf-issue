/* eslint no-var: [0] */

'use strict';

var path = require('path'),
    urlModule = require('url'),
    fs = require('fs'),
    request = require('request'),
    mime = require('mime-types'),
    CUSTOM_PROTOCOL = 'electron-html-to';

function isURLEncoded(url) {
  return decodeURIComponent(url) !== url;
}

module.exports = function (protocol, allowLocalFilesAccess, log, done) {
  /**
   * EL PUNTO ES EVITAR PASAR DE UN PROTOCOLO A OTRO
   * POR QUE LOS PROBLEMAS EMPIEZAN..
   * POR EJEMPLO SE DIO EL CASO DE QUE CON UN HTML, DEBIDO A QUE
   * SE DELEGABA LA PETICION A OTRO PROTOCOLO EL BROWSER WINDOW
   * NO EMITIA DID-FINISH-LOAD
   */

  // usar intercept file protocol o buffer (mejor por el mime) y las peticiones a cdn manejarlo manualmente con el
  // modulo request y guardarlo en un path temporal
  // testear css cargado localmente, html, javascript

  protocol.interceptBufferProtocol('file', function (request, callback) {
    var url = request.url.substr(7),
        parsedUrl = urlModule.parse(request.url, true);

    log('file protocol request for:', request.url);

    // request to the page
    if (parsedUrl.query && parsedUrl.query['ELECTRON-HTML-TO-LOAD-PAGE'] != null) {
      log('request to load the page:', url);
      resolveFileRequest(request.url, callback);
    } else if (request.url.lastIndexOf('file:///', 0) === 0 && !allowLocalFilesAccess) {
      // potentially dangerous request
      log('denying access to a file, url:', request.url);
      // Permission to access a resource, other than the network, was denied.
      // see https://code.google.com/p/chromium/codesearch#chromium/src/net/base/net_error_list.h
      callback(-10);
    } else if (request.url.lastIndexOf('file://', 0) === 0 && request.url.lastIndexOf('file:///', 0) !== 0) {
      // support cdn like format -> //cdn.jquery...
      url = 'http://' + url;
      log('handling cdn format request, url:', url);
      resolveCDNLikeRequest(url, callback);
    } else {
      log('request to load a file:', url);
      resolveFileRequest(request.url, callback);
    }
  }, function (interceptProtocolErr) {
    if (interceptProtocolErr) {
      log('electron fails to register file protocol');
      return done(interceptProtocolErr);
    }

    log('interception for file protocol register successfully');

    done(null);
  });

  function resolveFileRequest(requestedUrl, done) {
    var url = requestedUrl,
        parsedUrl,
        mimeType,
        fileBuf;

    parsedUrl = urlModule.parse(url);
    url = parsedUrl.pathname;

    if (isURLEncoded(url)) {
      url = decodeURIComponent(url);
    }

    if (process.platform === 'win32' && url.slice(0, 1) === '/') {
      url = url.slice(1);
    }

    mimeType = mime.lookup(path.extname(url)) || 'text/plain';

    log('resolving file protocol request. response file url:', url, 'mime type:', mimeType);

    if (process.platform === 'win32') {
      // when running in IISNODE electron hangs when using fs.readFile, fs.createReadStream
      // or any async API for read a file.. on normal windows + node electron consumes 100% CPU when
      // using any async file API, so the only/best option is to read the file in a synchronous way
      try {
        fileBuf = fs.readFileSync(url);
        done({ data: fileBuf, mimeType: mimeType });
      } catch (err) {
        // A generic failure occurred.
        // see https://code.google.com/p/chromium/codesearch#chromium/src/net/base/net_error_list.h
        done(-2);
      }
    } else {
      fs.readFile(url, function (err, buf) {
        if (err) {
          // A generic failure occurred.
          // see https://code.google.com/p/chromium/codesearch#chromium/src/net/base/net_error_list.h
          return done(-2);
        }

        fileBuf = buf;
        done({ data: fileBuf, mimeType: mimeType });
      });
    }
  }

  function resolveCDNLikeRequest(requestedUrl, done) {
    var url = urlModule.parse(requestedUrl).pathname,
        mimeType = mime.lookup(path.extname(url)) || 'text/plain';

    log('resolving cnd like request:', requestedUrl, 'mime type:', mimeType);

    request({
      url: requestedUrl,
      method: 'GET',
      encoding: null // if this value is null, request will return the body as a Buffer
    }, function(err, response, body) {
      if (!err && response.statusCode == 200) {
        done({ data: body, mimeType: mimeType })
      } else {
        done(-2);
      }
    });
  }
};