'use strict'

import testUtils from '../support/truffle.test.utils';
import consts from '../support/consts';

var DataProviderSvc = artifacts.require("./DataProviderSvc.sol");
var mlog = require("mocha-logger");
var Identity = artifacts.require("./Identity.sol");
const web3Utils = require('web3-utils');


// var getSignData = function(data, accountAddr) {
//   var msg = new Buffer(data); //预测处理
//   // web3.personal.unlockAccount(accountAddr, "", 30000);
//
//   //构造被签名后的摘要
//   const prefix = new Buffer("\x19Ethereum Signed Message:\n");
//   var signData = web3Utils.soliditySha3(
//     Buffer.concat([prefix, new Buffer(String(msg.length)), msg]).toString()
//   );
//
//   var signature = web3.eth.sign(accountAddr, msg.toString('hex')); // Signing the messge
//   var r = signature.slice(0, 66)
//   var s = '0x' + signature.slice(66, 130)
//   var v = '0x' + signature.slice(130, 132)
//   v = web3.toDecimal(v);
//   if (v < 27 || v > 28) {
//     v += 27;
//   }
//   return {
//     "signature": signature,
//     "signData": signData,
//     "v": v,
//     "r": r,
//     "s": s
//   }
// }

var getSignData = function(data, accountAddr) {
  //unLockAccount(accountAddr);
  var msgData = web3Utils.soliditySha3(data);
  var signature = web3.eth.sign(accountAddr, msgData.toString('hex')); // Signing the messge
  var r = signature.slice(0, 66)
  var s = '0x' + signature.slice(66, 130)
  var v = '0x' + signature.slice(130, 132)
  v = web3.toDecimal(v);
  if (v < 27 || v > 28) {
    v += 27;
  }
  return {
    "signature": signature,
    "v": v,
    "r": r,
    "s": s
  }
}

