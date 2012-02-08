var redis = require('redis')
  , EventEmitter = require('events').EventEmitter
  , _ = require('underscore')._;

/**
 * The engine is what pushes RED to it's limits, it handles store of all the
 * data and implements pub/sub.
 *
 * @constructor
 * @param {Object} options
 * @api public
 */

function Engine (options) {
  this.namespace = 'RED';

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
  this.forEach(function each (client) {
    client = redis.createClient(this.port, this.hostname);

    client.on('error', this.emit.bind(this, 'error'));

    // authenticate if needed, auth fail will be handled by the 'error' event
    if (this.password) client.auth(this.password);
  });

  // start listening for possible pub/sub events
  this.listen();
};

/**
 * Small helper function that makes it easier to iterate over all the Redis
 * connections.
 *
 * @param {Function} fn
 * @api private
 */

Engine.prototype.forEach = function forEach (fn) {
  [this.pub, this.sub, this.client].forEach(fn.bind(this))
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
  this.sub.psubscribe(pattern);
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

  this.sub.punsubscribe(pattern);
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

  this.pub.publish(pattern, message);
};

Engine.prototype.handshake = function handshake (key, value, fn) {

};

Engine.prototype.authentication = function auth (key, value, fn) {

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
  this.sub.on('pmessage', function pmessage (pattern, channel, message) {
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

  // clean up all event listeners, because we have no clue what was added, once
  // everything has been removed we restore the error and close listeners,
  // please not that this uses private node properties which might break in
  // fugure releases
  this.removeAllListeners();
  this._events.error = error;
  this._events.close = close;

  // close all the connections
  this.forEach(function each (client) {
    // remove all the connections once the client has closed down, if we remove
    // the event listeners to early we might not be able to capture error events
    client.once('end', function end () {
      client.removeAllListeners();
    });

    client.quit();
  });
};

/**
 * Expose the Engine.
 *
 * @api private
 */

module.exports = Engine;
