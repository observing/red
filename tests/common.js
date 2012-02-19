/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.com>
 * MIT Licensed
 */

/**
 * Expose globals that we would be using in most of the test suites.
 */

global.RED = RED = require('../');
global.Engine = Engine = require('../lib/engine');
global.Protocols = Protocols = require('../lib/protocol');

/**
 * Global dependencies
 */

global.should = should = require('should');
global.require = request = require('request');

/**
 * Helper tools
 */

var portnumbers = 10000;
global.__defineGetter__('TESTPORT', function port () {
  return ++portnumbers;
});
