/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.com>
 * MIT Licensed
 */

/**
 * Library dependencies and cross browser compatiblity.
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
 * Streaming interface for the protocol.
 */

var ProtocolStream = require('./protocolstream');

/**
 * The protocol.
 *
 * @constructor
 * @param {Function} encode JavaScript encoder
 * @param {Function} decode JavaScript decoder
 * @api public
 */

function Protocol (encode, decode) {
  this.JSencode = encode || JSON.stringify;
  this.JSdecode = decode || JSON.parse;

  this.encoded = 0;
  this.decoded = 0;
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
  , 'reset': '7'        // reset the connection
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

  // count
  this.encoded++;

  return encoded                    // message type
    + '#'                           // - frame
    + id                            // message id
    + '#'                           // - frame
    + length                        // total message length in chars
    + '#'                           // - frame
    + message;                      // actual message
};

/**
 * Decode the messages, and emit a message event.
 *
 * @param {String} message
 * @api public
 */

Protocol.extract = /(\d+)#(\d+)?#(\d+)#(.*)/;
Protocol.prototype.decode = function decode (message) {
  message = message.toString('UTF-8');

  var data = message.match(Protocol.extract)
    , type
    , id;

  // invalid message
  if (!data) return false;

  type = Protocol.typelist[data[1]];
  id = +data[2];
  message = data[4] || '';

  switch (type) {
    case 'codec':
      data = this.decodec(message);
      if (!data) return false; // parse failed
      break;

    case 'event':
      data = this.decodec(message);
      if (!data) return false; // parse failed
      break;

    default:
      data = message;
  }

  // emit the message
  this.emit('message', type, data, id, message);

  this.decoded++;
  return true;
};

/**
 * Create a streaming decoder so we can pipe data to it
 *
 * @param {Number} limit amount of bytes we can buffer before we close
 * @api private
 */

Protocol.prototype.createStream = function createStream (limit) {
  return new ProtocolStream(this, limit);
};

/**
 * Expose the protocol parser.
 */

module.exports = Protocol;
