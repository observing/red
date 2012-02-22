/**
 * Patches to the Node.js core prototypes to make it easier to work with certain
 * inconsistencies across the different modules or just to reduce the amount of
 * work you would need to do get some high quality information.
 */

var http = require('http')
  , request = http.IncomingMessage.prototype;

/**
 * Add a uniform interface for IP address detection in Node.js
 *
 * @api private
 */

request.__defineGetter__('remote', function ip () {
  var connection = this.connection
    , headers = this.headers
    , socket = connection.socket;

  // return early if we are behind a reverse proxy
  if (headers['x-forwarded-for']) {
    return {
        ip: headers['x-forwarded-for']
      , port: headers['x-forwarded-port']
    };
  }

  // regular HTTP servers
  if (connection.remoteAddress) {
    return {
        ip: connection.remoteAddress
      , port: connection.remotePort
    };
  }

  // in node 0.4 the remote address for https servers was in a different
  // location
  if (socket.remoteAddress) {
    return {
        ip: socket.remoteAddress
      , port: socket.remotePort
    };
  }

  // last possible location..
  return {
      ip: this.socket.remoteAddress || '0.0.0.0'
    , port: this.socket.remotePort || 0
  };
});

/**
 * SSL connection detection, for those of us who use SSL termnination with stud,
 * stunnel or NGINX.
 *
 * @api private
 */

request.__defineGetter__('secured', function secured () {
  var headers = this.headers;

  return !!this.socket.encrypted
    || !!headers.orgin.match(/https/)
    || headers['x-forwarded-proto'] === 'https';
});
