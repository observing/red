var Transport = require('./transport');

/**
 * The inital response that needs to be send to the browser.
 *
 * Please note that the overal bytesize of this template should be above 256
 * B so if the server fails for some obsecure reason, we still send enough data
 * to the client so it can continiue parsing the page as it has received enough
 * information to `sniff` the template for a valid Content-Type declaration.
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
  ,   'document.domain = document.domain;'
  ,   'function R (data) { parent.RED.receiver(data, document); }'
  ,   'window.onload = function onload () { parent.RED.receiver.unload() };'
  ,   '</script>'
].join(''));

function HTMLFile () {
  Transport.apply(this, arguments);

  // set the defaults for this transport
  this.name = 'HTMLFile';
}

HTMLFile.prototype.__proto__ = Transport.prototype;

HTMLFile.prototype.initialize = function (request) {
  if (this.receive(request)) return;

  var headers = {
        'Content-Type': 'text/html; charset=UTF-8'
      , 'Connection': 'keep-alive'
      , 'Cache-Control': 'no-cache, no-store'
      , 'Transfer-Encoding': 'chunked'
  };

  this.response.writeHead(200, headers);
  this.response.write(template);

  Transport.prototype.initialize.apply(this, arguments);
};

HTMLFile.prototype.write = function write (buffer) {
  // make sure it's string as we need to wrap it
  buffer = buffer.toString('UTF-8');

  buffer = '<script>R(' + JSON.stringify(buffer) + ')</script>';
  return this.response.write(buffer);
};

module.exports = HTMLFile;
