/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.com>
 * MIT Licensed
 */

var WebSocket = require('./websocket');

function FlashSocket () {
  WebSocket.apply(this, arguments);

  // set the defaults for this transport
  this.name = 'FlashSocket';
  this.specification = 'hixi';
}

FlashSocket.prototype.__proto__ = WebSocket.prototype;

/**
 * Expose the transport.
 */

module.exports = FlashSocket;
