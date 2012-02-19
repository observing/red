/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.com>
 * MIT Licensed
 */

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
  , Transports = require('./transports')
  , Protocol = require('./protocol')
  , util = require('./utils');

/**
 * References, and common used functions
 */

var slice = Array.prototype.slice
  , ok = function ok () {
      var args = slice.call(arguments, 0)
        , fn = args.pop();

      if (typeof fn === 'function') return fn(undefined, true);
      fn(true);
    };

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
  this.orgin = ok;
  this.authorization = ok;
  this.subdomain = util.subdomain;

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
 * Set options.
 *
 * @param {String} key
 * @param {Mixed} value
 * @returns {RED}
 * @api public
 */

RED.prototype.set = function set (key, value) {
  var old = this[key];

  this[key] = value;
  this.emit('set:' + key, old, value, key);

  return this;
};

/**
 * Configure callbacks.
 *
 * @param {String} env environment for this config
 * @param {Function} fn
 * @returns {RED}
 * @api public
 */

RED.prototype.configure = function (env, fn) {
  if (typeof env === 'function') {
    env.call(this);
  } else if (env === process.env.NODE_ENV) {
    fn.call(this);
  }

  return this;
};

/**
 * Start listening for HTTP requests.
 *
 * @param {Mixed} http
 * @param {Object} options
 * @param {Function} fn
 * @returns {RED}
 * @api public
 */

RED.prototype.listen = function listen (http, options, fn) {
  var self = this
    , request = this.request.bind(this)
    , port;

  if (typeof options === 'function') {
    fn = options;
    options = null;
  }

  if (typeof http === 'number') port = http;

  this.server = port ? RED.HTTP(options) : http;

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
  if (port) this.server.listen(port);

  return this;
};

/**
 * Error handler
 *
 * @param {String} desc
 * @param {Error} err
 * @returns {RED}
 * @api private
 */

RED.prototype.error = function error (desc, err) {
  if (this.logger) this.logger.error(desc, err);

  return this.emit('RED:error', err, desc);
};

/**
 * Checks if the given request is ours, or meant for a different server.
 *
 * @param {HTTP.ServerRequest} request
 * @returns {Boolean}
 * @api private
 */

RED.prototype.ours = function ours (request) {
  // fastest failing cases first, host headers are required so we can parse
  // out a connection id, and it needs to match our endpoint so we know that
  // request was meant for us
  if (!request.headers.host) return false;
  if (!this.endpoint.test(request.url)) return false;
};

/**
 * This request should not be handled by us, but by the developer.
 *
 * @returns {RED}
 * @api private
 */

RED.prototype.theirs = function theirs () {
  var listeners = this.requestListeners
    , args = arguments;

  for (var i = 0, l = listeners.length; i < l; i++) {
    listeners[i].apply(this.server, args);
  }

  return this;
};

/**
 * Generate some data from the request which can be used to initiate a transport
 * and provide us with enought information to authenticate the user if needed.
 *
 * @param {HTTP.ServerRequest} request
 * @returns {Object}
 * @api private
 */

RED.parsePath = /^\/([^\/]+)\/?([^\/]+)?\/?([^\/]+)?\/?$/;
RED.prototype.generate = function generate (request) {
  var url = url.parse(request.url, true)
    , paths = request.pathname.replace(this.endpoint, '').match(RED.parsePath);

  return {
      epoch: Date.now()
    , headers: request.headers || {}
    , query: url.query || {}
    , protocol: +paths[1]
    , transport: paths[2]
    , session: paths[3]
    , secured: request.secured
    , ip: request.remote.ip
    , id: request.headers.host.split('.').shift()
  };
};

/**
 * Handles incomming requests.
 *
 * @param {HTTP.ServerRequest} requests
 * @param {Mixed} response {HTTP.ServerResponse} or {Net.Socket}
 * @param {Buffer} head required for websockets, optional for other
 * @returns {RED}
 * @api private
 */

RED.prototype.request = function incomingRequest (request, response, head) {
  if (!this.ours(request)) return this.theirs.apply(this, arguments);

  var self = this
    , data = this.generate(request)
    , websocket = arguments.length === 3;

  // check for supported protocols
  if (!Protocol[data.protocol]) {
    return this.invalid(request, response, 'unsupported protocol');
  }

  // this is a returning user, so we need to re-validate their session
  if (data.session) {
    if (!util.id.test(this.secret, data.session, data)) {
      return this.invalid(request, response, 'invalid session');
    }

    this.engine.authenticated(data.session, function authorized (err, valid) {
      if (err) return self.invalid(request, response, 'authorization error');
      if (!valid) return self.invalid(request, response, 'authorization failed');

      self.transport(data, request, response, head);
    });

    return this;
  }

  /**
   * @TODO we need to handle websocket connections here.
   * @TODO we might want to answer the JSONP handshake's callback with the error
   */

  this.authorized(data, function authorized (err, valid) {
    if (err) return self.invalid(request, response, 'authorization error');
    if (!valid) return self.invalid(request, response, 'authorization failed');

    self.handshake(request, response, data);
  });

  return this;
};

