/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.com>
 * MIT Licensed
 */

describe('engine.js', function () {
  it('should export as a function', function () {
    Engine.should.be.a('function');
  });

  it('should initialize without any issues', function () {
    var engine = new Engine();
  });

  it('should be an instance of EventEmitter', function () {
    var engine = new Engine();

    if (!(engine instanceof process.EventEmitter)) {
      should.fail('should be an EventEmitter');
    }
  });

  it('is configurable using an option object', function () {
    var defaults = new Engine()
      , customized = new Engine({
            namespace: 'pewpew'
          , hostname: 'hostname'
        });

      // should be the values that we set
      customized.namespace.should.equal('pewpew');
      customized.hostname.should.equal('hostname');

      // but they should not equal as the defaults
      customized.namespace.should.not.equal(defaults.namespace);
      customized.hostname.should.not.equal(defaults.hostname);

      // doesn't override the port
      customized.port.should.equal(defaults.port);
  });

  describe('#connect', function (next) {
    it('should connect successfully, and fire done callback', function (next) {
      var engine = new Engine();

      engine.connect(function done (err) {
        engine.close();
        next();
      });
    });

    it('should emit a `connect` event on successfull connection', function (next) {
      var engine = new Engine();

      engine.connect();

      engine.once('connect', function connect () {
        engine.close();
        next();
      });
    });

    it('should emit an `connect failed` event on a failed connection', function (next) {
      var engine = new Engine({
          hostname: 'wtftrololol'
      });

      engine.on('error', function () {});
      engine.once('connect failed', function (err) {
        err.message.should.equal('Failed to establish a connection');

        engine.close();
        next();
      });

      engine.connect();
    });
  });

  describe('#forEach', function () {
    it('should set the context of the function', function () {
      var engine = new Engine();

      engine.forEach(function (key) {
        this.should.equal(engine);
      });
    });

    it('should send keys of existing client properties', function () {
      var engine = new Engine();

      engine.forEach(function (key) {
        key.should.be.a('string');

        if (!(key in engine)) should.fail(key + ' does not exist');
      });
    });
  });

  describe('#async', function () {
    it('should call the function 2x before activing the callback', function (next) {
      var engine = new Engine()
        , async = engine.async(2, next);

      async();
      async();
    });

    it('should only call the function once', function (next) {
      var engine = new Engine()
        , async = engine.async(2, next)
        , i = 100;

      while (i--) async();
    });

    it('sends multipe errors', function (next) {
      var engine = new Engine()
        , async = engine.async(2, function (errors) {
            errors.length.should.equal(2);

            next();
          });

      async(new Error('oi'));
      async(new Error('oi'));
    });

    it('sends multiple responses', function (next) {
      var engine = new Engine()
        , async = engine.async(2, function (errors, results) {
            results.length.should.equal(2);

            next();
          });

      async(null, 'oi');
      async(null, 'oi');
    });
  });

  describe('#pub/sub', function () {
    it('should emit a `subscribe:` event', function (next) {
      var engine = new Engine();

      engine.connect();

      engine.on('connect', function () {
        engine.subscribe('channel', function () {});

        engine.on('subscribe:channel', function () {
          next();
          engine.close();
        });
      });
    });

    it('should send subscribtion count in `subscribe:` event', function (next) {
      var engine = new Engine();

      engine.connect();

      engine.on('connect', function () {
        engine.subscribe('channel', function () {});

        engine.on('subscribe:channel', function (count) {
          count.should.be.a('number');
          count.should.be.above(0);

          next();
          engine.close();
        });
      });
    });

    it('receives pub/sub messages it sends it self', function (next) {
      var engine = new Engine();

      engine.connect();

      engine.on('connect', function () {
        engine.subscribe('mine', function (msg) {
          msg.should.equal('pewpew');

          next();
          engine.close();
        });

        engine.on('subscribe:mine', function () {
          engine.publish('mine', 'pewpew');
        });
      });
    });

    it('receives pub/sub messages from others', function (next) {
      var sub = new Engine()
        , pub = new Engine()
        , connect = sub.async(2, function () {
            sub.subscribe('multi', function (msg) {
              msg.should.equal('hi from pub');

              next();
              sub.close();
              pub.close();
            });

            sub.on('subscribe:multi', function () {
              pub.publish('multi', 'hi from pub');
            });
          });

      sub.connect();
      pub.connect();

      sub.on('connect', connect);
      pub.on('connect', connect);
    });

    it('only receives messages from the subscribed channel', function (next) {
      var engine = new Engine()
        , subscribe = engine.async(5, function () {
            engine.publish('1', '1');
            engine.publish('2', '2');
            engine.publish('3', '3');
            engine.publish('4', '4');
            engine.publish('5', '5');
          });

      engine.connect();

      engine.on('connect', function () {
        engine.subscribe('5', function (msg) {
          msg.should.equal('5');

          setTimeout(function () {
            next();
            engine.close();
          }, 10);
        });

        engine.subscribe('4', function () {});
        engine.subscribe('3', function () {});
        engine.subscribe('2', function () {});
        engine.subscribe('1', function () {});

        engine.on('subscribe:1', subscribe);
        engine.on('subscribe:2', subscribe);
        engine.on('subscribe:3', subscribe);
        engine.on('subscribe:4', subscribe);
        engine.on('subscribe:5', subscribe);
      });
    });

    it('does not receive pub/sub from different namespaces', function (next) {
      var sub = new Engine({ namespace: 'sub' })
        , sub2 = new Engine({ namespace: 'sub2' })
        , message = sub.async(2, function () {
            next();
            sub.close();
            sub2.close();
          })
        , connect = sub.async(2, function () {
            sub.subscribe('common', function (msg) {
              msg.should.equal('hi from sub');
              message();
            });

            sub.on('subscribe:common', function () {
              sub.publish('common', 'hi from sub');
            });

            sub2.subscribe('common', function (msg) {
              msg.should.equal('hi from sub2');
              message();
            });

            sub2.on('subscribe:common', function () {
              sub2.publish('common', 'hi from sub2');
            });
          });

      sub.connect();
      sub2.connect();

      sub.on('connect', connect);
      sub2.on('connect', connect);
    });

    it('should unsubscribe from events', function (next) {
      var engine = new Engine();

      function subscribe (msg) {
        msg.should.equal('sub');

        engine.unsubscribe('unsub', subscribe);

        engine.once('unsubscribe:unsub', function () {
          engine.publish('unsub', 'wub');
          engine.publish('unsub', 'wub');

          next();
          engine.close();
        });
      }

      engine.connect();

      engine.on('connect', function () {
        engine.subscribe('unsub', subscribe);
        engine.once('subscribe:unsub', function () {
          engine.publish('unsub', 'sub');
        });
      });
    });
  });

  describe('#handshake', function () {
    var key = Date.now();

    it('should set a handshake', function (next) {
      var engine = new Engine()
        , id = Date.now();

      engine.connect();

      engine.on('connect', function () {
        engine.handshake(id, 'test', function (err) {
          engine.close();
          next(err);
        });
      });
    });

    it('should get a handshake', function (next) {
      var engine = new Engine()
        , id = Date.now();

      engine.connect();

      engine.on('connect', function () {
        engine.handshake(id, 'testing', function (err) {
          if (err) return next(err);

          engine.handshake(id, function (err, data) {
            data.should.equal('testing');

            engine.close();
            next(err);
          });
        });
      });
    });

    it('should be able to set handshake without callback', function (next) {
      var engine = new Engine()
        , id = Date.now();

      engine.connect();

      engine.on('connect', function () {
        engine.handshake(id, 'test');

        setTimeout(function () {
          engine.handshake(id, function (err, data) {
            data.should.equal('test');

            engine.close();
            next(err);
          });
        }, 100);
      });
    });
  });

  describe('#authenticated', function () {
    var key = Date.now();

    it('should set a authentication', function (next) {
      var engine = new Engine()
        , id = Date.now();

      engine.connect();

      engine.on('connect', function () {
        engine.authenticated(id, true, function (err) {
          engine.close();
          next(err);
        });
      });
    });

    it('should get a authentication', function (next) {
      var engine = new Engine()
        , id = Date.now();

      engine.connect();

      engine.on('connect', function () {
        engine.authenticated(id, true, function (err) {
          if (err) return next(err);

          engine.authenticated(id, function (err, data) {
            data.should.be.a('boolean');

            engine.close();
            next(err);
          });
        });
      });
    });

    it('should be able to set authentication without callback', function (next) {
      var engine = new Engine()
        , id = Date.now();

      engine.connect();

      engine.on('connect', function () {
        engine.authenticated(id, false);

        setTimeout(function () {
          engine.authenticated(id, function (err, data) {
            data.should.be.a('boolean');

            engine.close();
            next(err);
          });
        }, 100);
      });
    });
  });

  describe('#push and #pull\'ing', function () {
    it('should be able to push data in to a backlog', function (next) {
      var engine = new Engine()
        , id = Date.now();

      engine.connect();

      engine.on('connect', function () {
        engine.push(id, 'message', function (err) {
          engine.close();
          next(err);
        });
      });
    });

    it('should be able to push an array of data in to the backlog', function (next) {
      var engine = new Engine()
        , id = Date.now();

      engine.connect();

      engine.on('connect', function () {
        engine.push(id, ['message1', 'message2'], function (err) {
          engine.close();
          next(err);
        });
      });
    });

    it('should pull the stored messages', function (next) {
      var engine = new Engine()
        , id = Date.now();

      engine.connect();

      engine.on('connect', function () {
        engine.push(id, 'pewpew', function (err) {
          if (err) return next(err) + engine.close();

          engine.pull(id, function (err, data) {
            if (err) return next(err) + engine.close();

            data.should.have.length(1);
            data[0].should.equal('pewpew');

            engine.close();
            next();
          });
        });
      });
    });

    it('should pull a maximum of 100 messages at once', function (next) {
      var engine = new Engine()
        , id = Date.now();

      engine.connect();

      engine.on('connect', function () {
        var data = []
          , amount = 150;

        while (amount--) data.push('key - ' + amount);

        engine.push(id, data, function (err) {
          if (err) return next(err) + engine.close();

          engine.pull(id, function (err, data) {
            if (err) return next(err) + engine.close();

            data.should.have.length(100);

            engine.close();
            next();
          });
        });
      });
    });

    it('should remove the pushed messages with #pull', function (next) {
      var engine = new Engine()
        , id = Date.now();

      engine.connect();

      engine.on('connect', function () {
        var data = []
          , amount = 150
          , last;

        while (amount--) data.push('keys - ' + amount);

        engine.push(id, data, function (err) {
          if (err) return next(err) + engine.close();

          engine.pull(id, function (err, data) {
            if (err) return next(err) + engine.close();

            data.should.have.length(100);
            last = data.pop();

            engine.pull(id, function (err, data) {
              if (err) return next(err) + engine.close();

              data.should.have.length(50);

              var first = data.shift();
              last.should.not.equal(first);

              engine.close();
              next();
            });
          });
        });
      });
    });

    it('should also work when there are no keys stored to pull from', function (next) {
      var engine = new Engine()
        , id = Date.now();

      engine.connect();

      engine.on('connect', function () {
        engine.pull(id, function (err, data) {
          if (err) return next(err) + engine.close();

          data.should.have.length(0);

          engine.close();
          next();
        });
      });
    });
  });
});
