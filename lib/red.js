/**
 * Library dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , EventReactor = require('eventreactor')
  , _ = require('underscore')._
  , url = require('url');

/**
 * Library modules.
 */

var Engine = require('./engine')
  , transports = require('./transports')
  , util = require('./utils');

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
 * - `endpoint` _regexp_ RED endpoint where all request well be send to
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
  this.endpoint = /^(\/RED)\//;
  this.logger = false;
  this.orgins = '*';
  this.authorization = null;

  // timeouts
  this.inactivity = 20;

  // extend
  _.extend(this, options);

  // setup the internals based on the given details
  this.engine = new Engine({
      namespace: this.namespace
  });

  this.server = null;
  this.transports = {};
  this.requestListeners = null;
}

RED.prototype.__proto__ = EventEmitter.prototype;

/**
 * Return the connections count of this server instance.
 *
 * @returns {Number}
 * @api public
 */

RED.prototype.__defineGetter__('connections', function connections () {
  return this.server.connections;
});

/**
 * Start listening for HTTP requests.
 *
 * @param {Mixed} http
 * @param {Object} options
 * @param {Function} fn
 * @api public
 */

RED.prototype.listen = function listen (http, options, fn) {
  var self = this
    , request = this.request.bind(this);

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
    , 'request': request
    , 'upgrade': request
  });

  this.engine.multiple({
      'error': this.error.bind(this, 'Engine received an `error` event')
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
  if (this.logger) this.logger.error(desc, err);
};

/**
 * Checks if the given request is ours, or meant for a different server.
 *
 * @param {HTTP.ServerRequest} req
 * @returns {Boolean}
 * @api private
 */

RED.prototype.ours = function ours (req) {
  // fastest failing cases first, host headers are required so we can parse
  // out a connection id, and it needs to match our endpoint so we know that
  // request was meant for us
  if (!req.headers.host) return false;
  if (!this.endpoint.test(req.url)) return false;
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
 * Generate some data from the request which can be used to initiate a transport
 * and provide us with enought information to authenticate the user if needed.
 *
 * @param {HTTP.ServerRequest} req
 * @returns {Object}
 * @api private
 */

RED.parsePath = /^\/([^\/]+)\/?([^\/]+)?\/?([^\/]+)?\/?$/;
RED.prototype.generate = function gather (req) {
  var url = url.parse(req.url, true)
    , paths = req.pathname.replace(this.endpoint, '').match(RED.parsePath);

  return {
      epoch: Date.now()
    , headers: req.headers || {}
    , query: url.query || {}
    , protocol: +paths[1]
    , transport: paths[2]
    , session: paths[3]
    , secured: req.secured
    , ip: req.remote.ip
    , id: req.headers.host.split('.').shift()
  };
};

/**
 * Handles incomming requests.
 *
 * @param {HTTP.ServerRequest} req
 * @param {Mixed} res {HTTP.ServerResponse} or {Net.Socket}
 * @param {Buffer} head required for websockets, optional for other
 * @api private
 */

RED.prototype.request = function request (req, res, head) {
  if (!this.ours(req)) return this.theirs.apply(this, arguments);

  var self = this
    , data = this.generate(req)
    , websocket = arguments.length === 3;

  // this is a handshake request
  if (!data.transport && data.protocol) return this.handshake(req, res);

  // this is a returning user, so we need to re-validate their session
  if (data.session) {
    if (!util.id.test(this.secret, data.session, data)) {
      return this.invalid(req, res, 'invalid session');
    }

    this.engine.authenticated(data.session, function authorized (err, valid) {
      if (err) return self.invalid(req, res, 'authorization error');
      if (!valid) return self.invalid(req, res, 'authorization failed');

      self.transport(data, req, res, head);
    });

    return;
  }

  /**
   * @TODO we need to handle websocket connections here.
   * @TODO we might want to answer the JSONP handshake's callback with the error
   */
  this.authorized(data, function authorized (err, valid) {
    if (err) return self.invalid(req, res, 'authorization error');
    if (!valid) return self.invalid(req, res, 'authorization failed');

    self.handshake(req, res);
  });
};

RED.prototype.handshake = function handshake (req, res) {

};

RED.prototype.transport = function transport (data, req, res, head) {
  delete this.transports[data.id];
};

/**
 * Make it as an invalid response.
 *
 * @TODO handle JSONP calls
 * @param {HTTP.ServerRequest} req
 * @param {HTTP.ServerResponse} res
 * @param {String} type
 * @api private
 */

RED.invalid = {
    'authorization error': 500
  , 'authorization failed': 401
};

RED.prototype.invalid = function invalid (req, res, type) {
  res.statusCode = RED.invalid[type.toLowerCase()];
  res.addHeader('Content-Type', 'text/plain');
  res.end(type);
};

/**
 * Authorization function.
 *
 * @param {Function}
 * @api public
 */

RED.prototype.authorize = function authorize (fn) {
  if (typeof fn === 'function') this.authorization = fn;

  return this;
};

/**
 * Checks if this user should be authorized.
 *
 * @param {Object} data
 * @param {Function} fn
 * @api public
 */

RED.prototype.authorized = function authorized (data, fn) {
  var id = util.generate(this.secret, data)
    , self = this;

  if (!this.authorization) this.engine.authenticated(id, true, fn);

  // use the provided authorization function to see if the user is allowed to
  // connect
  this.authorization(data, function auth (err, authorized) {
    if (err) return fn(err);
    if (!authorized) return fn(undefined, authorized);

    self.engine.authenticated(id, true, fn);
  });
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
 * Send and disconnect packed to every connected user, so they will move to
 * a different server and clean up the server so it can close properly.
 *
 * @api public
 */

RED.prototype.exit = function exit () {

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
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
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
