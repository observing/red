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

  this.encode = encode || JSON.stringify;
  this.decode = decode || JSON.parse;

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
    'disconnect': 0   // disconnect initiated by server
  , 'connect': 1      // successfull connection
  , 'heartbeat': 2    // heartbeat signal
  , 'codec': 3        // JavaScript Object encoded with a codec
  , 'event': 4        // event for EventEmitter
  , 'reboot': 5       // the server is rebooting
  , 'error': 6        // error
};

/**
 * A list of protocol types.
 *
 * @type {Array}
 * @api private
 */

Protocol.typelist = keys(Protocol.types);

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
