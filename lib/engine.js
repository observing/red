/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.com>
 * MIT Licensed
 */

/**
 * Library dependencies.
 */

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
  var self = this
    , finish = this.async(3, function finish (err, data) {
        if (err) {
          self.emit('connect failed', new Error('Failed to establish a connection'));
        } else {
          self.emit('connect');
        }

        // if we have a callback, spam it with all our arguments
        if (done) done.apply(this, arguments);
      });

  this.forEach(function each (key) {
    var client = this[key] = redis.createClient(this.port, this.hostname);

    // global error listen
    client.on('error', this.emit.bind(this, 'error'));

    // connection state listeners
    // @TODO it might be possible that the connect event is called and the error
    // event as well, so we might need to this up later
    client.once('error', finish);
    client.once('connect', finish);

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
 * Example:
 *
 * ```js
 * var engine = new Engine();
 * engine.forEach(function each (client) { .. do stuff .. });
 * ```
 *
 * @param {Function} fn
 * @api private
 */

Engine.prototype.forEach = function forEach (fn) {
  ['pub', 'sub', 'client'].forEach(fn.bind(this));
};

/**
 * A small event helper, we expect x amount of calls to the returned function,
 * once this is done, we fire off our own callback, with the possible errors.
 *
 * @param {Number} expected
 * @param {Function} fn
 * @returns {Function}
 * @api private
 */

Engine.prototype.async = function async (expected, fn) {
  var errors = []
    , results = []
    , i = 0;

  return function asyncExpected (err, data) {
    // only store the errors and results while we are within the expected
    // count, all other are pointless
    if (i++ <= expected) {
      if (err) errors.push(err);
      if (data) results.push(data);
    }

    if (i === expected) {
      fn.call(fn, errors.length ? errors : null, results);
    }
  };
};

/**
 * Subscribe to a new channel.
 *
 * Example:
 *
 * ```js
 * var engine = new Engine();
 * engine.connect();
 * engine.subscribe('channel', function channel (message, pattern) {
 *   console.log('got', message);
 * });
 * ```
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
 * Example:
 *
 * ```js
 * var engine = new Engine();
 * engine.connect();
 *
 * function channel (message, pattern) {
 *   console.log('got', message);
 * }
 *
 * engine.subscribe('channel', channel);
 * engine.unsubscribe('channel', channel);
 * ```
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

/**
 * Get all the messages in the backlog.
 *
 * @param {String} id
 * @param {Function} fn
 * @api public
 */

Engine.prototype.pull = function pull (id, fn) {
  var key = this.namespace + ':' + id + ':backlog';

  this.client.multi()
    .lrange(key, 0, 99) // get the first 100 items from the list
    .ltrim(key, 100, -1) // remove the first 100 items from the list
    .exec(function exec (err, replies) {
      if (err) return fn(err);

      fn(undefined, replies[0]);
    });
};

/**
 * Add more messages to the backlog.
 *
 * @param {String} id
 * @param {Array} messages
 * @param {Function} fn
 * @api public
 */

Engine.prototype.push = function push (id, messages, fn) {
  var key = this.namespace + ':' + id + ':backlog';
  this.client.rpush(key, messages, fn);
};

/**
 * Get or set the handshake data.
 *
 * @param {String} key
 * @param {String} value optional argument if want to set a value for the key
 * @param {Function} fn callback
 * @api public
 */

Engine.prototype.handshake = function handshake (key, value, fn) {
  var id = this.namespace + ':' + key;

  if (typeof value === 'function') {
    fn = value;

    this.client.hget(id, 'handshake', fn);
    return;
  }

  this.client.hset(id, 'handshake', value, fn);
};

/**
 * Check if a the user is authenticated.
 *
 * Example:
 *
 * ```js
 * var engine = new Engine();
 * engine.connect();
 * engine.authenticated('id', function auth (err, authenticated) {
 *   if (err) return console.error(err);
 *
 *   console.log('authenticated:', authenticated);
 * });
 *
 * engine.authenticated('id', true, function auth (err) {
 *   if (err) return console.error(err);
 *
 *   console.log('storing was a great success');
 * });
 * ```
 *
 * @param {String} key
 * @param {String} value optional argument if want to set a value for the key
 * @param {Function} fn callback
 * @api public
 */

Engine.prototype.authenticated = function auth (key, value, fn) {
  var id = this.namespace + ':' + key;

  if (typeof value === 'function') {
    fn = value;

    this.client.hexists(id, 'auth', function exists (err, value) {
      fn(err, !!value);
    });
    return;
  }

  this.client.hset(id, 'auth', !!value ? 1 : 0, fn);
};

/**
 * Expires a key.
 *
 * @param {String} key
 * @param {Number} seconds if 0 is supplied, we delete it instantly
 * @param {Function} fn
 * @api public
 */

Engine.prototype.expire = function expire (key, seconds, fn) {
  var id = this.namespace + ':' + key;

  if (!seconds || seconds === 0) {
    this.client.del(id, fn);
    return;
  }

  this.client.expire(key, seconds, fn);
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

  // emit subscriptions
  this.sub.on('psubscribe', function psubscribe (pattern, count) {
    var channel = pattern.replace(prefix, 'subscribe:');

    self.emit(channel, count);
  });

  this.sub.on('punsubscribe', function psubscribe (pattern, count) {
    var channel = pattern.replace(prefix, 'unsubscribe:');

    self.emit(channel, count);
  });
};

/**
 * Closes down the engine and
 *
 * @api public
 */

Engine.prototype.close = function close () {
  var errorListeners = this.listeners('error')
    , closeListeners = this.listeners('close');

  // clean up all event listeners, because we have no clue what was added, once
  // everything has been removed we restore the error and close listeners,
  // please not that this uses private node properties which might break in
  // fugure releases
  this.removeAllListeners();
  this._events.error = closeListeners;
  this._events.close = closeListeners;

  // close all the connections
  this.forEach(function each (key) {
    var client = this[key];

    if (!client) return;

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
