'use strict';

import testUtils from '../support/truffle.test.utils';

var CreditRegistry = artifacts.require("./CreditRegistry.sol");

var mlog = require("mocha-logger");

contract('CreditRegistry', function(accounts) {

  before(async () => {
      await testUtils.initTestEnv(accounts[9]);
    }
  );

  describe("Register CreditLine", function() {
    it("should be able to register creditline", async function() {

      let creditReg = await testUtils.createAndInitWithContract(CreditRegistry, [], accounts[0]);
      let data = await testUtils.createCreditLine(accounts);
      let creditLine = data.creditLine;
      mlog.log("Registering CreditLine");
      await creditReg.registerCreditLine(data.lender, data.borrower, creditLine.address, {from: data.lenderAccount});

      mlog.log("Verifying result");
      let receivedCreditLines = await creditReg.getReceivedCreditLines(data.borrower);
      assert.equal(receivedCreditLines.length, 1);
      assert.equal(receivedCreditLines[0], creditLine.address);

      let grantedCreditLines = await creditReg.getGrantedCreditLines(data.lender);
      assert.equal(grantedCreditLines.length, 1);
      assert.equal(grantedCreditLines[0], creditLine.address);
    });
  });

  describe("Register Loan", function() {
    it("should be able to register creditline", async function() {
      let creditReg = await testUtils.createAndInitWithContract(CreditRegistry, [], accounts[0]);
      let data = await testUtils.createLoan(accounts);
      let loan = data.loan;
      mlog.log("Registering Loan");
      let now = Date.now();
      await creditReg.registerLoan(data.lender, loan.address, now, {from: data.lenderAccount});

      mlog.log("Verifying result");
      let transfers = await creditReg.getLoanTransfers(loan.address);

      mlog.log("result", JSON.stringify(transfers));
      let from = transfers[0];
      let to = transfers[1];
      let timestamp = transfers[2];
      let blocktime = transfers[3];

      assert.equal(from.length, 1);
      assert.equal(to.length, 1);
      assert.equal(timestamp.length, 1);
      assert.equal(blocktime.length, 1);

      assert.equal(from[0], 0);
      assert.equal(to[0], data.lender);
      assert.equal(timestamp[0], now);
      assert(blocktime[0] > 1);
    });
  });
})