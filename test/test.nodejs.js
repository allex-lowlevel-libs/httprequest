var expect = require('chai').expect,
  checkftions = require('allex_checkslowlevellib'),
  inherit = require('allex_inheritlowlevellib'),
  objmanip = require('allex_objectmanipulationlowlevellib')(checkftions),
  functionmanip = require('allex_functionmanipulationlowlevellib')(inherit.inherit),
  request = require('..')(objmanip.traverseShallow, checkftions.isFunction, functionmanip.dummyFunc)
  ;


describe('NodeJS test', function () {
  it('Download progress', function (done) {
    this.timeout(10000000);
    request('http://www.advancedinstaller.com/downloads/advinst.msi', {
      onError: console.error.bind(console, 'error'),
      onProgress: console.log.bind(console, 'progress'),
      //onData: function () {},
      onComplete: function (data) {
        console.log('downloaded', data.statusCode, data.headers, data.cookies);
      }
    });
  });
});
