/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.com>
 * MIT Licensed
 */

var EventEmitter = require('events').EventEmitter;

/**
 * The protocol.
 *
 * @constructor
 * @param {Function} encode JavaScript encoder
 * @param {Function} decode JavaScript decoder
 * @api public
 */

function Protocol (encode, decode) {
  this.queue = '';

  this.encode = encode || JSON.stringify;
  this.decode = decode || JSON.parse;
}

Protocol.prototype.__proto__ = EventEmitter.prototype;

/**
 * Encode the message.
 *
 * @param {String} type
 * @param {Mixed} data
 * @returns {String}
 */

Protocol.prototype.encode = function encode (type, data) {

};

/**
 * Decode the messages.
 *
 * @param {String} message
 * @api public
 */

Protocol.prototype.decode = function decode (message) {
  this.queue += message.toString('UTF-8');
  this.parse();
};

/**
 * Parse the queued data.
 *
 * @api private
 */

Protocol.prototype.parse = function parse () {

};

/**
 * Flush the queue
 *
 * @api public
 */

Protocol.prototype.flush = function flush () {
  this.queue = '';
};

/**
 * Expose the protocol parser.
 */

module.exports = Protocol;
