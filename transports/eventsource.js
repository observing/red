var Transport = require('./transport');

function EventSource () {
  Transport.apply(this, arguments);

  // set defaults for this transport
  this.name = 'EventSource';
  this.specification = 0;
}

EventSource.__proto__ = Transport.prototype;

EventSource.prototype.initialize = function initialize (request) {
  this.specification = ~request.url.indexOf('spec=5') ? 5 : 0;

  var headers = {
        'Content-Type': 'text/event-stream; charset=UTF-8'
      , 'Connection': 'keep-alive'
      , 'Cache-Control': 'no-cache, no-store'
      , 'Transfer-Encoding': 'chunked'
    };

  // older version of the EventSource require a different encoding, this is only
  // for early Opera version, as opera was the first to implement it in Opera 9.6
  if (this.specification === 0) {
    headers['Content-Type'] = 'application/x-dom-event-stream; charset=UTF-8';
  }

  this.response.writeHead(200, headers);
  this.response.write('\r\n');
};

EventSource.prototype.write = function write () {

};
