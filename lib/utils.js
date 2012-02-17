/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.com>
 * MIT Licensed
 */

var _ = require('underscore')._
  , crypto = require('crypto');

var RED = exports;

/**
 * Encrypt the value with the given key, so it can be parsed again.
 *
 * @param {String} key
 * @param {String} value
 * @returns {String} encrypted string
 * @api public
 */

RED.encrypt = function encrypt (key, value) {
  var cipher = crypto.createCipher('aes-256-cbc', key || '')
    , crypted = cipher.update(value, 'UTF-8', 'hex');

  return escape(crypted + cipher.final('hex'));
};

/**
 * Decrypt the value with the given key.
 *
 * @param {String} key
 * @param {String} value
 * @returns {String} decrypted string on success and an empty string on failure
 * @api public
 */

RED.decrypt = function decrypt (key, value) {
  var decipher = crypto.createDecipher('aes-256-cbc', key  || '')
    , decrypted = decipher.update(unescape(value), 'hex', 'UTF-8');

  return decrypted + decipher.final('UTF-8');
};

/**
 * Generates an identifier for the client.
 *
 * @type {Object}
 * @api public
 */

RED.id = {
  /**
   * Generates the identifier based on the data gathered from the starting
   * request.
   *
   * @param {String} key
   * @param {Object} data
   * @returns {String}
   * @api public
   */

    generate: function generate (key, data) {
      return RED.encrypt(key, [
          data.ip
        , data.headers['user-agent']
        , data.headers.host

        // used to generate a random id-ish
        , data.epoch
        , this.generated++
        , process.pid
      ].join(this.seperator));
    }

    /**
     * Parses the key back to a data object.
     *
     * @param {String} key
     * @param {String} id
     * @returns {Mixed} Object on successfull parsing, or false
     * @api public
     */

  , parse: function parse (key, id) {
      var data = RED.decrypt(key, id).split(this.seperator);
      if (!data || data.length < 5) return false;

      return {
          ip: data[0]
        , headers: {
              'user-agent': data[1]
            , 'host': data[2]
          }

        // used to generate a random id-ish
        , epoch: +data[3]
        , generated: +data[4]
        , pid: +data[5]
      };
    }

  /**
   * Checks if the request belongs to the data object.
   *
   * @param {String} key
   * @param {String} id
   * @param {Object} data
   * @returns {Boolean}
   * @api public
   */

  , test: function test (key, id, data) {
      var parsed = this.parse(key, id);

      return !parsed
        ? false
        : data.id === parsed.id
          && data.headers['user-agent'] === parsed.headers['user-agent']
          && data.headers.host === parsed.headers.host;
    }

  /**
   * How many id's have we generated so far
   *
   * @type {Number}
   * @api private
   */

  , generated: 0

  /**
   * Seperator for the generated data so we can parse it back to an object
   * if needed.
   *
   * @type {String}
   * @api public
   */

  , seperator: '\n\r'
};
