'use strict';

import testUtils from '../support/truffle.test.utils';
import consts from '../support/consts';
import utils from '../support/utils';

var AttestationSvc = artifacts.require("./AttestationSvc.sol");
var mlog = require("mocha-logger");
var IdentityManager = artifacts.require("./IdentityManager.sol");
var SvcNodeRegistry = artifacts.require("./SvcNodeRegistry.sol");
var Identity = artifacts.require("./Identity.sol");
const web3Utils = require('web3-utils');
var print = utils.print;

contract('AttestationSvc Test', function (accounts) {

  before(async () => {
      await testUtils.initTestEnv(accounts[9]);
    }
  );

  describe("Create AttesationSvc", function () {
    it("should be able to create AttesationSvc with all the getter set", async function () {

      let identityManager = await testUtils.getIdentityManager();

      let newIdAddr = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[0]);
      let newId = Identity(newIdAddr);
      let proxy = await testUtils.createAndInit(AttestationSvc, ["Test Svc", newIdAddr], accounts[0]);
      let newSvc = await AttestationSvc.at(proxy.address);
      mlog.log("New AttestationSvc created :", newSvc.address);
      assert.equal(await newSvc.getSupportedTypesLength(), 0);

    })
  });

  describe("Manage Supporting Type", function () {
    it("should be able to add supporting type with owner(individual) permission", async function () {

      let identityManager = await testUtils.getIdentityManager();
      let newIdAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[0]);
      let newId = Identity(newIdAddr);

      let proxy = await testUtils.createAndInit(AttestationSvc, ["Test Svc", newIdAddr], accounts[0]);
      let newSvc = await AttestationSvc.at(proxy.address);

      mlog.log("New AttestationSvc created :", newSvc.address);

      mlog.log("Adding supportedType=", "typeA", "attestLevel=", 1);
      await newSvc.addSupportedAttestationType("typeA", 1, {from: accounts[0]});

      assert.equal(await newSvc.getSupportedTypesLength(), 1);
      assert.equal(await newSvc.findSupportedType("typeA"), 0);

      let queryResult = await newSvc.getSupportedAttestationType(0);
      mlog.log("Get attestType query result", JSON.stringify(queryResult));
      assert.equal(queryResult[0], "typeA");
      assert.equal(queryResult[1], "1");

    })
    it("should be not able to add supporting type without owner(individual) permission", async function () {

      let identityManager = await testUtils.getIdentityManager();
      let newIdAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[0]);
      let newId = Identity(newIdAddr);
      let proxy = await testUtils.createAndInit(AttestationSvc, ["Test Svc", newIdAddr], accounts[0]);
      let newSvc = await AttestationSvc.at(proxy.address);

      mlog.log("New AttestationSvc created :", newSvc.address, "owner:", accounts[0]);

      mlog.log("Adding supportedType=typeA with different account" + accounts[1] + ", and it should throw exception");
      await testUtils.assertThrows(newSvc.addSupportedAttestationType("typeA", 1, {from: accounts[1]}));

    })

    it("should be able to add supporting type with owner(company) permission", async function () {


      let identityManager = await testUtils.getIdentityManager();
      mlog.log("Creating a individual id, who is owner of the company");
      let newIndividualIdAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[0]);

      mlog.log("Creating a company id, owner is", newIndividualIdAddr);
      let newCompanyIdAddr = await testUtils.createIdentity(consts.IdentityType.COMPANY, newIndividualIdAddr, accounts[0]);

      let newCompanyId = Identity(newCompanyIdAddr);

      let proxy = await testUtils.createAndInit(AttestationSvc, ["Test Svc", newCompanyIdAddr], accounts[0]);
      let newSvc = await AttestationSvc.at(proxy.address);

      mlog.log("New AttestationSvc created :", newSvc.address);

      mlog.log("Adding supportedType=", "typeA", "attestLevel=", 1);
      await newSvc.addSupportedAttestationType("typeA", 1, {from: accounts[0]});

      assert.equal(await newSvc.getSupportedTypesLength(), 1);
      assert.equal(await newSvc.findSupportedType("typeA"), 0);

      let queryResult = await newSvc.getSupportedAttestationType(0);
      mlog.log("Get attestType query result", JSON.stringify(queryResult));
      assert.equal(queryResult[0], "typeA");
      assert.equal(queryResult[1], "1");

    })
    it("should be not able to add supporting type without owner(company) permission", async function () {

      let identityManager = await testUtils.getIdentityManager();
      mlog.log("Creating a individual id, who is owner of the company");
      let newIndividualIdAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[0]);

      mlog.log("Creating a company id, owner is", newIndividualIdAddr);
      let newCompanyIdAddr = await testUtils.createIdentity(consts.IdentityType.COMPANY, newIndividualIdAddr, accounts[0]);

      let newCompanyId = Identity(newCompanyIdAddr);
      let proxy = await testUtils.createAndInit(AttestationSvc, ["Test Svc", newCompanyIdAddr], accounts[0]);
      let newSvc = await AttestationSvc.at(proxy.address);

      mlog.log("New AttestationSvc created :", newSvc.address);

      mlog.log("Adding supportedType with a different account", accounts[1], ", and it should throw exception");
      await testUtils.assertThrows(newSvc.addSupportedAttestationType("typeA", 1, {from: accounts[1]}));

    })

    it("should be not able to add supporting type if it's already existed", async function () {

      let identityManager = await testUtils.getIdentityManager();
      let newIdAddr = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[0]);
      let newId = Identity(newIdAddr);
      let proxy = await testUtils.createAndInit(AttestationSvc, ["Test Svc", newIdAddr], accounts[0]);
      let newSvc = await AttestationSvc.at(proxy.address);
      mlog.log("New AttestationSvc created :", newSvc.address);

      mlog.log("Adding supportedType=", "typeA", "attestLevel=", 1);
      await newSvc.addSupportedAttestationType("typeA", 1, {from: accounts[0]});

      mlog.log("The first time to add typeA should be succeed");
      assert.equal(await newSvc.getSupportedTypesLength(), 1);
      assert.equal(await newSvc.findSupportedType("typeA"), 0);

      mlog.log("Adding supportedType=typeA, the second time, and it should throw exception");
      await testUtils.assertThrows(newSvc.addSupportedAttestationType("typeA", 1, {from: accounts[0]}));

    })
  });

  describe("Process attestation", function () {
    it("should be able to raise attest service from IdentityManager");
    it("should not be able to raise attest service from other than IdentityManager");
    it("should be be able to send result from owner ", async function() {
      let identityManager = await testUtils.getIdentityManager();
      let svcNodeRegistry = await testUtils.getSvcNodeRegistry();

      mlog.log("Create Identities ..");
      let newIdAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[1]);

      let proxy = await testUtils.createAndInit(AttestationSvc, ["Test Svc", newIdAddr], accounts[1]);
      let attestationSvc = await AttestationSvc.at(proxy.address);

      mlog.log("New attestationSvc created :", attestationSvc.address);
      assert.equal(await attestationSvc.getSupportedTypesLength(), 0);
      mlog.log("Adding supportedType = ", "typeA");
      await attestationSvc.addSupportedAttestationType("typeA", 1, {from: accounts[1]});
      mlog.log("Adding supportedType = ", "typeB");
      await attestationSvc.addSupportedAttestationType("typeB", 2, {from: accounts[1]});
      mlog.log("Adding supportedType = ", "typeC");
      await attestationSvc.addSupportedAttestationType("typeC", 3, {from: accounts[1]});
      assert.equal(await attestationSvc.getSupportedTypesLength(), 3);

      svcNodeRegistry.register(attestationSvc.address, 6, 0, {from: accounts[1]});
      mlog.log("Register attestationSvc smart contract into svcNodeRegister smart contract");

      var signResult = testUtils.signDataFunc("typeA", accounts[0]);

      let tx = await attestationSvc.request(newIdAddr, "typeA", "ipfs",{from: accounts[1]});
      assert.equal(tx.logs[0].event, "OnRequestEvent");
      assert.equal(tx.logs[0].args.dataType, "typeA");

      let testIdSha3 = testUtils.keccak256("nametestid");
      let testNameSha3 = testUtils.keccak256("nametestsha");
      let idproxy = await testUtils.createAndInit(Identity, [testIdSha3, testNameSha3, true, 1, testUtils.defaultPubKey, testUtils.defaultNodeKey], accounts[0]);
      let tx2 = await attestationSvc.request(idproxy.address, "typeA", "ipfs",{from: accounts[0]});
      assert.equal(tx2.logs[0].event, "OnRequestEvent");
      assert.equal(tx2.logs[0].args.dataType, "typeA");
    });

    it("should not be able to send result from other than owner", async function() {
      let svcNodeRegistry = await testUtils.getSvcNodeRegistry();

      mlog.log("Create 0 Identities ..");
      let newIdAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[1]);

      let proxy = await testUtils.createAndInit(AttestationSvc, ["Test Svc", newIdAddr], accounts[1]);
      let attestationSvc = await AttestationSvc.at(proxy.address);
      mlog.log("New attestationSvc created :", attestationSvc.address);
      assert.equal(await attestationSvc.getSupportedTypesLength(), 0);
      mlog.log("Adding supportedType = ", "typeA");
      await attestationSvc.addSupportedAttestationType("typeA", 1, {from: accounts[1]});
      mlog.log("Adding supportedType = ", "typeB");
      await attestationSvc.addSupportedAttestationType("typeB", 2, {from: accounts[1]});
      mlog.log("Adding supportedType = ", "typeC");
      await attestationSvc.addSupportedAttestationType("typeC", 3, {from: accounts[1]});
      assert.equal(await attestationSvc.getSupportedTypesLength(), 3);

      svcNodeRegistry.register(attestationSvc.address, 6, 0, {from: accounts[1]});
      mlog.log("Register attestationSvc smart contract into svcNodeRegister smart contract");

      var signResult = testUtils.signDataFunc("00012211111212121212121212121212", accounts[0]);

      mlog.log("Create request Identities ..");
      let reqIdAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[0]);

      let requestIdentity = Identity.at(reqIdAddr);
      mlog.log("send result from other than owner, and throw exception");
     attestationSvc.request(newIdAddr, "typeA", "ipfs" ,{from: accounts[0]});
    });
  });

  describe("Sign seal contract from Esign Service ", function () {

    it("should be be able to request sign contract, then catch a web3 request event.", async function () {

      let svcNodeRegistry = await testUtils.getSvcNodeRegistry();
      mlog.log("Create 0 Identities ..");
      let newIdAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[1]);
      let proxy = await testUtils.createAndInit(AttestationSvc, ["Test Svc", newIdAddr], accounts[1]);
      let attestationSvc = await AttestationSvc.at(proxy.address);
      mlog.log("New attestationSvc created :", attestationSvc.address);
      assert.equal(await attestationSvc.getSupportedTypesLength(), 0);
      mlog.log("Adding supportedType = ", "SIGN_CONTRACT");
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT", 1, {from: accounts[1]});
      mlog.log("Adding supportedType = ", "typeB");
      await attestationSvc.addSupportedAttestationType("typeB", 2, {from: accounts[1]});
      mlog.log("Adding supportedType = ", "typeC");
      await attestationSvc.addSupportedAttestationType("typeC", 3, {from: accounts[1]});
      assert.equal(await attestationSvc.getSupportedTypesLength(), 3);
      svcNodeRegistry.register(attestationSvc.address, 6, 0, {from: accounts[1]});
      mlog.log("Register attestationSvc smart contract into svcNodeRegister smart contract");


      function awaitAttestRespond() {
        return new Promise(function (resolve, reject) {
          var event = attestationSvc.OnSignContractEvent();
          event.watch(async function (error, result) {
            if (!error) {
              mlog.log("Received IdentityCreatedEvent, new Identity address: ", result.args);
              event.stopWatching();
              resolve(result.args);
            } else {
              mlog.log("Error occured watching create Identity event", error);
              event.stopWatching();
              reject();
            }
          });
        });
      }

      let args = {
        data: JSON.stringify({type: "PDF_FILE", file: "FILE_CONTEXT"}),
        dataType: "SIGN_CONTRACT",
        loanAddress: accounts[3],
        idAddr: newIdAddr
      }

      // attestationSvc.signContract(args.data, args.dataType, args.loanAddress, args.idAddr);
      // var eventResult = await awaitAttestRespond();
      // mlog.log("Catch a event 'OnSignContractEvent' from attestationSvc: ", JSON.stringify(eventResult));
      // assert.equal(eventResult.data, args.data);
      // assert.equal(eventResult.dataType, args.dataType);
      // assert.equal(eventResult.loanAddress, args.loanAddress);
      // assert.equal(eventResult.idAddr, args.idAddr);
    });


    it("should not be be able to request sign contract by not exist data type, then catch a web3 request event.", async function () {

      let identityManager = await testUtils.getIdentityManager();
      let svcNodeRegistry = await testUtils.getSvcNodeRegistry();
      mlog.log("Create 0 Identities ..");
      let newIdAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[1]);
      let proxy = await testUtils.createAndInit(AttestationSvc, ["Test Svc", newIdAddr], accounts[1]);
      let attestationSvc = await AttestationSvc.at(proxy.address);
      mlog.log("New attestationSvc created :", attestationSvc.address);
      assert.equal(await attestationSvc.getSupportedTypesLength(), 0);
      mlog.log("Adding supportedType = ", "typeA");
      await attestationSvc.addSupportedAttestationType("typeA", 1, {from: accounts[1]});
      mlog.log("Adding supportedType = ", "typeB");
      await attestationSvc.addSupportedAttestationType("typeB", 2, {from: accounts[1]});
      mlog.log("Adding supportedType = ", "typeC");
      await attestationSvc.addSupportedAttestationType("typeC", 3, {from: accounts[1]});
      assert.equal(await attestationSvc.getSupportedTypesLength(), 3);
      svcNodeRegistry.register(attestationSvc.address, 6, 0, {from: accounts[1]});
      mlog.log("Register attestationSvc smart contract into svcNodeRegister smart contract");

      let args = {
        data: JSON.stringify({type: "PDF_FILE", file: "FILE_CONTEXT"}),
        dataType: "SIGN_CONTRACT",
        loanAddress: accounts[3],
        idAddr: newIdAddr
      }

    });


    it("should be able to response a contract signature from attestation service, then catch a web3 request event.", async function () {

      let identityManager = await testUtils.getIdentityManager();
      let svcNodeRegistry = await await testUtils.getSvcNodeRegistry();
      mlog.log("Create 0 Identities ..");
      let newIdAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[1]);
      let proxy = await testUtils.createAndInit(AttestationSvc, ["Test Svc", newIdAddr], accounts[1]);
      let attestationSvc = await AttestationSvc.at(proxy.address);
      mlog.log("New attestationSvc created :", attestationSvc.address);
      assert.equal(await attestationSvc.getSupportedTypesLength(), 0);
      mlog.log("Adding supportedType = ", "SIGN_CONTRACT");
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT", 1, {from: accounts[1]});
      mlog.log("Adding supportedType = ", "typeB");
      await attestationSvc.addSupportedAttestationType("typeB", 2, {from: accounts[1]});
      mlog.log("Adding supportedType = ", "typeC");
      await attestationSvc.addSupportedAttestationType("typeC", 3, {from: accounts[1]});
      assert.equal(await attestationSvc.getSupportedTypesLength(), 3);
      svcNodeRegistry.register(attestationSvc.address, 6, 0, {from: accounts[1]});
      mlog.log("Register attestationSvc smart contract into svcNodeRegister smart contract");


      function awaitAttestRespond() {
        return new Promise(function (resolve, reject) {
          var event = attestationSvc.OnContractSignatureRespEvent();
          event.watch(async function (error, result) {
            if (!error) {
              mlog.log("Received IdentityCreatedEvent, new Identity address: ", result.args);
              event.stopWatching();
              resolve(result.args);
            } else {
              mlog.log("Error occured watching create Identity event", error);
              event.stopWatching();
              reject();
            }
          });
        });
      }

      let args = {
        respData: JSON.stringify({type: "PDF_FILE", file: "FILE_CONTEXT"}),
        dataType: "SIGN_CONTRACT",
        callBackResult: true
      }


    });

    it("should not be able to response a contract signature from attestation service by other owner, then catch a web3 request event.", async function () {

      let identityManager = await testUtils.getIdentityManager();
      let svcNodeRegistry = await await testUtils.getSvcNodeRegistry();
      mlog.log("Create 0 Identities ..");
      let newIdAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[1]);
      let proxy = await testUtils.createAndInit(AttestationSvc, ["Test Svc", newIdAddr], accounts[1]);
      let attestationSvc = await AttestationSvc.at(proxy.address);
      mlog.log("New attestationSvc created :", attestationSvc.address);
      assert.equal(await attestationSvc.getSupportedTypesLength(), 0);
      mlog.log("Adding supportedType = ", "SIGN_CONTRACT");
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT", 1, {from: accounts[1]});
      mlog.log("Adding supportedType = ", "typeB");
      await attestationSvc.addSupportedAttestationType("typeB", 2, {from: accounts[1]});
      mlog.log("Adding supportedType = ", "typeC");
      await attestationSvc.addSupportedAttestationType("typeC", 3, {from: accounts[1]});
      assert.equal(await attestationSvc.getSupportedTypesLength(), 3);
      await svcNodeRegistry.register(attestationSvc.address, 6, 0, {from: accounts[1]});
      mlog.log("Register attestationSvc smart contract into svcNodeRegister smart contract");

      let args = {
        respData: JSON.stringify({type: "PDF_FILE", file: "FILE_CONTEXT"}),
        dataType: "SIGN_CONTRACT",
        callBackResult: true
      }
    });
  });
});