var Engine = require('../lib/engine');

describe('engine.js', function () {
  it('should export as a function', function () {
    Engine.should.be.a('function');
  });

  it('should initialize without any issues', function () {
    var E = new Engine();
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

      engine.connect();

      engine.on('error', function () {});
      engine.once('connect failed', function (err) {
        engine.close();
        next();
      });
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
  });
});
