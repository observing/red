/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.com>
 * MIT Licensed
 */

var Stream = require('stream');

/**
 * A streaming, pipe-able interface for the protocol parser.
 *
 * @constructor
 * @param {Protocol} protocol parser
 * @param {Number} limit buffer limit
 * @api public
 */

function ProtocolStream (protocol, limit) {
  this.queue = '';
  this.limit = limit;
  this.protocol = protocol;

  this.writeable = true;
  this.readable = false;

  Stream.call(this);
}

ProtocolStream.prototype = new Stream;
ProtocolStream.prototype.constructor = ProtocolStream;

/**
 * Recieve data from the source.
 *
 * @param {Buffer} chunk
 * @api private
 */

ProtocolStream.prototype.write = function write (chunk) {
  this.queue += chunk.toString('UTF-8');

  // check we have enough data to parse the queue
  if (Buffer.byteLength(this.queue) >= this.limit) {
    this.destroySoon();
  }
};

ProtocolStream.prototype.destroy = function destroy () {

};

ProtocolStream.prototype.destroySoon = function destroySoon () {

};

/**
 * The stream has ended.
 *
 * @param {Buffer} chunk
 * @api private
 */

ProtocolStream.prototype.end = function end (chunk) {
  if (chunk) this.write(chunk);

  this.emit('end');
};