'use strict';

import testUtils from '../support/truffle.test.utils';

var AssetRegistry = artifacts.require("./AssetRegistry.sol");

var mlog = require("mocha-logger");

contract('AssetRegistry', function(accounts) {

  before(async () => {
      await testUtils.initTestEnv(accounts[9]);
    }
  );

  describe("Manage Asset", function() {
    it("should be able to transfer Asset", async function() {
      let assetReg = await testUtils.createAndInitWithContract(AssetRegistry, [], accounts[0]);
      let data = await testUtils.createLoan(accounts);
      mlog.log("Registering Asset");

      let testAsset = testUtils.keccak256("assettest");
      mlog.log("Asset 1", testAsset);
      let testAsset2 = testUtils.keccak256("assettest2");
      mlog.log("Asset 2", testAsset2);
      let assets = [];
      assets.push(testAsset);
      assets.push(testAsset2);
      let txRegister = await assetReg.registerAsset(data.lender, assets, {from: data.lenderAccount});
      mlog.log("tx", JSON.stringify(txRegister));
      assert.equal(txRegister.logs.length, 2);
      assert.equal(txRegister.logs[0].args._asset, testAsset);
      assert.equal(txRegister.logs[1].args._asset, testAsset2);
      assert.equal(txRegister.logs[0].args._to, data.lender);
      assert.equal(txRegister.logs[1].args._to, data.lender);
      assert.equal(txRegister.logs[0].event, "AssetTransferEvent");
      assert.equal(txRegister.logs[1].event, "AssetTransferEvent");
      assert(txRegister.logs[0].args._blocktime > 1);
      assert(txRegister.logs[1].args._blocktime > 1);

      mlog.log("Verifying result");
      let owner = await assetReg.getAssertOwner(testAsset);
      assert.equal(owner, data.lender);
      mlog.log("result", JSON.stringify(owner));
      let owner2 = await assetReg.getAssertOwner(testAsset2);
      assert.equal(owner2, data.lender);
      mlog.log("result", JSON.stringify(owner2));

      mlog.log("Transfering Asset");
      let txTransfer = await assetReg.transferAsset(data.lender, data.borrower, assets, {from: data.lenderAccount});
      mlog.log("tx", JSON.stringify(txTransfer));
      assert.equal(txTransfer.logs.length, 2);
      assert.equal(txTransfer.logs[0].args._asset, testAsset);
      assert.equal(txTransfer.logs[1].args._asset, testAsset2);
      assert.equal(txTransfer.logs[0].args._from, data.lender);
      assert.equal(txTransfer.logs[1].args._from, data.lender);
      assert.equal(txTransfer.logs[0].args._to, data.borrower);
      assert.equal(txTransfer.logs[1].args._to, data.borrower);
      assert.equal(txTransfer.logs[0].event, "AssetTransferEvent");
      assert.equal(txTransfer.logs[1].event, "AssetTransferEvent");
      assert(txTransfer.logs[0].args._blocktime > 1);
      assert(txTransfer.logs[1].args._blocktime > 1);

      mlog.log("Verifying Owner Notchanged");
      let owner3 = await assetReg.getAssertOwner(testAsset);
      assert.equal(owner3, data.lender);
      mlog.log("result", JSON.stringify(owner3));
      let owner4 = await assetReg.getAssertOwner(testAsset2);
      assert.equal(owner4, data.lender);
      mlog.log("result", JSON.stringify(owner4));
    });

    it("should be able to unregister Asset", async function() {
      let assetReg = await testUtils.createAndInitWithContract(AssetRegistry, [], accounts[0]);
      let data = await testUtils.createLoan(accounts);
      mlog.log("Registering Asset");

      let testAsset = testUtils.keccak256("assettest");
      mlog.log("Asset 1", testAsset);
      let testAsset2 = testUtils.keccak256("assettest2");
      mlog.log("Asset 2", testAsset2);
      let assets = [];
      assets.push(testAsset);
      assets.push(testAsset2);
      await assetReg.registerAsset(data.lender, assets, {from: data.lenderAccount});

      mlog.log("Unregister Asset");
      let txUnregister = await assetReg.unregisterAsset(data.lender, assets, {from: data.lenderAccount});
      mlog.log("tx", JSON.stringify(txUnregister));
      assert.equal(txUnregister.logs.length, 2);
      assert.equal(txUnregister.logs[0].args._asset, testAsset);
      assert.equal(txUnregister.logs[1].args._asset, testAsset2);
      assert(txUnregister.logs[0].args._blocktime > 1);
      assert(txUnregister.logs[1].args._blocktime > 1);
      assert.equal(txUnregister.logs[0].event, "AssetCancelEvent");
      assert.equal(txUnregister.logs[1].event, "AssetCancelEvent");

      mlog.log("Verifying Owner Empty");
      let empty1 = await assetReg.getAssertOwner(testAsset);
      assert.equal(empty1, "0x0000000000000000000000000000000000000000")
      mlog.log("result", JSON.stringify(empty1));
      let empty2 = await assetReg.getAssertOwner(testAsset2);
      assert.equal(empty2, "0x0000000000000000000000000000000000000000")
      mlog.log("result", JSON.stringify(empty2));
    });
    
    it("should not be able to unregister after transfer", async function() {
      let assetReg = await testUtils.createAndInitWithContract(AssetRegistry, [], accounts[0]);
      let data = await testUtils.createLoan(accounts);
      mlog.log("Registering Asset");

      let testAsset = testUtils.keccak256("assettest");
      mlog.log("Asset 1", testAsset);
      let testAsset2 = testUtils.keccak256("assettest2");
      mlog.log("Asset 2", testAsset2);
      let assets = [];
      assets.push(testAsset);
      assets.push(testAsset2);
      await assetReg.registerAsset(data.lender, assets, {from: data.lenderAccount});
      mlog.log("Transfering Asset");
      await assetReg.transferAsset(data.lender, data.borrower, assets, {from: data.lenderAccount});

      mlog.log("unregister assert after transfer, so it should throw exception... ");
      await testUtils.assertThrows(assetReg.unregisterAsset(data.lender, assets, {from: data.lenderAccount}));
    });
  });
})