/**
 * Handshake with the server.
 *
 * @param {HTTP.ServerRequest} request
 * @param {HTTP.ServerResponse} response
 * @param {Object} data
 * @return {RED}
 * @api public
 */

RED.prototype.handshake = function handshake (request, response, data) {
  // we don't want to store these keys as they where only used for auth
  delete data.id;

  // store the handshake
  this.engine.handshake(data.session, data);

  // answer the thingy
  this.JSONP(data, response, protocol[data.protocol].handshake(data));
  return this;
};

/**
 * Handles transport answering.
 *
 * @param {Object} data
 * @param {HTTP.ServerRequest} request
 * @param {HTTP.ServerResponse} response
 * @param {Buffer} header optional
 * @returns {RED}
 * @api private
 */

RED.prototype.transport = function transport (data, request, response, head) {
  if (this.transports[data.id]) {
    // we can re-use the old transport for POST requests, as a request and
    // response might be received by the same process, we cannot close the
    // existing transport or create a new one, as it would override our
    // receiving tranport.
    if (request.method !== 'POST') {
      this.transports[data.id].close();
      delete this.transports[data.id];
    } else {
      this.transports[data.id].initialize(request, response);
      return this;
    }
  }

  // initialize the connection
  this.transports[data.id] = new Transports[data.transport](this.engine, response, {
      sessionid: data.session
    , connectionid: data.id
    , specification: data.query.callback || +data.query.specification || 0
    , protocol: new Protocol[data.protocol]
  });

  // initialize the request
  this.transports[data.id].initialize(request);
  return this;
};

/**
 * Answer the request with a JSONP styled response.
 *
 * @param {Object} request
 * @param {HTTP.ServerResponse} response
 * @param {String} body
 * @returns {RED}
 * @api public
 */

RED.prototype.JSONP = function JSONP (request, response, body) {
  body = request.query.callback + '(' + body + ');';

  var length = Buffer.isBuffer(body)
    ? body.length
    : Buffer.byteLenght(body);

  response.setHeader('Content-Type', 'text/javascript; charset=UTF-8');
  response.setHeader('Content-Length', length);
  response.statusCode = response.statusCode || 200;

  // we need to wrap all write or end's in a try catch block because node can
  // thrown an error here
  try { response.end(body); }
  catch (e) {}

  return this;
};

/**
 * Make it as an invalid response.
 *
 * @TODO handle JSONP calls
 * @param {HTTP.ServerRequest} request
 * @param {HTTP.ServerResponse} response
 * @param {String} type
 * @returns {RED}
 * @api private
 */

RED.invalid = {
    'authorization error': 500
  , 'authorization failed': 401
  , 'unsupported protocol': 404
};

RED.prototype.invalid = function invalid (request, response, type) {
  response.statusCode = RED.invalid[type.toLowerCase()];
  response.addHeader('Content-Type', 'text/plain');
  response.end(type);

  return this;
};

/**
 * Authorization function.
 *
 * @param {Function}
 * @returns {RED}
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
 * @returns {RED}
 * @api public
 */

RED.prototype.authorized = function authorized (data, fn) {
  var session = util.generate(this.secret, data)
    , self = this;

  // store the session id in the data
  data.session = session;

  if (!this.authorization) this.engine.authenticated(session, true, fn);

  // use the provided authorization function to see if the user is allowed to
  // connect
  this.authorization(data, function auth (err, authorized) {
    if (err) return fn(err);
    if (!authorized) return fn(undefined, authorized);

    self.engine.authenticated(session, true, fn);
  });

  return this;
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
 * @returns {RED}
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
  return this;
};

/**
 * Send and disconnect packed to every connected user, so they will move to
 * a different server and clean up the server so it can close properly.
 *
 * @returns {RED}
 * @api public
 */

RED.prototype.exit = function exit () {
  return this;
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
 * @returns {RED}
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
 * @returns {Server}
 * @api private
 */

RED.HTTP = function http(options) {
  var server = options.key
        ? require('https').createServer(options)
        : require('http').createServer()
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
