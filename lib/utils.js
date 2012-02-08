var _ = require('underscore')._
  , crypto = require('crypto');

var RED = exports = {};

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

  return crypted + cipher.final('hex');
};

/**
 * Decrypt the value with the given key.
 *
 * @param {String} key
 * @param {String} value
 * @returns {String} decrypted string
 * @api public
 */

RED.decrypt = function decrypt (key, value) {
  var decipher = crypto.createDecipher('aes-256-cbc', key  || '')
    , decrypted = decipher.update(value, 'hex', 'UTF-8');

  return decrypted + decipher.final('UTF-8');
};
