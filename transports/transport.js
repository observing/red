var EventEmitter = require('events').EventEmitter

function Transport (engine, response) {
  this.engine = engine;
  this.response = res;
  this.socket = this.response.socket;

  // defaults
  this.count = 0;
  this.name = 'Transport';
  this.specification = 0;

  // does this transport needs to receive custom heartbeats
  this.heartbeats = true;
  this.heartbeatInterval = 20;

  // don't buffer anything
  this.socket.setTimeout(0);
  this.socket.setNoDelay(true);
}

Transport.prototype.__proto__ = EventEmitter.prototype;

Transport.prototype.write = function write () {
  this.count++;
  this.engine.publish()
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
  this.removeReference();
};
