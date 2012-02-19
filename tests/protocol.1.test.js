describe('Protocol.1', function () {
  var Protocol = Protocols['1'];

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

  });

  describe('#decode', function () {

  });

  describe('#stream', function () {

  });
});
