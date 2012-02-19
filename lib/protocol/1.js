/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.com>
 * MIT Licensed
 */

var EventEmitter = this.EventEmitter || require('events').EventEmitter
  , keys = Object.keys || (function polyfill () {
      var has = Object.prototype.hasOwnProperty
        , hasDontEnumBug = !{ toString: null }.propertyIsEnumerable('toString')
        , DontEnums = [
              'toString'
            , 'toLocaleString'
            , 'valueOf'
            , 'hasOwnProperty'
            , 'isPrototypeOf'
            , 'propertyIsEnumerable'
            , 'constructor'
          ]
        , DontEnumsLength = DontEnums.length;

      /**
       * Return all the keys of the given object.
       *
       * @param {Object} o
       * @returns {Array}
       * @api public
       */

      return function keys (o) {
        if (typeof o !== 'object' && typeof o !== 'function' || o === null) {
          throw new TypeError('Object.keys called on a non-object');
        }

        var result = [];
        for (var name in o) {
          if (has.call(o, name)) {
            result.push(name);
          }
        }

        if (hasDontEnumBug) {
          for (var i = 0; i < DontEnumsLength; i++) {
            if (has.call(o, DontEnums[i])) {
              result.push(DontEnums[i]);
            }
          }
        }

        return result;
      };
    })();

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

  this.JSencode = encode || JSON.stringify;
  this.JSdecode = decode || JSON.parse;
  this.messages = 0;

  EventEmitter.call(this);
}

Protocol.prototype = new EventEmitter;
Protocol.prototype.constructor = Protocol;

/**
 * A object of all protocol types with a mapping to it's index.
 *
 * @type {Object}
 * @api private
 */

Protocol.types = {
    'disconnect': '0'   // disconnect initiated by server
  , 'connect': '1'      // successfull connection
  , 'handshake': '2'    // handshake
  , 'heartbeat': '3'    // heartbeat signal
  , 'codec': '4'        // JavaScript Object encoded with a codec
  , 'event': '5'        // event for EventEmitter
  , 'message': '6'      // simple message
  , 'reset': '7'       // reset the connection
  , 'error': '8'        // error
};

/**
 * A list of protocol types.
 *
 * @type {Array}
 * @api private
 */

Protocol.typelist = keys(Protocol.types);

/**
 * Wrap encoder in a try catch block as these operation can throw errors. If we
 * place them a different function than the actual encoder, only this part will
 * get a performance penalty from the JIT.
 *
 * @param {Mixed} data
 * @returns {String}
 */

Protocol.prototype.encodec = function encodec (data) {
  try { return this.JSencode(data); }
  catch (e) { this.emit('encode error', e, data); }

  return '';
};

/**
 * Safely decode the JavaScript, for the same reason as above.
 *
 * @param {String} data
 * @returns {Mixed}
 */

Protocol.prototype.decodec = function decodec (data) {
  try { return this.JSdecode(data); }
  catch (e) { this.emit('decode error', e, data); }

  return {};
};

/**
 * Encode the message.
 *
 * @param {Object} data
 * @returns {String}
 */

Protocol.prototype.encode = function encode (data) {
  var type = data.type
    , encoded = Protocol.types[type]
    , id = '' + (data.id || ++this.messages)
    , length
    , message;

  switch (type) {
    case 'codec':
      message = this.encodec(data.message);
      break;

    case 'event':
      message = this.encodec({ event: data.name, args: data.args });
      break;
  }

  // always default to empty if we don't have a message
  message = message || (data.message ? '' + data.message : '');

  // message length, so its easier to parse this is a combination of the message
  // length, message type length, the message id length and the total chars of
  // message frame overhead
  length = message.length + encoded.length + id.length + 3;
  length = length + ('' + length).length;

  return encoded                    // message type
    + '#'                           // - frame
    + id                            // message id
    + '#'                           // - frame
    + length                        // total message length in chars
    + '#'                           // - frame
    + message;                      // actual message
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

Protocol.regexp = /(\d+)#(\d+)?#(\d+)?#/;
Protocol.prototype.parse = function parse () {
  var data
    , type
    , id
    , length
    , message;

  while (this.queue.length) {
    data = this.queue.match(Protocol.regexp);

    // we don't have enough data yet to parse out the wire format
    // or we don't have enough data yet to splice out all the information
    if (!data || this.queue.length < +data[2]) break;

  }

  this.emit('message');
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
