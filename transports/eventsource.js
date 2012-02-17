/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.com>
 * MIT Licensed
 */

var Transport = require('./transport');

/**
 * @constructor
 * @param {Engine} engine
 * @param {HTTP.ServerResponse} response
 * @param {Object} options
 * @api public
 */

function EventSource () {
  Transport.apply(this, arguments);

  // set defaults for this transport
  this.name = 'EventSource';
  this.specification = 0;
}

EventSource.prototype.__proto__ = Transport.prototype;

/**
 * Initialize the transport.
 *
 * @param {HTTP.ServerRequest} request
 * @param {HTTP.ServerResponse} response
 * @api public
 */

EventSource.prototype.initialize = function initialize (request, response) {
  if (this.receive.apply(this, arguments)) return;

  var headers = {
        'Content-Type': 'text/event-stream; charset=UTF-8'
      , 'Connection': 'keep-alive'
      , 'Cache-Control': 'no-cache, no-store'
      , 'Transfer-Encoding': 'chunked'
    };

  // older version of the EventSource require a different encoding, this is only
  // for early Opera version, as opera was the first to implement it in Opera 9.6
  if (this.specification === 0) {
    headers['Content-Type'] = 'application/x-dom-event-stream; charset=UTF-8';
  }

  // check if need to validate the HTTP access control
  if (request.headers.origin) Transport.accessControl(request, headers);

  this.response.writeHead(200, headers);
  this.response.write('\r\n');

  Transport.prototype.initialize.apply(this, arguments);
};

/**
 * Write to the actual established connection.
 *
 * @param {String} message
 * @returns {Boolean} successfull write
 * @api private
*/

EventSource.prototype.write = function write (message) {
  var response = this.specification === 5
    ? 'data:' + message + '\n\n'
    : 'Event: RED\ndata: ' + message + '\n\n';

  return this.response.write(response);
};

/**
 * Expose the transport.
 */

module.exports = EventSource;
