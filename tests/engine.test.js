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
    it('should send a simple pub/sub message', function (next) {
      var engine = new Engine();

      engine.connect();
      engine.on('connect', function () {
        engine.subscribe('channel', function () {
          next();
          engine.close();
        });

        engine.publish('chanel', 'pew');
      });
    });
  });
});
