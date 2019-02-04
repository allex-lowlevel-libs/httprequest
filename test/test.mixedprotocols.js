var expect = require('chai').expect,
  checkftions = require('allex_checkslowlevellib'),
  inherit = require('allex_inheritlowlevellib'),
  objmanip = require('allex_objectmanipulationlowlevellib')(checkftions),
  functionmanip = require('allex_functionmanipulationlowlevellib')(inherit.inherit),
  request = require('..')(objmanip.traverseShallow, checkftions.isFunction, functionmanip.dummyFunc)
  ;

describe('Multiple protocol test', function () {
  it('http', function (done) {
    request('http://google.com', {
      onError: console.error.bind(console, 'error'),
      onProgress: console.log.bind(console, 'progress'),
      onComplete: function (data) {
        console.log('got', data);
        done();
      }
    });
  });
  it('https', function (done) {
    request('https://google.com', {
      onError: console.error.bind(console, 'error'),
      onProgress: console.log.bind(console, 'progress'),
      onComplete: function (data) {
        console.log('got', data);
        done();
      }
    });
  });
});
