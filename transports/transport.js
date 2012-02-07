var EventEmitter = require('events').EventEmitter

function Transport (redis, response) {
  this.redis = redis;
  this.response = res;
  this.socket = this.response.socket;
  this.count = 0;
  this.name = 'Unkown';
  this.specification = 0;

  this.socket.setTimeout(0);
  this.socket.setNoDelay(true);
}

Transport.prototype.__proto__ = EventEmitter.prototype;

Transport.prototype.write = function write () {
  this.count++;
};

Transport.prototype.initialize = function initialize () {

};

Transport.prototype.end = function end () {

};

/**
 * Destory the connection.
 *
 * @api private
 */

Transport.prototype.destroy = function destory () {
  this.removeAllListeners();
  this.deReference();
};
