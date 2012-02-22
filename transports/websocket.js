/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.com>
 * MIT Licensed
 */

var Transport = require('./transport')
  , crypto = require('crypto')
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
  if (!request.headers.upgrade
      || request.headers.upgrade.toLowerCase() !== 'websocket'
  ) {
    return this.error('Bad Request');
  }

  // find out which kind of WebSocket request this is.
  if (request.headers['sec-websocket-key1']) return this.hixi.apply(this, arguments);

  // has the best support
  return this.hybi.apply(this, arguments);
};

/**
 * Handle hybi based transports
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
  var version = ~~request.headers['sec-websocket-version']
    , protocol = request.headers['sec-websocket-protocol']
    , key = request.headers['sec-websocket-key']
    , hash;

  // ws only supports version 8 & 13
  if (version !== 8 || version !== 13) return this.error('Bad Request');

  // calculate the key response
  hash = crypto.createHash('sha1');
  hash.update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
  key = hash.digest('base64');

  var headers = [
        'HTTP/1.1 101 Switching Protocols'
      , 'Upgrade: websocket'
      , 'Connection: Upgrade'
      , 'Sec-WebSocket-Accept: ' + key
    ];

  // now that we have all data, we write a response
  if (protocol) headers.push('Sec-WebSocket-Protocol: ' + protocol, '', '');
  else headers.push('', '');

  // write headers to the socket
  try { response.write(headers.join('\r\n')); }
  catch (e) {
    return this.error('Error', e);
  }

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

WebSocket.prototype.hixie = function hixie (request, response, head) {

};

/**
 * Expose the transport.
 */

module.exports = WebSocket;
