"use strict";

/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

var Transport = require('./transport');

/**
 * XHR long polling transport
 *
 * @constructor
 * @param {Engine} engine
 * @param {HTTP.ServerResponse} response
 * @param {Object} options
 * @api public
 */

function XHR () {
  Transport.apply(this, arguments);

  // set the defaults for this transport
  this.name = 'XHR';
}

XHR.prototype.__proto__ = Transport.prototype;

/**
 * Initialize the transport.
 *
 * @param {HTTP.ServerRequest} request
 * @param {HTTP.ServerResponse} response
 * @param {Buffer} head
 * @api public
 */

XHR.prototype.initialize = function initialize (request) {
  if (this.receive.apply(this, arguments)) return;

  var headers = {
        'Content-Type': 'text/plain; charset=UTF-8'
      , 'Connection': 'Keep-Alive'
      , 'Cache-Control': 'no-cache, no-store'
      , 'Transfer-Encoding': 'chunked'
    };

  // check if need to validate the HTTP access control
  if (request.headers.origin) Transport.accessControl(request, headers);

  this.response.writeHead(200, headers);

  Transport.prototype.initialize.apply(this, arguments);
};

/**
 * Write to the actual established connection.
 *
 * @param {String} message
 * @returns {Boolean} successfull write
 * @api private
 */

XHR.prototype.write = function write (message) {
  return this.response.end(message);
};

/**
 * Expose the transport.
 */

module.exports = XHR;
