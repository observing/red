/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.com>
 * MIT Licensed
 */

var Transport = require('./transport');

function WebSocket () {
  Transport.apply(this, arguments);

  // set the defaults for this transport
  this.name = 'WebSocket';
  this.specification = 'hixi';
}

WebSocket.prototype.__proto__ = Transport.prototype;

/**
 * Expose the transport.
 */

module.exports = WebSocket;
