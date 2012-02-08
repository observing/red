var redis = require('redis')
  , EventEmitter = require('events').EventEmitter
  , _ = require('underscore')._;

/**
 * The engine is what pushes RED to it's limits, it handles store of all the
 * data and implements pub/sub.
 *
 * @param {Object} options
 * @api public
 */

function Engine (options) {
  this.namespace = 'red';

  // connection details
  this.port = 6379;
  this.hostname = 'localhost';
  this.password = null;

  // redis connection
  this.client = null;
  this.pub = null;
  this.sub = null;

  _.extend(this, options);
}

Engine.prototype.__proto__ = EventEmitter.prototype;

/**
 * Connects the engine.
 *
 * @param {Function} done callback
 * @api public
 */

Engine.prototype.connect = function connect (done) {
  this.client = redis.createClient(this.port, this.hostname);

  // attach event listeners
  this.client.once('connect', done.bind(this));
  this.client.on('error', this.emit.bind(this, 'error'));

  // start listening for possible pub/sub events
  this.listen();

  // authenticate if needed, auth fail will be handled by the 'error' event
  if (this.password) this.client.auth(this.password);
};

/**
 * Subscribe to a new channel.
 *
 * @param {String} channel
 * @param {Function} fn
 * @api public
 */

Engine.prototype.subscribe = function subscribe (channel, fn) {
  var pattern = this.namespace + ':' + channel;

  // subscribe to a pattern based channel so we don't receive any messages that
  // where not ment for us, this allows us to use existing Redis database
  // connections without the need
  this.client.psubscribe(pattern);
  this.on(pattern, fn);
};

/**
 * Unsubscribe from a channel.
 *
 * @param {String} channel
 * @param {Function} fn
 * @api public
 */

Engine.prototype.unsubscribe = function unsubscribe (channel, fn) {
  var pattern = this.namespace + ':' + channel;

  this.client.punsubscribe(pattern);
  this.removeListener(pattern, fn);
};

/**
 * Publish a message to a channel.
 *
 * @param {String} channel
 * @param {String} message
 * @api public
 */

Engine.prototype.publish = function publish (channel, message) {
  var pattern = this.namespace + ':' + channel || '*';

  this.client.publish(pattern, message);
};

/**
 * Start listening for messages.
 *
 * @api private
 */

Engine.prototype.listen = function listen () {
  var self = this
    , prefix = this.namespace + ':';

  // start listening for patterns, and only emit them if they match our prefix
  this.client.on('pmessage', function pmessage (pattern, channel, message) {
    if (pattern.indexOf(prefix) !== 0) return;

    self.emit(channel, message, pattern);
  });
};

/**
 * Closes down the engine and
 *
 * @api public
 */

Engine.prototype.close = function close () {
  var error = this.listeners('error')
    , close = this.listeners('close');

  // clean up all event listeners
  this.removeAllListeners();
  this.client.removeAllListeners();
};
