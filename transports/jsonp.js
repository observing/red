/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.com>
 * MIT Licensed
 */

var Transport = require('./transport');

/**
 * JSONP (JSON with padding) based transport, it's supported by almost every
 * single browser that can execute JavaScript, making this the one of best
 * transports.
 *
 * @constructor
 * @param {Engine} engine
 * @param {HTTP.ServerResponse} response
 * @param {Object} options
 * @api public
 */

function JSONP () {
  Transport.apply(this, arguments);

  // set the defaults for this transport
  this.name = 'JSONP';
}

JSONP.prototype.__proto__ = Transport.prototype;

/**
 * Initialize the transport.
 *
 * @param {HTTP.ServerRequest} request
 * @param {HTTP.ServerResponse} response
 * @api public
 */

JSONP.prototype.initialize = function initialize (request, response) {
  if (this.receive.apply(this, arguments)) return;
};

/**
 * Write to the actual established connection.
 *
 * @param {String} message
 * @returns {Boolean} successfull write
 * @api private
 */

JSONP.prototype.write = function write (message) {
  var response = 'RED.JSONP[' + this.specification + '](' + message + ')';

  this.response.writeHead(200, {
      'Content-Type': 'text/javascript; charset=UTF-8'
    , 'Connection': 'Keep-Alive'
    , 'Cache-Control': 'no-cache, no-store'
    , 'Content-Length': Buffer.byteLength(response)
    , 'X-XSS-Protection': '0'
  });

  return this.response.write(response);
};

/**
 * Expose the transport.
 */

module.exports = JSONP;
