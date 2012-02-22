/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.com>
 * MIT Licensed
 */

var Transport = require('./transport')
  , createHash = require('crypto').createHash
  , WS = require('ws');

function WebSocket () {
  Transport.apply(this, arguments);

  // set the defaults for this transport
  this.name = 'WebSocket';
  this.specification = 'hixi';
}

WebSocket.prototype.__proto__ = Transport.prototype;

/**
 * Initialize the transport.
 *
 * @param {HTTP.ServerRequest} request
 * @param {HTTP.ServerResponse} response
 * @param {Buffer} head
 * @api public
 */

WebSocket.prototype.initialize = function initialize (request, response, head) {
  // make sure we toLowerCase the header's content as IE 10 sends it in
  // lowercase instead of WebSocket
  if (!request.headers.upgrade
      || request.headers.upgrade.toLowerCase() !== 'websocket'
  ) {
    return this.error('Bad Request');
  }

  // find out which kind of WebSocket request this is and answer it with the
  // correct parser. The sec-websocket-version header got introduced for the
  // hybi protocol based websockets and it should be parse-able.
  if (+request.headers['sec-websocket-version']) {
    return this.hybi.apply(this, arguments);
  }

  // older drafts, like 75/76
  this.specification = 'hixie';
  return this.hixie.apply(this, arguments);
};

/**
 * Handle hybi based transports.
 *
 * @param {HTTP.ServerRequest} request
 * @param {HTTP.ServerResponse} response
 * @param {Buffer} head
 * @api private
 */

WebSocket.prototype.hybi = function hybi (request, response, head) {
  if (!request.headers['sec-websocket-key']) {
    return this.error('Bad Request');
  }

  // parseInt the number
  var version = parseInt(request.headers['sec-websocket-version'], 10)
    , protocol = request.headers['sec-websocket-protocol']
    , key = request.headers['sec-websocket-key']
    , hash;

  // ws only supports version 8 & 13
  if (version !== 8 || version !== 13) return this.error('Bad Request');

  // calculate the key response
  hash = createHash('sha1');
  hash.update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
  key = hash.digest('base64');

  var headers = [
        'HTTP/1.1 101 Switching Protocols'
      , 'Upgrade: websocket'
      , 'Connection: Upgrade'
      , 'Sec-WebSocket-Accept: ' + key
    ];

  // now that we have all data, we write a response
  if (protocol) {
    headers.push('Sec-WebSocket-Protocol: ' + protocol, '', '');
  } else {
    headers.push('', '');
  }

  // write headers to the socket
  try { response.write(headers.join('\r\n')); }
  catch (e) {
    return this.error('Error', e);
  }

  // reset the response property so we can use that as a client
  this.response = new WebSocket([request, response, head], {
      protocolVersion: version
    , protocol: protocol
  });
};

/**
 * Handle hixie based transports
 *
 * @param {HTTP.ServerRequest} request
 * @param {HTTP.ServerResponse} response
 * @param {Buffer} head
 * @api private
 */

WebSocket.hixiHeadLength = 8;
WebSocket.prototype.hixie = function hixie (request, response, head) {
  var origin = request.headers.origin
    , protocol = request.secured
        ? 'wss'
        : 'ws'
    , location = protocol + '://' + request.headers.origin + request.url
    , headers = request.headers['sec-websocket-key1']
        ? [   // hixie 76
              'HTTP/1.1 101 WebSocket Protocol Handshake'
            , 'Upgrade: WebSocket'
            , 'Connection: Upgrade'
            , 'Sec-WebSocket-Origin: ' + origin
            , 'Sec-WebSocket-Location: ' + location
          ]
        : [   // hixie 75
              'HTTP/1.1 101 Web Socket Protocol Handshake'
            , 'Upgrade: WebSocket'
            , 'Connection: Upgrade'
            , 'WebSocket-Origin: ' + origin
            , 'WebSocket-Location: ' + location
          ]
      // HA proxy compatilbity, we might not have the nonce yet.
    , waiting = !(head && head.length >= WebSocket.hixiHeadLength)
    , self = this;

  // extra padding
  headers.push('', '');

  /**
   *
   * @param {Error} err
   * @param {Buffer} head
   * @param {String} md5
   * @api private
   */

  function done (err, head, md5) {
    if (err) return self.error('Error', err);

    try {
      response.write(headers.join('\r\n'));
      response.write(md5, 'binary');
    }
    catch (e) {
      return this.error('Error', e);
    }

    // generate a client
    self.response = new WebSocket([request, response, head], {
        protocolVersion: ''
      , protocol: req.headers['sec-websocket-protocol']
    });
  }

  // we received enough of the head buffer to handle this request
  if (!waiting) {
    nonce = head.slice(0, WebSocket.hixiHeadLength);

    var extra = head.length > WebSocket.hixiHeadLength
        ? head.slice(WebSocket.hixiHeadLength)
        : null;

    return WebSocket.hixiHandshake(request.headers, nonce, extra, done);
  }

  // we need to wait for the head buffer to be send, its probably a bit late ;)
  nonce = new Buffer(WebSocket.hixiHeadLength);
  head.copy(nonce, 0);

  var received = head.length;

  response.setEncoding('binary');
  response.on('data', function downloading (data) {
    var read = Math.min(data.length, WebSocket.hixiHeadLength - received)
      , extra;

    if (read === 0) return;

    // add the received data to our headbuffer
    data.copy(nonce, received, 0, read);
    received += read;

    if (received === WebSocket.hixiHeadLength) {
      response.removeListener('data', downloading);
      response.setEncoding('utf8');

      if (read < data.length) extra = data.slice(read);

      return WebSocket.hixiHandshake(request.headers, nonce, extra, done);
    }
  });
};

/**
 * Do the hixi handshake.
 *
 * @param {Object} headers http headers
 * @param {Buffer} shake the part of the upgrade buffer that is used in the shake
 * @param {Buffer} head rest of the head
 * @param {Function} fn
 * @api private
 */

WebSocket.hixiHandshake = function hixiHandshake (headers, shake, head, fn) {
  var key1 = headers['sec-websocket-key1']
    , key2 = headers['sec-websocket-key2']
    , md5 = createHash('md5')
    , success = [key1, key2].filter(function keyparsing (key) {
        var n = parseInt(key.replace(/[^\d]/g, ''), 10)
          , spaces = key.replace(/[^ ]/g, '').length;

        if (spaces === 0 || n % spaces !== 0) return false;

        n /= spaces;

        md5.update(String.fromCharCode(
            n >> 24 & 0xFF
          , n >> 16 & 0xFF
          , n >> 8  & 0xFF
          , n       & 0xFF
        ));

        return true;
      });

  // check if we key parsing was a success
  if (success.length !== 2) return fn(new Error('Invalid WebSocket hixie key'));

  md5.update(shake.toString('binary'));
  fn(null, head, md5);
};

/**
 * Expose the transport.
 */

module.exports = WebSocket;
