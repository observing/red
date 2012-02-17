/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.com>
 * MIT Licensed
 */

var Transport = require('./transport');

/**
 * The inital response that needs to be send to the browser.
 *
 * Please note that the overal bytesize of this template should be above 256
 * B so if the server fails for some obsecure reason, we still send enough data
 * to the client so it can continiue parsing the page as it has received enough
 * information to `sniff` the template for a valid Content-Type declaration.
 *
 * The current template is: 341B
 *
 * @SEE http://code.google.com/p/browsersec/wiki/Part2#Survey_of_content_sniffing_behaviors
 *
 * @type {Buffer}
 * @api private
 */

var template = new Buffer([
    '<!doctype html>'
  , '<html>'
  ,   '<head>'
  ,     '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />'
  ,     '<meta http-equiv="X-UA-Compatible" content="IE=edge" />'
  ,   '</head>'
  ,   '<body>'
  ,   '<script>'
  ,     'document.domain = document.domain;'
  ,     'function R (data) { parent.RED.receiver(data, document); }'
  ,     'window.onload = function onload () { parent.RED.receiver.unload() };'
  ,   '</script>'
].join(''));

/**
 * A HTMLFile based transport, this only works in IE6 because it should be
 * loaded using the ActiveX htmlfile extension which allows us to stream data in
 * an iframe without triggering a loading spinner.
 *
 * @constructor
 * @param {Engine} engine
 * @param {HTTP.ServerResponse} response
 * @param {Object} options
 * @api public
 */

function HTMLFile () {
  Transport.apply(this, arguments);

  // set the defaults for this transport
  this.name = 'HTMLFile';
}

HTMLFile.prototype.__proto__ = Transport.prototype;

/**
 * Initialize the transport.
 *
 * @param {HTTP.ServerRequest} request
 * @param {HTTP.ServerResponse} response
 * @api public
 */

HTMLFile.prototype.initialize = function initialize (request, response) {
  if (this.receive.apply(this, arguments)) return;

  var headers = {
        'Content-Type': 'text/html; charset=UTF-8'
      , 'Connection': 'Keep-Alive'
      , 'Cache-Control': 'no-cache, no-store'
      , 'Transfer-Encoding': 'chunked'
      , 'X-XSS-Protection': '0'
    };

  this.response.writeHead(200, headers);
  this.response.write(template);

  Transport.prototype.initialize.apply(this, arguments);
};

/**
 * Write to the actual established connection.
 *
 * @param {String} message
 * @returns {Boolean} successfull write
 * @api private
 */

HTMLFile.prototype.write = function write (message) {
  return this.response.write('<script>R(' + JSON.stringify(message) + ')</script>');
};

/**
 * Expose the transport.
 */

module.exports = HTMLFile;
