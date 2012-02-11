var WebSocket = require('./websocket');

function FlashSocket () {
  WebSocket.apply(this, arguments);

  // set the defaults for this transport
  this.name = 'FlashSocket';
  this.specification = 'hixi';
}

FlashSocket.prototype.__proto__ = WebSocket.prototype;

module.exports = FlashSocket;
