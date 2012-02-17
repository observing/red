/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.com>
 * MIT Licensed
 */

var utils = require('../lib/utils');

describe('utils.js', function () {
  var secret = 'key:' + Math.random();

  it('should be exported as an object', function () {
    utils.should.be.a('object');
  });

  describe('#encrypt', function () {
    it('should be a function', function () {
      utils.encrypt.should.be.a('function');
    });

    it('should encrypt a string', function () {
      var encryption = utils.encrypt(secret, 'value');

      encryption.should.be.a('string');
      encryption.should.not.equal('value');
    });
  });

  describe('#decrypt', function () {
    it('should be a function', function () {
      utils.decrypt.should.a('function');
    });

    it('can decrypt an encrypted string', function () {
      var encryption = utils.encrypt(secret, 'foo:panda')
        , decryption = utils.decrypt(secret, encryption);

      encryption.should.not.equal('foo:panda');
      decryption.should.equal('foo:panda');
    });

    it('cannot decrypt an encrypted string with a wrong password', function () {
      var encryption = utils.encrypt(secret, 'foo:panda')
        , decryption = utils.decrypt('trollol', encryption);

      decryption.should.be.a('string');
      decryption.should.not.equal('foo:panda');
      decryption.should.have.length(0);
    });
  });

  describe('.id', function () {
    var fixture = {
        ip: '127.0.0.1'
      , epoch: Date.now()
      , headers: {
            'user-agent': 'google/bot'
          , 'host': 'http://2324087070.google.com/'
        }
    };

    it('should be an object', function () {
      utils.id.should.be.a('object');
    });

    it('should have a generated count', function () {
      utils.id.generated.should.be.a('number');
    });

    it('should have a data seperator', function () {
      utils.id.seperator.should.be.a('string');
    });

    describe('#generate', function () {
      it('should generate an id based on a data object', function () {
        var id = utils.id.generate(secret, fixture);

        id.should.be.a('string');
      });

      it('should not contain any new lines', function () {
        var i = 100;

        while (i--) {
          utils.id.generate('key' + (Math.random() * i), fixture)
            .indexOf('\n\r').should.equal(-1);
        }
      });
    });

    describe('#parse', function () {
      it('should be able to parse an encrypted string', function () {
        var id = utils.id.generate(secret, fixture)
          , parsed = utils.id.parse(secret, id);

        parsed.should.be.a('object');

        parsed.ip.should.equal(fixture.ip);
        parsed.epoch.should.equal(fixture.epoch);
        parsed.headers['user-agent'].should.equal(fixture.headers['user-agent']);
        parsed.headers.host.should.equal(fixture.headers.host);
      });

      it('should not return an object when there is an invalid key', function () {
        var id = utils.id.generate(secret, fixture)
          , parsed = utils.id.parse('trololol', id);

        parsed.should.be.a('boolean');
      });
    });

    describe('#test', function () {
      var duplicate = JSON.parse(JSON.stringify(fixture));
      duplicate.headers.host = 'http://234.asdfsaf.com/';

      it('returns true on a positive match', function () {
        var id = utils.id.generate(secret, fixture)
          , match = utils.id.test(secret, id, fixture);

        match.should.a('boolean');
        if (!match) should.fail('should match with data object');
      });

      it('returns false on a failed match', function () {
        var id = utils.id.generate(secret, fixture)
          , match = utils.id.test(secret, id, duplicate);

        match.should.a('boolean');
        if (match) should.fail('should fail, got wrong data object');
      });
    });
  });
});
