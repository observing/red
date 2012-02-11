var Transport = require('./transport');

function HTMLFile () {
  Transport.apply(this, arguments);

  // set the defaults for this transport
  this.name = 'HTMLFile';
}

HTMLFile.prototype.__proto__ = Transport.prototype;

module.exports = HTMLFile;
