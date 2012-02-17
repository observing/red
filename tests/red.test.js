/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.com>
 * MIT Licensed
 */

describe('RED.js', function () {
  it('should export the current version number', function () {
    RED.version.should.be.a('string');
    RED.version.should.match(/([0-9]+)\.([0-9]+)\.([0-9]+)/);
  });

  it('should export the current protocol number', function () {
    RED.protocol.should.be.a('number');
  });

  it('exposes the Server instance', function () {
    RED.Server.should.be.a('function');
  });

  it('exposes the createServer function', function () {
    RED.createServer.should.be.a('function');
  });

  describe('.Server', function () {
    describe('#http', function () {
      it('creates a new HTTP server instance', function () {
        var server = RED.Server.HTTP({});

        if (!(server instanceof require('http').Server)) {
          should.fail('not a valid HTTP instance');
        }
      });

      it('configures a default request handler', function () {
        var server = RED.Server.HTTP({})
          , handler = server.listeners('request');

        handler.should.have.length(1);
        handler.pop().should.be.a('function');
      });

      it('returns a uninitialized server', function (next) {
        var server = RED.Server.HTTP({});

        server.listen(TESTPORT, function (err) {
          server.close();
          next(err);
        });
      });

      it('returns a status 404 and noindex by default', function (next) {
        var port = TESTPORT
          , server = RED.Server.HTTP({});

        server.listen(port, function (err) {
          if (err) return next(err);

          request.get('http://localhost:' + port, function (err, res, body) {
            res.statusCode.should.equal(404);
            res.headers['x-robots-tag'].indexOf('noindex').should.be.above(-1);
            res.headers['x-powered-by'].indexOf('RED').should.be.above(-1);

            server.close();
            next(err);
          });
        });
      });

      it('can be configured for 302 redirects', function (next) {
        var port = TESTPORT
          , server = RED.Server.HTTP({
                redirect: 'http://www.google.com/'
            });

        server.listen(port, function (err) {
          if (err) return next(err);

          request.get({
                followRedirect: false
              , uri: 'http://localhost:' + port
            }
            , function (err, res, body) {
                res.statusCode.should.equal(302);
                res.headers.location.should.equal('http://www.google.com/');
                res.headers['x-powered-by'].indexOf('RED').should.be.above(-1);

                server.close();
                next(err);
              }
          );
        });
      });

      it('can also be configured for HTTPS', function () {
        var server = RED.Server.HTTP({
            key: require('fs').readFileSync(__dirname + '/ssl/red-key.pem')
          , cert: require('fs').readFileSync(__dirname + '/ssl/red-cert.pem')
        });

        if (!(server instanceof require('https').Server)) {
          should.fail('not a valid HTTPS instance');
        }
      });

      it('HTTPS server works the same as the same server', function (next) {
        var port = TESTPORT
          , server = RED.Server.HTTP({
                key: require('fs').readFileSync(__dirname + '/ssl/red-key.pem')
              , cert: require('fs').readFileSync(__dirname + '/ssl/red-cert.pem')
            });

        server.listen(port, function (err) {
          if (err) return next(err);

          request.get('https://localhost:' + port, function (err, res, body) {
            res.statusCode.should.equal(404);
            res.headers['x-robots-tag'].indexOf('noindex').should.be.above(-1);
            res.headers['x-powered-by'].indexOf('RED').should.be.above(-1);

            server.close();
            next(err);
          });
        });
      });
    });

    describe('#createServer', function () {
      it('is the same function as RED#createServer', function () {
        RED.Server.createServer.should.equal(RED.createServer);
      });

      it('returns a Server instance', function () {
        var server = RED.createServer();

        if (!(server instanceof RED.Server)) {
          should.fail('Not an RED.Server instance');
        }
      });
    });
  });
});
