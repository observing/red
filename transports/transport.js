var EventEmitter = require('events').EventEmitter
  , EventReactor = require('eventreactor')
  , _ = require('underscore')._;

function Transport (engine, response, options) {
  // defaults
  this.sessionid = 0;
  this.connectionid = 0;

  this.count = 0;
  this.name = 'Transport';
  this.specification = 0;

  // does this transport needs to receive custom heartbeats
  this.heartbeats = true;
  this.heartbeatInterval = 20;
  this.inactivity = 20;

  _.extend(this, options || {});

  this.engine = engine;
  this.response = res;
  this.socket = this.response.socket;

  // don't buffer anything
  this.socket.setTimeout(0);
  this.socket.setNoDelay(true);
}

Transport.prototype.__proto__ = EventEmitter.prototype;

/**
 * Send a message, which is send to the engine under the hood because we have no
 * idea if this user was still online
 *
 * @param {String} message
 * @api public
 */

Transport.prototype.send = function send (message) {
  this.count++;
  this.engine.publish(message);
};

/**
 * Write to the transport.
 *
 * @param {Buffer} buffer
 * @api private
 */

Transport.prototype.write = function write (buffer) {
  this.response.write(buffer);
};

/**
 * Initialize the transport.
 *
 * @param {HTTP.ServerRequest} req
 * @api public
 */

Transport.prototype.initialize = function initialize (req) {

  this.backlog();
};

/**
 * Process the message backlog.
 *
 * @api private
 */

Transport.prototype.backlog = function backlog () {
  var self = this;

  this.engine.backlog(this.sessionid, function history (err, messages) {
    if (err) return;
    if (!messages || !messages.length) return;

    self.write(messages);
  });
};

/**
 * Check if all messages have been flushed and destroys the transport once this
 * done.
 *
 * @api public
 */

Transport.prototype.end = function end () {
  if (this.socket._pendingWriteReqs === 0) return this.destroy();

  var self = this;
  this.socket.either('drain', 'end', 'close', function either () {
    self.destroy();
  });
};

/**
 * Destory the connection.
 *
 * @api private
 */

Transport.prototype.destroy = function destory () {
  this.removeAllListeners();
  this.removeReference();

  this.engine.expire(this.id, this.inactivity);
};
