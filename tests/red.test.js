/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
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
        var red = RED.Server.HTTP({});

        if (!(red instanceof require('http').Server)) {
          should.fail('not a valid HTTP instance');
        }
      });

      it('configures a default request handler', function () {
        var red = RED.Server.HTTP({})
          , handler = red.listeners('request');

        handler.should.have.length(1);
        handler.pop().should.be.a('function');
      });

      it('returns a uninitialized server', function (next) {
        var red = RED.Server.HTTP({});

        red.listen(TESTPORT, function (err) {
          red.close();
          next(err);
        });
      });

      it('returns a status 404 and noindex by default', function (next) {
        var port = TESTPORT
          , red = RED.Server.HTTP({});

        red.listen(port, function (err) {
          if (err) return next(err);

          request.get('http://localhost:' + port, function (err, res, body) {
            res.statusCode.should.equal(404);
            res.headers['x-robots-tag'].indexOf('noindex').should.be.above(-1);
            res.headers['x-powered-by'].indexOf('RED').should.be.above(-1);

            red.close();
            next(err);
          });
        });
      });

      it('can be configured for 302 redirects', function (next) {
        var port = TESTPORT
          , red = RED.Server.HTTP({
                redirect: 'http://www.google.com/'
            });

        red.listen(port, function (err) {
          if (err) return next(err);

          request.get({
                followRedirect: false
              , uri: 'http://localhost:' + port
            }
            , function (err, res, body) {
                res.statusCode.should.equal(302);
                res.headers.location.should.equal('http://www.google.com/');
                res.headers['x-powered-by'].indexOf('RED').should.be.above(-1);

                red.close();
                next(err);
              }
          );
        });
      });

      it('can also be configured for HTTPS', function () {
        var red = RED.Server.HTTP({
            key: require('fs').readFileSync(__dirname + '/ssl/red-key.pem')
          , cert: require('fs').readFileSync(__dirname + '/ssl/red-cert.pem')
        });

        if (!(red instanceof require('https').Server)) {
          should.fail('not a valid HTTPS instance');
        }
      });

      it('HTTPS server works the same as the same server', function (next) {
        var port = TESTPORT
          , red = RED.Server.HTTP({
                key: require('fs').readFileSync(__dirname + '/ssl/red-key.pem')
              , cert: require('fs').readFileSync(__dirname + '/ssl/red-cert.pem')
            });

        red.listen(port, function (err) {
          if (err) return next(err);

          request.get('https://localhost:' + port, function (err, res, body) {
            res.statusCode.should.equal(404);
            res.headers['x-robots-tag'].indexOf('noindex').should.be.above(-1);
            res.headers['x-powered-by'].indexOf('RED').should.be.above(-1);

            red.close();
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
        var red = RED.createServer();

        if (!(red instanceof RED.Server)) {
          should.fail('Not an RED.Server instance');
        }
      });
    });
  });
});

describe('RED', function () {
  describe('~ constructing', function () {
    it('can generate a RED server without additional options', function () {
      RED.createServer();
    });

    it('accepts and applies an options argument', function () {
      var red = RED.createServer({
          namespace: 'foo'
        , secret: 'hi'
      });

      red.namespace.should.equal('foo');
    });
  });

  describe('#set', function () {
    it('sets properties of RED', function () {
      var red = RED.createServer();

      red.namespace.should.equal('RED');
      red.set('namespace', 'foo');

      red.namespace.should.equal('foo');
    });

    it('only sets propertiest that already existed', function () {
      var red = RED.createServer();

      if (red.pewpew) should.fail('property already exited');
      red.set('pewpew', 'pang');

      if (red.pewpew) should.fail('should not do this');
    });

    it('should emit a event when you update a setting', function (next) {
      var red = RED.createServer();

      red.on('set:namespace', function namespacing (old, value, key) {
        key.should.equal('namespace');
        old.should.equal('RED');
        value.should.equal('pew');

        next();
      });

      red.set('namespace', 'pew');
    });

    it('should be chainable', function () {
      var red = RED.createServer();

      red.set('namespace', 'pew').should.equal(red);
      red.set('pewpew', 'pang').should.equal(red);
    });
  });

  describe('#configure', function () {
    var env = process.env.NODE_ENV;

    it('should always call the callback if no env argument is given', function (next) {
      var red = RED.createServer();

      red.configure(next);
    });

    it('sets the context of the function to `this`', function (next) {
      var red = RED.createServer();

      red.configure(function () {
        this.should.equal(red);
        next();
      });
    });

    it('should only call the function if the env variable matches NODE_ENV', function (next) {
      var red = RED.createServer()
        , calls = 0;

      function done () {
        if (++calls >= 2) next();
      }

      red.configure('adfsdfsadfasdfasdfsdf', done);
      red.configure(env, done);
      red.configure(done);
    });

    it('should be chainable', function (next) {
      var red = RED.createServer()
        , calls = 0;

      function done () {
        if (++calls >= 3) next();
      }

      red.configure('adfsdfsadfasdfasdfsdf', done).should.equal(red);
      red.configure(env, done).should.equal(red);
      red.configure(done).should.equal(red);

      // one extra done call, to ensure that all equal statements are executed
      // before continue to the next test
      done();
    });
  });

  describe('#blacklisted', function () {
    it('blacklists `error` by default', function () {
      var red = RED.createServer();

      red.blacklisted('error').should.equal(true);
    });

    it('blacklists all RED namespaced events by default', function () {
      var red = RED.createServer();

      red.blacklisted('RED:bananas').should.equal(true);
    });

    it('blacklists all namespace prefixed events by default', function () {
      var red = RED.createServer({
          namespace: 'foo'
      });

      red.blacklisted('foo:bananas').should.equal(true);
    });

    it('should use the configurable blacklist', function () {
      var red = RED.createServer({
          blacklist: ['foo', 'bar']
      });

      red.blacklisted('mew').should.equal(false);
      red.blacklisted('foo').should.equal(true);
      red.blacklisted('bar').should.equal(true);
    });

    it('doesnt blacklist other names', function () {
      var red = RED.createServer();

      red.blacklisted('bananas').should.equal(false);
    });
  });
});
