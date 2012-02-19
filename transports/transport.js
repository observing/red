/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.com>
 * MIT Licensed
 */

var EventEmitter = require('events').EventEmitter
  , EventReactor = require('eventreactor')
  , _ = require('underscore')._;

/**
 * Transportation base class.
 *
 * @constructor
 * @param {Engine} engine
 * @param {HTTP.ServerResponse} response
 * @param {Object}
 * @api public
 */

function Transport (engine, response, options) {
  // defaults
  this.sessionid = 0;
  this.connectionid = 0;

  this.count = 0;
  this.name = 'Transport';
  this.specification = 0;

  // does this transport needs to receive custom heartbeats
  this.heartbeats = true;
  this.heartbeatInterval = 20;
  this.inactivity = 20;

  // restrictions
  this.maxiumBuffer = 38400;

  // protocol parser
  this.protocol = null;

  _.extend(this, options || {});

  this.engine = engine;
  this.response = res;
  this.socket = this.response.socket;

  // don't buffer anything
  this.socket.setTimeout(0);
  this.socket.setNoDelay(true);

  // add default finish event listener
  this.response.on('finish', this.destroy);
}

Transport.prototype.__proto__ = EventEmitter.prototype;

/**
 * Send a message, which is send to the engine under the hood because we have no
 * idea if this user was still online
 *
 * @param {String} message
 * @api public
 */

Transport.prototype.send = function send (message) {
  this.count++;

  var self = this;
  this.engine.push(this.connectionid, message, function backlog (err, messages) {
    self.engine.publish(self.connectionid, message);
  });
};

/**
 * Write to the actual established connection.
 *
 * @param {String} message
 * @returns {Boolean} successfull write
 * @api private
 */

Transport.prototype.write = function write (message) {
  return this.response.write(message);
};

/**
 * Initialize the transport.
 *
 * @param {HTTP.ServerRequest} request
 * @param {HTTP.ServerResponse} response
 * @api public
 */

Transport.prototype.initialize = function initialize (request, response) {
  this.backlog();
};

/**
 * Accepts POST requests
 *
 * @param {HTTP.ServerRequest} requests
 * @param {HTTP.ServerResponse} response optional
 * @api private
 */

Transport.prototype.receive = function receive (requests, response) {
  if (request.method !== 'POST') return false;

  // make sure we have a response, as we need to answer the pull request, so
  // this is either a new transport with
  response = response || this.response;

  var body = ''
    , self = this;

  /**
   * process the post requests, but make sure we limit the maxium amount of data
   * they can upload to prevent DDOS attack with large uploads.
   *
   * @param {Buffer} chunk
   * @api private
   */

  function posting (chunk) {
    if (requests.socket.bytesRead >= self.maxiumBuffer) {
      requests.removeListener('data', posting);
      requests.removeListener('end', done);

      return requests.connection.destroy();
    }

    body += chunk;
  }

  /**
   * Handle completed posts.
   *
   * @api private
   */

  function done () {
    self.emit('data', body);
    body = ''; // dereference

    if (response) {
      response.writeHead(200, {
          'Content-Type': 'application/json; charset=UTF-8'
        , 'Connection': 'keep-alive'
        , 'Cache-Control': 'no-cache, no-store'
      });
      response.end('OK');
    }
  }

  response.on('data', posting);
  response.on('end', done);

  return true;
};

/**
 * Process the message backlog.
 *
 * @api private
 */

Transport.prototype.backlog = function backlog () {
  var self = this;

  this.engine.pull(this.sessionid, function history (err, messages) {
    if (err) return;
    if (!messages || !messages.length) return;

    self.write(messages);
  });
};

/**
 * Check if all messages have been flushed and destroys the transport once this
 * done.
 *
 * @api public
 */

Transport.prototype.end = function end () {
  if (this.socket._pendingWriteReqs === 0) return this.destroy();

  var self = this;
  this.socket.either('drain', 'end', 'close', function either () {
    self.destroy();
  });
};

/**
 * Destory the connection.
 *
 * @api private
 */

Transport.prototype.destroy = function destory () {
  // check if we need to answer the response, if the request is answered there
  // will be a finished flag set, @see node http:
  // https://github.com/joyent/node/blob/master/lib/http.js#L764
  if (!this.response.finished) {
    // did we set the statusCode already?
    if (!this.response.statusCode) {
      this.response.statusCode = 200;
    }

    // do we need to add a content-type
    if (!this.response.getHeader('content-type')) {
      this.response.setHeader('Content-Type', 'application/json');
    }

    try { this.response.end(); }
    catch (e) {}
  }

  // clean up eventlisteners
  this.removeAllListeners();
  this.response.removeAllListeners();
  this.socket.removeAllListeners();

  this.engine.expire(this.id, this.inactivity);
};

/**
 * Simple helper function for answering requests with HTTP access control.
 *
 * @SEE https://developer.mozilla.org/En/HTTP_Access_Control
 *
 * @param {HTTP.ServerRequest} requests
 * @param {Object} headers
 * @api private
 */

Transport.accessControl = function accessControl (requests, headers) {
  var origin = req.headers.origin;

  headers['Access-Control-Allow-Origin'] = origin;
  headers['Access-Control-Allow-Credentials'] = 'true';
};

/**
 * Expose the transport.
 */

module.exports = Transport;
