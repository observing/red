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
  this.target = 0;

  this.writable = true;
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

  // parse the queue, so we might reduce the length of the queue because it
  // would be successfull to parse a packet
  this.parse();

  // check we have enough data to parse the queue
  if (Buffer.byteLength(this.queue) >= this.limit) {
    // now we have a decesion to make here.. are we going to call it a day, or
    // hope for little bit more data and parse the whole packet..
    var difference = this.target - this.queue.length
      , average = this.target + this.queue.length
      , percentage = (difference/average) * 100;

    // it can buffer 5 percent more if needed to parse this packet
    if (~~percentage <= 5) return true;

    this.destroy();
    return false;
  }

  return true;
};

/**
 * Check if we can dispatch a chunk of data our protocol decoder.
 *
 * @api private
 */

ProtocolStream.scan = /^\d+#\d+?#(\d+)/;
ProtocolStream.prototype.parse = function parse () {
  var self = this
    , match
    , packet;

  // if we don't have a buffer target, we need to parse it out of our queued
  // data. We want to store the target if we don't have enough, so we don't have
  // keep scanning everytime.
  if (!this.target) {
    match = this.queue.match(ProtocolStream.scan);
    if (!match || !match.length) return false; // not enouch data

    this.target = +match[1];
  }

  // not enough data buffered
  if (this.queue.length < this.target) return false;

  // extract, and decode it
  packet = this.queue.substring(0, this.target);
  this.queue = this.queue.substring(this.target);

  this.target = 0;
  this.protocol.decode(packet);

  // check if we have more data to parse because a single #write could have send
  // more than one data packet
  if (this.queue.length) {
    process.nextTick(function next () {
      // if we don't have anything to parse, and we have ended, we should
      // destroy our self
      if (!self.parse() && !self.writable) self.destroy();
    });
  } else if (!this.writable) {
    this.destroy();
  }

  return true;
};

/**
 * Completely destory all the things.
 *
 * @api public
 */

ProtocolStream.prototype.destroy = function destroy () {
  this.queue = '';

  var self = this;
  process.nextTick(function closing () {
    self.emit('close');
  });
};

/**
 * Savely kill the stream.
 *
 * @api public
 */

ProtocolStream.prototype.destroySoon = ProtocolStream.prototype.destroy;

/**
 * End the stream
 *
 * @param {Buffer} chunk
 * @api private
 */

ProtocolStream.prototype.end = function end (chunk) {
  if (chunk) {
    // if the write was successful we can do a destory, so we don't emit the
    // `close` event twice. In addition to this also check if we have something
    // in our queue, as it could be that we do more parsing
    if (this.write(chunk) && !this.queue.length) {
      this.destroy();
    }
  } else {
    // nothing to write, nothing to parse, save to close <3
    this.destroy();
  }

  this.writable = false;

  // the ProtocolStream#destroy emits a `close` event in the nextTick, so we can
  // savely call that before we emit `close` so end event comes before close as
  // required (and done by other Node.js streams)
  this.emit('end');

  return true;
};

/**
 * Expose the stream.
 */

module.exports = ProtocolStream;
