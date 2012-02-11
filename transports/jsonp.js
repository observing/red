var Transport = require('./transport');

function JSONP () {
  Transport.apply(this, arguments);

  // set the defaults for this transport
  this.name = 'JSONP';
}

JSONP.prototype.__proto__ = Transport.prototype;

module.exports = JSONP;
