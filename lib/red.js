/**
 * Library dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , EventReactor = require('eventreactor')
  , _ = require('underscore')._;

/**
 * Library modules.
 */

var Engine = require('./engine');

/**
 * References.
 */

var slice = Array.prototype.slice;

/**
 * Our RED real time communication server.
 *
 * Options:
 *
 * - `namespace` _string_ namespace for the keys and communication channel
 * - `secret` _string_ top secret key used for encrypting and decrypting
 * - `codec` _string_ codec to use for encoding / decoding packed messages
 * - `inactivity` _number_ seconds of inactivity before we kill the auth
 *
 * @constructor
 * @param {Object} options
 * @api public
 */

function RED (options) {
  this.namespace = 'RED';
  this.secret = 'secret key here';
  this.codec = 'JSON';

  // timeouts
  this.inactivity = 20;

  _.extend(this, options);

  // setup the internals based on the given details
  this.engine = new Engine({
      namespace: this.namespace
  });

  this.server = null;
  this.requestListeners = null;
}

RED.prototype.__proto__ = EventEmitter.prototype;

/**
 * Start listening for HTTP requests.
 *
 * @param {Mixed} http
 * @param {Object} options
 * @param {Function} fn
 * @api public
 */

RED.prototype.listen = function listen (http, options, fn) {
  var self = this;

  if (typeof options === 'function') {
    fn = options;
    options = null;
  }

  this.server = typeof http === 'number' ? RED.http(http, options) : http;

  // make sure our request listener is the fist and only one to be triggered so
  // we can manage the HTTP requests propagation
  this.requestListeners = this.server.listeners('request');
  this.server.removeAllListeners('request');

  // assign the event listeners
  this.server.multiple({
      'error': this.error.bind(this, 'HTTP server `error` event')
    , 'clientError': this.error.bind(this, 'HTTP server `clientError` error')
    , 'close': this.close.bind(this, true)
    , 'request': this.request.bind(this)
    , 'upgrade': this.upgrade.bind(this)
  });

  this.engine.multiple({
      'error': this.error.bind(this, 'Engine received an `error` event',)
  });

  // start booting up the server
  this.engine.connect();
};

/**
 * Error handler
 *
 * @param {String} desc
 * @param {Error} err
 * @api private
 */

RED.prototype.error = function error (desc, err) {
  this.logger && this.logger.error(desc, err);
};

/**
 * Checks if the given request is ours, or meant for a different server.
 *
 * @param {HTTP.ServerRequest} req
 * @returns {Boolean}
 * @api private
 */

RED.prototype.ours = function ours (req) {
  // fastest failing cases first
  if (!req.headers.host) return false;
  if (req.url.indexOf(this.namespace) !== 1) return false;
};

/**
 * This request should not be handled by us, but by the developer.
 *
 * @api private
 */

RED.prototype.theirs = function theirs () {
  var listeners = this.requestListeners
    , args = arguments;

  for (var i = 0, l = listeners.length; i < l; i++) {
    listeners[i].apply(this.server, args);
  }
};

/**
 * Handles incomming requests.
 *
 * @param {HTTP.ServerRequest} req
 * @param {HTTP.ServerResponse} res
 * @api private
 */

RED.prototype.request = function request (req, res) {
  var ours = this.ours(req);

  if (!ours) return this.theirs.apply(this, arguments);
};

/**
 * Handles incomming upgrade requests.
 *
 * @param {HTTP.ServerRequest} req
 * @param {Net.Socket} socket
 * @param {Buffer} head
 * @api private
 */

RED.prototype.upgrade = function upgrade (req, socket, head) {
  var ours = this.ours(req);

  if (!ours) return this.theirs.apply(this, arguments);
};

/**
 * Stops accepting new server requests and closes down the server. Emit's
 * a `close` event once it's done.
 *
 * Example:
 *
 * ```js
 * var RED = require('red').createServer();
 * RED.listen(80);
 *
 * setTimeout(function () {
 *   RED.close();
 * }, 20 * 1000);
 * ```
 *
 * @param {Boolean} cleanup http server already closed, clean up only
 * @api public
 */

RED.prototype.close = function close (cleanup) {
  var self;

  /**
   * Small helper function to clean up the server, as it might be forced upon us
   *
   * @api private
   */

  function done () {
    self.server.removeAllListeners();
    self.removeALLListeners();

    // this the last operation, once it's done we are finally done with cleaning
    // up the server
    self.engine.once('close', function engineClose () {
      self.emit('close');
    });

    self.engine.close();
  }

  // use nextTick because the close event should be triggered async
  if (cleanup) return process.nextTick(done);

  this.server.once('close', done);
  this.server.close();
};

/**
 * Mimic the HTTP api signature by using createServer to build a new RED server.
 *
 * Example:
 *
 * ```js
 * var RED = require('red').createServer();
 * ```
 *
 * @param {Object} options
 * @api public
 */

RED.createServer = function createServer (options) {
  return new RED(options || {});
};

/**
 * Generates a new HTTP server instance and assigns some default event
 * listeners.
 *
 * @param {Number} port
 * @param {Object} options
 * @api private
 */

RED.http = function http(port, options) {
  var server = options.key
        ? require('https').createServer(options)
        : require('http')
    , redirect = options.redirect;

  server.on('request', function request (req, res) {
    // build up the response
    res.setHeader('X-Powered-By', 'RED v' + exports.version);

    try {
      if (redirect) {
        res.statusCode = 302;
        res.setHeader('Location', redirect);
        return res.end();
      }

      res.statusCode = 404;
      res.end('RED> 404. That\'s an error');
    } catch (e) {}
  });

  return server;
};

/**
 * Expose our API's so it's easier for developers to extend and build upon our
 * framework.
 *
 * @api public
 */

exports.createServer = RED.createServer;
exports.Server = RED;

// version numbers
exports.version = require('../package.json').version;
exports.protocol = 1;