contract('DataProvider Test', function(accounts) {

  before(async () => {
      await testUtils.initTestEnv(accounts[9]);
    }
  );

  describe("Create DataProvider", function() {
    it("should be able to create DataProvider with all the getter set", async function() {
      let identityManager = await testUtils.getIdentityManager();
      let svcNodeRegistry = await testUtils.getSvcNodeRegistry();
      let newIdAddr = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[0]);
      mlog.log("Creating DataProvider ... ");
      let newDataProvider = await testUtils.createAndInitWithContract(DataProviderSvc, ["Test Svc", newIdAddr, "desc", identityManager.address, svcNodeRegistry.address], accounts[0]);
      mlog.log("New DataProvider created :", newDataProvider.address);
      assert.equal(await newDataProvider.getSupportedTypesLength(), 0);
    })
  });

  describe("Manage Supporting Type", function() {
    it("should be able to add supporting type with owner(individual) permission", async function() {

      let identityManager = await testUtils.getIdentityManager();
      let svcNodeRegistry = await testUtils.getSvcNodeRegistry();
      let newIdAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[0]);
      let newDataProvider = await testUtils.createAndInitWithContract(DataProviderSvc, ["Test Svc", newIdAddr, "desc", identityManager.address, svcNodeRegistry.address], accounts[0]);
      mlog.log("New DataProvider created :", newDataProvider.address);

      mlog.log("Adding supportedType = ", "typeA");
      await newDataProvider.addSupportedType("typeA", { from: accounts[0] });
      await newDataProvider.addSupportedType("typeB", { from: accounts[0] });

      assert.equal(await newDataProvider.getSupportedTypesLength(), 2);
      assert.equal(await newDataProvider.findSupportedType("typeA"), 0);
      assert.equal(await newDataProvider.findSupportedType("typeB"), 1);

      let queryResult = await newDataProvider.getSupportedType(0);
      mlog.log("Get dataType query result", JSON.stringify(queryResult));
      assert.equal(queryResult, "typeA");

    })
    it("should be not able to add supporting type without owner(individual) permission", async function() {

      let identityManager = await testUtils.getIdentityManager();
      let svcNodeRegistry = await testUtils.getSvcNodeRegistry();
      let newIdAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[0]);
      let newDataProvider = await testUtils.createAndInitWithContract(DataProviderSvc, ["Test Svc", newIdAddr, "desc", identityManager.address, svcNodeRegistry.address], accounts[0]);
      mlog.log("New DataProvider created :", newDataProvider.address, "owner:", accounts[0]);

      mlog.log("Adding supportedType = typeA with different account" + accounts[1] + ", and it should throw exception");
      await testUtils.assertThrows(newDataProvider.addSupportedType("typeA", { from: accounts[1] }));

    })

    it("should be able to add supporting type with owner(company) permission", async function() {

      let identityManager = await testUtils.getIdentityManager();
      let svcNodeRegistry = await testUtils.getSvcNodeRegistry();
      // 
      mlog.log("Creating a individual id, who is owner of the company");
      let newIndividualIdAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[0]);

      mlog.log("Creating a company id, owner is", newIndividualIdAddr);
      let newCompanyIdAddr = await testUtils.createIdentity(consts.IdentityType.COMPANY, newIndividualIdAddr, accounts[0]);

      let newDataProvider = await testUtils.createAndInitWithContract(DataProviderSvc, ["Test Svc", newCompanyIdAddr, "desc", identityManager.address, svcNodeRegistry.address], accounts[0]);
      mlog.log("New DataProvider created :", newDataProvider.address);

      mlog.log("Adding supportedType = ", "typeA");
      await newDataProvider.addSupportedType("typeA", { from: accounts[0] });

      assert.equal(await newDataProvider.getSupportedTypesLength(), 1);
      assert.equal(await newDataProvider.findSupportedType("typeA"), 0);

      let queryResult = await newDataProvider.getSupportedType(0);
      mlog.log("Get dataType query result", JSON.stringify(queryResult));
      assert.equal(queryResult, "typeA");

    })
    it("should be not able to add supporting type without owner(company) permission", async function() {

      let identityManager = await testUtils.getIdentityManager();
      let svcNodeRegistry = await testUtils.getSvcNodeRegistry();
      // 
      mlog.log("Creating a individual id, who is owner of the company");
      let newIndividualIdAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[0]);

      mlog.log("Creating a company id, owner is", newIndividualIdAddr);
      let newCompanyIdAddr = await testUtils.createIdentity(consts.IdentityType.COMPANY, newIndividualIdAddr, accounts[0]);

      let newDataProvider = await testUtils.createAndInitWithContract(DataProviderSvc, ["Test Svc", newCompanyIdAddr, "desc", identityManager.address, svcNodeRegistry.address], accounts[0]);

      mlog.log("New DataProvider created :", newDataProvider.address);

      mlog.log("Adding supportedType with a different account", accounts[1], ", and it should throw exception");
      await testUtils.assertThrows(newDataProvider.addSupportedType("typeA", { from: accounts[1] }));

    })

    it("should be not able to add supporting type if it's already existed", async function() {

      let identityManager = await testUtils.getIdentityManager();
      let svcNodeRegistry = await testUtils.getSvcNodeRegistry();
      let newIdAddr = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[0]);
      let newDataProvider = await testUtils.createAndInitWithContract(DataProviderSvc, ["Test Svc", newIdAddr, "desc", identityManager.address, svcNodeRegistry.address], accounts[0]);

      mlog.log("New DataProvider created :", newDataProvider.address);

      mlog.log("Adding supportedType=", "typeA");
      await newDataProvider.addSupportedType("typeA", { from: accounts[0] });

      mlog.log("The first time to add typeA should be succeed");
      assert.equal(await newDataProvider.getSupportedTypesLength(), 1);
      assert.equal(await newDataProvider.findSupportedType("typeA"), 0);

      mlog.log("Adding supportedType=typeA, the second time, and it should throw exception");
      await testUtils.assertThrows(newDataProvider.addSupportedType("typeA", { from: accounts[0] }));
    })
  });

  describe("Request Set IPFS result and record", function() {
    it("should be able to save ipfs address to identity requesting ", async function() {

      let identityManager = await testUtils.getIdentityManager();
      let svcNodeRegistry = await testUtils.getSvcNodeRegistry();

      mlog.log("Create 0 Identities ..");
      let newIdAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[1]);

      let newDataProvider = await testUtils.createAndInitWithContract(DataProviderSvc, ["Test Svc", newIdAddr, "desc", identityManager.address, svcNodeRegistry.address], accounts[1]);
      mlog.log("New DataProvider created :", newDataProvider.address);
      assert.equal(await newDataProvider.getSupportedTypesLength(), 0);
      mlog.log("Adding supportedType = ", "typeA");
      await newDataProvider.addSupportedType("typeA", { from: accounts[1] });
      mlog.log("Adding supportedType = ", "typeB");
      await newDataProvider.addSupportedType("typeB", { from: accounts[1] });
      mlog.log("Adding supportedType = ", "typeC");
      await newDataProvider.addSupportedType("typeC", { from: accounts[1] });
      assert.equal(await newDataProvider.getSupportedTypesLength(), 3);

      let svcNodeCount = await svcNodeRegistry.getSvcNodeCount();
      mlog.log("Register dataProvider smart contract into svcNodeRegister smart contract.svc node count : ", svcNodeCount);
      svcNodeRegistry.register(newDataProvider.address, 1, 2, { from: accounts[1] });
      svcNodeCount = await svcNodeRegistry.getSvcNodeCount();
      mlog.log("Register dataProvider smart contract into svcNodeRegister smart contract.svc node count : ", svcNodeCount);
      let ipfsAddr = "ipfsAddr12211111212121212121212121212";


      mlog.log("Create request Identities ..");
      let reqIdAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[0]);
      var signResult = getSignData("typeA", accounts[0]);
      let requestIdentity = Identity.at(reqIdAddr);
      let recordsCountBefore = await requestIdentity.getDataRecordCount();

      assert.equal(recordsCountBefore, 0);
      mlog.log("Request Svc node sendResult ..", reqIdAddr, newDataProvider.address, identityManager.address);
      mlog.log(signResult.v, signResult.r, signResult.s);

      let request = await newDataProvider.request(newIdAddr,"typeA", ipfsAddr, { from: accounts[1] });
      mlog.log("requestResult tx: ", JSON.stringify(request, null, 2));


      let respond = await newDataProvider.respond(newIdAddr,1,  ipfsAddr,getSignData(ipfsAddr,accounts[1]).signature,{ from: accounts[1] });

      mlog.log("respondResult tx: ", JSON.stringify(respond, null, 2));
      // let recordsCountAfter = await requestIdentity.getDataRecordCount();
      // mlog.log("recordsCountAfter", recordsCountAfter);
      //assert.equal(recordsCountAfter, 1);
      //assert.equal(3, 1);
    })
  });
});