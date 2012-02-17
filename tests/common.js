/**!
 * RED
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.com>
 * MIT Licensed
 */

/**
 * Expose globals that we would be using in most of the test suites.
 */

RED = require('../');
Engine = require('../lib/engine');
request = require('request');

/**
 * Helper tools
 */

var portnumbers = 10000;
global.__defineGetter__('TESTPORT', function port () {
  return ++portnumbers;
});
