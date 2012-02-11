var Engine = require('../lib/engine');

describe('engine.js', function () {
  it('should export as a function', function () {
    Engine.should.be.a('function');
  });
});
