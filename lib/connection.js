"use strict";

/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

/**
 * Library dependencies.
 */

var _ = require('lodash');

/**
 * Cached prototype lookups, speeding up references.
 */

var slice = Array.prototype.slice
  , pushit = Array.prototype.push;

/**
 * Represation of the actual connection inside RED.
 *
 * @constructor
 * @param {Object}
 * @api public
 */

function Connection (options) {
  // these props should always be provided during initialization
  this.protocol = null;
  this.engine = null;
  this.sessionid = null;
  this.connectionid = null;
  this.rules = {};

  _.extend(this, options);
}

/**
 * The message that get send in a minute should only be received by the
 * following sessions.
 *
 * It can either receive an array or a batch of arguments.
 *
 * @param {Array} list list of session ids
 * @returns {Connection}
 * @api public
 */

Connection.prototype.to = function to (list) {
  if (!this.rules.to) this.rules.to = [];

  pushit.apply(this.rules.to, Array.isArray(list)
    ? list
    : arguments
  );

  return this;
};

/**
 * The message that get send in a minute should NOT be received the following
 * sessions.
 *
 * It can either receive an array or a batch of arguments.
 *
 * @param {Array} list list of session ids
 * @returns {Connection}
 * @api public
 */

Connection.prototype.not = function not (list) {
  if (!this.rules.not) this.rules.not = [];

  pushit.apply(this.rules.not, Array.isArray(list)
    ? list
    : arguments
  );

  return this;
};

/**
 * Send a regular message to the server.
 *
 * @api public
 */

Connection.prototype.send = function send (message) {
  var type = typeof message === 'string' ? 'message' : 'codec'
    , encoded = this.protocol.encode(type, {
          message: message
      });

  this.write(encoded);
  return this;
};

/**
 * Emit an event to the user.
 *
 * @param {String} name event name
 * @param {Arguments} .. arguments for the event
 * @returns {Connection}
 * @api public
 */

Connection.prototype.emit = function emit (name) {
  var args = slice.call(arguments, 0).slice(1)
    , encoded = this.protocol.encode('event', {
          name: name
        , args: args
      });

  this.write(encoded);
  return this;
};

/**
 * Write the message out to the engine.
 *
 * @TODO handle failed pushes and publishes
 * @param {Number} attempt attempt of writing
 * @api public
 */

Connection.prototype.write = function write (encoded, attempt) {
  var self = this
    , rules = this.rules;

  // reset the rules again, as it's used
  this.rules = {};

  this.engine.push(this.sessionid, encoded, function push (err, size) {
    if (err) return false;

    self.engine.publish('channel', {
        sessionid: this.sessionid
      , rules: Object.keys(rules).length
          ? rules
          : undefined
    });
  });
};

/**
 * Disconnect this user.
 *
 * @returns {Connection}
 * @api public
 */

Connection.prototype.disconnect = function disconnect () {
  return this;
};

/**
 * Get the handshake details for this user.
 *
 * @param {Function} fn
 * @returns {Connection}
 * @api public
 */

Connection.prototype.handshake = function handshake (fn) {
  this.engine.handshake(this.sessionid, fn.bind(this));

  return this;
};

/**
 * Expose the connection.
 */

module.exports = Connection;
