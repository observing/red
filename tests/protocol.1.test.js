describe('Protocol.1', function () {
  var Protocol = Protocols['1']
    , JSONH = require('jsonh');

  it('should be exported as a function', function () {
    Protocol.should.be.a('function');
  });

  it('should initialize without any issues', function () {
    var parser = new Protocol();
  });

  it('should be a instance of EventEmitter', function () {
    var parser = new Protocol();

    if (!(parser instanceof process.EventEmitter)) {
      should.fail('should be an EventEmitter');
    }
  });

  describe('#encode', function () {
    it('is a function', function () {
      var parser = new Protocol();
      parser.encode.should.be.a('function');
    });

    it('encodes a simple disconnect packet', function () {
      var parser = new Protocol()
        , message = parser.encode({
              type: 'disconnect'
          });

      message.should.equal('0#1#6#');
    });

    it('should increase the message id on each encoding', function () {
      var parser = new Protocol()
        , message = parser.encode({
              type: 'disconnect'
          })
        , message2 = parser.encode({
              type: 'disconnect'
          })
        , message3 = parser.encode({
              type: 'disconnect'
          });

      message.should.equal('0#1#6#');
      message2.should.equal('0#2#6#');
      message3.should.equal('0#3#6#');
    });

    it('should increase message length', function () {
      var parser = new Protocol()
        , message = parser.encode({
              type: 'disconnect'
            , message: 'adsfds'
          });

      message.should.equal('0#1#13#adsfds');
    });

    describe("(disconnect)", function () {
      it('encodes a disconnect type without a message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'disconnect'
            });

        message.should.equal('0#1#6#');
      });

      it('encodes a disconnect type with a message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'disconnect'
              , message: 'banned'
            });

        message.should.equal('0#1#13#banned');
      });

      it('encodes a disconnect type with a unicode UTF-8 message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'disconnect'
              , message: '©®¶'
            });

        message.should.equal('0#1#9#©®¶');
      });
    });

    describe("(connect)", function () {
      it('encodes a connect type without a message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'connect'
            });

        message.should.equal('1#1#6#');
      });

      it('encodes a connect type with a message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'connect'
              , message: 'hi'
            });

        message.should.equal('1#1#8#hi');
      });

      it('encodes a connect type with a unicode UTF-8 message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'connect'
              , message: '©®¶'
            });

        message.should.equal('1#1#9#©®¶');
      });
    });

    describe("(handshake)", function () {
      it('encodes a handshake type without a message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'handshake'
            });

        message.should.equal('2#1#6#');
      });

      it('encodes a handshake type with a message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'handshake'
              , message: 'hi'
            });

        message.should.equal('2#1#8#hi');
      });

      it('encodes a handshake type with a unicode UTF-8 message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'handshake'
              , message: '©®¶'
            });

        message.should.equal('2#1#9#©®¶');
      });
    });

    describe("(heartbeat)", function () {
      it('encodes a heartbeat type without a message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'heartbeat'
            });

        message.should.equal('3#1#6#');
      });

      it('encodes a heartbeat type with a message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'heartbeat'
              , message: 'hi'
            });

        message.should.equal('3#1#8#hi');
      });

      it('encodes a heartbeat type with a unicode UTF-8 message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'heartbeat'
              , message: '©®¶'
            });

        message.should.equal('3#1#9#©®¶');
      });
    });

    describe("(codec)", function () {
      it('encodes a codec type without a message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'codec'
            });

        message.should.equal('4#1#6#');
      });

      it('encodes a codec type with a (string) message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'codec'
              , message: 'pew'
            });

        message.should.equal('4#1#12#"pew"');
      });

      it('encodes a codec type with a (number) message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'codec'
              , message: 1337
            });

        message.should.equal('4#1#10#1337');
      });

      it('encodes a codec type with a (object) message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'codec'
              , message: { foo: 'bar' }
            });

        message.should.equal('4#1#20#{"foo":"bar"}');
      });

      it('encodes a codec type with a (array) message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'codec'
              , message: [1, 2, 3, 'foo', 'bar']
            });

        message.should.equal('4#1#26#[1,2,3,"foo","bar"]');
      });

      it('encodes a codec type with a (date) message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'codec'
              , message: new Date(2012, 12, 21, 0, 0, 0)
            });

        message.should.equal('4#1#33#"2013-01-20T23:00:00.000Z"');
      });

      it('encodes a codec type with a unicode UTF-8 message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'codec'
              , message: '©®¶'
            });

        message.should.equal('4#1#12#"©®¶"');
      });

      it('can encode a codec type with different encoders', function () {
        var parser = new Protocol(JSONH.stringify, JSONH.parse)
          , message = parser.encode({
                type: 'codec'
              , message: [{a:'A'},{a:'B'}]
            });

        message.should.equal('4#1#22#[1,"a","A","B"]');
      });

      it('emits an `encode error` event when codec encoding fails', function (next) {
        var parser = new Protocol()
          , structure = { foo: 'bar' };

        parser.on('encode error', function (err, data) {
          data.should.equal(structure);

          next();
        });

        structure.bar = structure;
        parser.encode({
            type: 'codec'
          , message: structure
        });
      });
    });

    describe("(event)", function () {
      it('encodes a event without arguments', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'event'
              , name: 'foo'
            });

        message.should.equal('5#1#22#{"event":"foo"}');
      });

      it('encodes a event type with arguments', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'event'
              , name: 'foo'
              , args: [1, 2]
            });

        message.should.equal('5#1#35#{"event":"foo","args":[1,2]}');
      });

      it('encodes a event type with a unicode UTF-8 argument', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'event'
              , name: 'foo'
              , args: ['©®¶']
            });

        message.should.equal('5#1#37#{"event":"foo","args":["©®¶"]}');
      });
    });

    describe("(message)", function () {
      it('encodes a message type without a message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'message'
            });

        message.should.equal('6#1#6#');
      });

      it('encodes a message type with a message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'message'
              , message: 'hi'
            });

        message.should.equal('6#1#8#hi');
      });

      it('encodes a message type with a unicode UTF-8 message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'message'
              , message: '©®¶'
            });

        message.should.equal('6#1#9#©®¶');
      });
    });

    describe("(reset)", function () {
      it('encodes a reset type without a message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'reset'
            });

        message.should.equal('7#1#6#');
      });

      it('encodes a reset type with a message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'reset'
              , message: 'hi'
            });

        message.should.equal('7#1#8#hi');
      });

      it('encodes a reset type with a unicode UTF-8 message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'reset'
              , message: '©®¶'
            });

        message.should.equal('7#1#9#©®¶');
      });
    });

    describe('(error)', function () {
      it('encodes a error type without a message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'error'
            });

        message.should.equal('8#1#6#');
      });

      it('encodes a error type with a message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'error'
              , message: 'hi'
            });

        message.should.equal('8#1#8#hi');
      });

      it('encodes a error type with a unicode UTF-8 message', function () {
        var parser = new Protocol()
          , message = parser.encode({
                type: 'error'
              , message: '©®¶'
            });

        message.should.equal('8#1#9#©®¶');
      });
    });
  });

  describe('#decode', function () {
    it('is a function', function () {
      var parser = new Protocol();

      parser.decode.should.be.a('function');
    });

    it('decodes a simple message', function () {
      var parser = new Protocol();

      parser.decode('0#1#6#');
    });

    it('emits a `message` event when it parses a message', function (next) {
      var parser = new Protocol();

      parser.on('message', function (type, message, id, raw) {
        type.should.equal('disconnect');
        message.should.equal('');
        id.should.equal(1);
        raw.should.equal('');

        next();
      });

      parser.decode('0#1#6#');
    });

    describe('(disconnect)', function () {
      it('decodes a disconnect type without a message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('disconnect');
          message.should.equal('');
          id.should.equal(1);
          raw.should.equal('');

          next();
        });

        parser.decode('0#1#6#');
      });

      it('decodes a disconnect type with a message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('disconnect');
          message.should.equal('hi');
          id.should.equal(1);
          raw.should.equal('hi');

          next();
        });

        parser.decode('0#1#8#hi');
      });

      it('decodes a disconnect type with a UTF-8 message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('disconnect');
          message.should.equal('©®¶');
          id.should.equal(1);
          raw.should.equal('©®¶');

          next();
        });

        parser.decode('0#1#9#©®¶');
      });
    });

    describe('(connect)', function () {
      it('decodes a connect type without a message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('connect');
          message.should.equal('');
          id.should.equal(1);
          raw.should.equal('');

          next();
        });

        parser.decode('1#1#6#');
      });

      it('decodes a connect type with a message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('connect');
          message.should.equal('hi');
          id.should.equal(1);
          raw.should.equal('hi');

          next();
        });

        parser.decode('1#1#8#hi');
      });

      it('decodes a connect type with a UTF-8 message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('connect');
          message.should.equal('©®¶');
          id.should.equal(1);
          raw.should.equal('©®¶');

          next();
        });

        parser.decode('1#1#9#©®¶');
      });
    });

    describe('(handshake)', function () {
      it('decodes a handshake type without a message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('handshake');
          message.should.equal('');
          id.should.equal(1);
          raw.should.equal('');

          next();
        });

        parser.decode('2#1#6#');
      });

      it('decodes a handshake type with a message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('handshake');
          message.should.equal('hi');
          id.should.equal(1);
          raw.should.equal('hi');

          next();
        });

        parser.decode('2#1#8#hi');
      });

      it('decodes a handshake type with a UTF-8 message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('handshake');
          message.should.equal('©®¶');
          id.should.equal(1);
          raw.should.equal('©®¶');

          next();
        });

        parser.decode('2#1#9#©®¶');
      });
    });

    describe('(hearbeat)', function () {
      it('decodes a heartbeat type without a message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('heartbeat');
          message.should.equal('');
          id.should.equal(1);
          raw.should.equal('');

          next();
        });

        parser.decode('3#1#6#');
      });

      it('decodes a heartbeat type with a message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('heartbeat');
          message.should.equal('hi');
          id.should.equal(1);
          raw.should.equal('hi');

          next();
        });

        parser.decode('3#1#8#hi');
      });

      it('decodes a heartbeat type with a UTF-8 message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('heartbeat');
          message.should.equal('©®¶');
          id.should.equal(1);
          raw.should.equal('©®¶');

          next();
        });

        parser.decode('3#1#9#©®¶');
      });
    });

    describe('(codec)', function () {
      it('decodes a codec type without a message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('codec');
          message.should.eql({});
          id.should.equal(1);
          raw.should.equal('');

          next();
        });

        parser.decode('4#1#6#');
      });

      it('decodes a codec type with a (string) message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('codec');
          message.should.equal('pew');
          id.should.equal(1);
          raw.should.equal('"pew"');

          next();
        });

        parser.decode('4#1#12#"pew"');
      });

      it('decodes a codec type with a (number) message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('codec');
          message.should.equal(1337);
          id.should.equal(1);
          raw.should.equal('1337');

          next();
        });

        parser.decode('4#1#10#1337');
      });

      it('decode a codec type with a (object) message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('codec');
          message.should.eql({ foo: "bar" });
          id.should.equal(1);
          raw.should.equal('{"foo":"bar"}');

          next();
        });

        parser.decode('4#1#20#{"foo":"bar"}');
      });

      it('decodes a codec type with a (array) message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('codec');
          message.should.eql([1,2,3,"foo","bar"]);
          id.should.equal(1);
          raw.should.equal('[1,2,3,"foo","bar"]');

          next();
        });

        parser.decode('4#1#26#[1,2,3,"foo","bar"]');
      });

      it('codec a codec type with a (date) message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('codec');
          message.should.equal('2013-01-20T23:00:00.000Z');
          id.should.equal(1);
          raw.should.equal('"2013-01-20T23:00:00.000Z"');

          next();
        });

        parser.decode('4#1#33#"2013-01-20T23:00:00.000Z"');
      });

      it('decodes a codec type with a unicode UTF-8 message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('codec');
          message.should.equal('©®¶');
          id.should.equal(1);
          raw.should.equal('"©®¶"');

          next();
        });

        parser.decode('4#1#12#"©®¶"');
      });

      it('can decode a codec type with different decoders', function (next) {
        var parser = new Protocol(JSONH.stringify, JSONH.parse);

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('codec');
          message.should.eql([{a:'A'},{a:'B'}]);
          id.should.equal(1);
          raw.should.equal('[1,"a","A","B"]');

          next();
        });

        parser.decode('4#1#22#[1,"a","A","B"]');
      });

      it('emits an `decode error` event when codec decoding fails', function (next) {
        var parser = new Protocol();

        parser.on('decode error', function (err, data) {
          data.should.equal('[1,,mooo,rolol"a","A","B"]');

          next();
        });

        parser.decode('4#1#33#[1,,mooo,rolol"a","A","B"]');
      });
    });

    describe('(event)', function () {
      it('decodes a event type without arguments', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('event');
          message.should.eql({ event: 'foo' });
          id.should.equal(1);
          raw.should.equal('{"event":"foo"}');

          next();
        });

        parser.decode('5#1#22#{"event":"foo"}');
      });

      it('decodes a event type with arguments', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('event');
          message.should.eql({"event":"foo","args":[1,2]});
          id.should.equal(1);
          raw.should.equal('{"event":"foo","args":[1,2]}');

          next();
        });

        parser.decode('5#1#35#{"event":"foo","args":[1,2]}');
      });

      it('decodes a event type with a UTF-8 argument', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('event');
          message.should.eql({"event":"foo","args":["©®¶"]});
          id.should.equal(1);
          raw.should.equal('{"event":"foo","args":["©®¶"]}');

          next();
        });

        parser.decode('5#1#37#{"event":"foo","args":["©®¶"]}');
      });
    });

    describe('(message)', function () {
      it('decodes a message type without a message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('message');
          message.should.equal('');
          id.should.equal(1);
          raw.should.equal('');

          next();
        });

        parser.decode('6#1#6#');
      });

      it('decodes a message type with a message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('message');
          message.should.equal('hi');
          id.should.equal(1);
          raw.should.equal('hi');

          next();
        });

        parser.decode('6#1#8#hi');
      });

      it('decodes a message type with a UTF-8 message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('message');
          message.should.equal('©®¶');
          id.should.equal(1);
          raw.should.equal('©®¶');

          next();
        });

        parser.decode('6#1#9#©®¶');
      });
    });

    describe('(reset)', function () {
      it('decodes a reset type without a message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('reset');
          message.should.equal('');
          id.should.equal(1);
          raw.should.equal('');

          next();
        });

        parser.decode('7#1#6#');
      });

      it('decodes a reset type with a message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('reset');
          message.should.equal('hi');
          id.should.equal(1);
          raw.should.equal('hi');

          next();
        });

        parser.decode('7#1#8#hi');
      });

      it('decodes a reset type with a UTF-8 message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('reset');
          message.should.equal('©®¶');
          id.should.equal(1);
          raw.should.equal('©®¶');

          next();
        });

        parser.decode('7#1#9#©®¶');
      });
    });

    describe('(error)', function () {
      it('decodes a error type without a message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('error');
          message.should.equal('');
          id.should.equal(1);
          raw.should.equal('');

          next();
        });

        parser.decode('8#1#6#');
      });

      it('decodes a error type with a message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('error');
          message.should.equal('hi');
          id.should.equal(1);
          raw.should.equal('hi');

          next();
        });

        parser.decode('8#1#8#hi');
      });

      it('decodes a error type with a UTF-8 message', function (next) {
        var parser = new Protocol();

        parser.on('message', function (type, message, id, raw) {
          type.should.equal('error');
          message.should.equal('©®¶');
          id.should.equal(1);
          raw.should.equal('©®¶');

          next();
        });

        parser.decode('8#1#9#©®¶');
      });
    });
  });

  describe('#stream', function () {

  });
});
