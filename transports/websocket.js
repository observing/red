var Transport = require('./transport');

function WebSocket () {
  Transport.apply(this, arguments);

  // set the defaults for this transport
  this.name = 'WebSocket';
  this.specification = 'hixi';
}

WebSocket.prototype.__proto__ = Transport.prototype;

module.exports = WebSocket;
