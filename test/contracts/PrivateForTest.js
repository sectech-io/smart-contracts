'use strict';

import testUtils from '../support/truffle.test.utils';
import consts from '../support/consts';

var RevertTest = artifacts.require("./RevertTest.sol");

var mlog = require("mocha-logger");

contract('PrivateForTest', function(accounts) {
  describe("Test Revert", function() {
    it("should be able to revert in private contract ", async function () {
      let revertContract = await RevertTest.new({privateFor: ['QfeDAys9MPDs2XHExtc84jKGHxZg/aj52DTh0vtA3Xc=']});
      await testUtils.assertThrows(revertContract.revertFunction({privateFor: ['QfeDAys9MPDs2XHExtc84jKGHxZg/aj52DTh0vtA3Xc=']}));
    });
  });
})