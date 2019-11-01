'use strict';
import testUtils from '../support/truffle.test.utils';
import assert from "assert";
import consts from '../support/consts';
import utils from '../support/utils';

var IdentityManager = artifacts.require("./IdentityManager.sol");
var IdentityManagerV2_NewFunc = artifacts.require("./IdentityManagerV2_NewFunc.sol");
var Identity = artifacts.require("./Identity.sol");
var mlog = require("mocha-logger");
var AttestationSvc = artifacts.require("./AttestationSvc.sol");
const web3Utils = require('web3-utils');
var last8 = utils.last8;
var print = utils.print;


// Auto Create Identity
var createIdentity = async(account, isCompany) => {
  let idAddr;
  if (isCompany) {
    idAddr = await testUtils.createIdentity(consts.IdentityType.COMPANY, account);
  } else {
    idAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, account);
  }
  return idAddr;
}

contract('IdentityManager', function(accounts) {

  before(async () => {
      await testUtils.initTestEnv(accounts[9]);
    }
  );
  describe("Create identity", function() {
    it("should not be able to create account with the same idhash", async function() {
      let idHash = "idhash" + Date.now();
      await testUtils.createIdentityWithIdName(1, accounts[0], accounts[0], "namehash", idHash);

      mlog.log("Creating Identity with the same idHash = '" + idHash + "'.., then exception should be thrown");
      await testUtils.assertThrows(testUtils.createIdentityWithIdName(1, accounts[0], accounts[0], "namehash", idHash));
    })
  });

  describe("Ownership", function () {
    it("should be able to transferOwnership if it's owner, and check transfer record", async () => {
      let identityManager = await testUtils.getIdentityManager();
      let originalIdAddr = await createIdentity(accounts[0]);
      let transferAddr = await createIdentity(accounts[1]);
      mlog.log("original owner:", accounts[0]);
      mlog.log("new owner:", transferAddr);

      let tx = await identityManager.transferOwnerShip(originalIdAddr, transferAddr, {
        from: accounts[0]
      });
      assert.equal(tx.logs[0].args.previousOwner, accounts[0]);
      assert.equal(tx.logs[0].args.newOwner, transferAddr);
    });

    it("should be NOT able to transferOwnership if it's NOT owner", async () => {
      try {
        let identityManager = await testUtils.getIdentityManager();
        let originalIdAddr = await createIdentity(accounts[0]);
        let transferAddr = await createIdentity(accounts[1]);

        await testUtils.assertThrows(identityManager.transferOwnerShip(originalIdAddr, transferAddr, {
          from: accounts[1]
        }))
      } catch (err) {
        mlog.error("Unexpected error thrown: " + err);
        assert.fail();
      }
    });

    it("should be check if a wallet pubkey is owner of a Individual Identity", async () => {
      // check scenarios of it's owner, and not owner.
      try {
        let identityManager = await testUtils.getIdentityManager();
        let originalIdAddr = await createIdentity(accounts[0]);

        var userOwner = await identityManager.isOwner(originalIdAddr, accounts[0]);
        assert.equal(userOwner, true, "check scenarios of it's owner");

        var userNotOwner = await identityManager.isOwner(originalIdAddr, accounts[1]);
        assert.equal(userNotOwner, false, "check scenarios of it's not owner");

      } catch (err) {
        mlog.error("Unexpected error thrown: " + err);
        assert.fail();
      }
    });


    it("should be check if a Individual Identity is owner of a Company Identity", async () => {
      // check scenarios of it's owner, and not owner.
      try {
        let identityManager = await testUtils.getIdentityManager();
        let originalCompanyIdAddr = await createIdentity(accounts[0], true);

        var userOwner = await identityManager.isOwner(originalCompanyIdAddr, accounts[0]);
        assert.equal(userOwner, true, "check scenarios of it's owner");

        var userNotOwner = await identityManager.isOwner(originalCompanyIdAddr, accounts[1]);
        assert.equal(userNotOwner, false, "check scenarios of it's not owner");

      } catch (err) {
        mlog.error("Unexpected error thrown: " + err);
        assert.fail();
      }
    });


  });

  describe("Set Identity Keys", function () {
    it("should allow to setIdentityMsgPubKey if it's owner", async () => {
      try {
        let identityManager = await testUtils.getIdentityManager();
        let originalIdAddr = await createIdentity(accounts[0]);

        await identityManager.setIdentityMsgPubKey(originalIdAddr, '--pubKey--', {
          from: accounts[0]
        });
        let identity = Identity.at(originalIdAddr);
        let pubKey = await identity.msgPubKey();
        assert.equal(pubKey, '--pubKey--', 'the pubKey should be attached in identity ')

      } catch (err) {
        mlog.error("Unexpected error thrown: " + err);
        assert.fail();
      }
    });
    it("should not not to setIdentityMsgPubKey if it's not owner", async () => {
      try {
        let identityManager = await testUtils.getIdentityManager();
        let originalIdAddr = await createIdentity(accounts[1]);

        await testUtils.assertThrows(identityManager.setIdentityMsgPubKey(originalIdAddr, '--pubKey--', {
          from: accounts[0]
        }));
      } catch (err) {
        mlog.error("Unexpected error thrown: " + err);
        assert.fail();
      }
    });
    it("should allow to addIdentityNodeKey if it's owner", async () => {
      try {
        let identityManager = await testUtils.getIdentityManager();
        let originalIdAddr = await createIdentity(accounts[0]);

        await identityManager.addIdentityNodeKey(originalIdAddr, '--nodeKey--', {
          from: accounts[0]
        });
        let identity = Identity.at(originalIdAddr);
        let nodeKeyLength = await identity.getResideAtNodesLength();
        let found = false;
        for (var i = 0; i < nodeKeyLength; i++) {
          if (await identity.resideAtNodes(i) == '--nodeKey--') {
            found = true;
          }
        }
        assert.equal(found, true, 'the nodeKey should be attached in identity ')

      } catch (err) {
        mlog.error("Unexpected error thrown: " + err);
        assert.fail();
      }
    });
    it("should not not to addIdentityNodeKey if it's not owner", async () => {
      try {
        let identityManager = await testUtils.getIdentityManager();
        let originalIdAddr = await createIdentity(accounts[1]);

        await testUtils.assertThrows(identityManager.addIdentityNodeKey(originalIdAddr, '--nodeKey--', {
          from: accounts[0]
        }));
      } catch (err) {
        mlog.error("Unexpected error thrown: " + err);
        assert.fail();
      }
    });
    it("should allow to removeIdentityNodeKey if it's owner", async () => {
      // removeIdentityNodeKey
      try {
        let identityManager = await testUtils.getIdentityManager();
        let originalIdAddr = await createIdentity(accounts[0]);

        await identityManager.addIdentityNodeKey(originalIdAddr, '--nodeKey--', {
          from: accounts[0]
        });
        await identityManager.addIdentityNodeKey(originalIdAddr, '--removeNodeKey--', {
          from: accounts[0]
        });
        await identityManager.removeIdentityNodeKey(originalIdAddr, '--removeNodeKey--', {
          from: accounts[0]
        })
        let identity = Identity.at(originalIdAddr);
        let nodeKeyLength = await identity.getResideAtNodesLength();
        let found = false;
        for (var i = 0; i < nodeKeyLength; i++) {
          mlog.log('all node key', await identity.resideAtNodes(i))
          if (await identity.resideAtNodes(i) !== '--removeNodeKey--') {
            found = true;
          }
        }
        assert.equal(found, true, 'the nodeKey should be removed in identity ')

      } catch (err) {
        mlog.error("Unexpected error thrown: " + err);
        assert.fail();
      }
    });
    it("should not not to removeIdentityNodeKey if it's not owner", async () => {
      try {
        let identityManager = await testUtils.getIdentityManager();
        let originalIdAddr = await createIdentity(accounts[0]);

        await testUtils.assertThrows(identityManager.removeIdentityNodeKey(originalIdAddr, '--removeNodeKey--', {
          from: accounts[1]
        }));
      } catch (err) {
        mlog.error("Unexpected error thrown: " + err);
        assert.fail();
      }
    });
  });

  describe("Authorize and Unauthorize", function () {
    it("should be able to authorize wallet public key to Individual account", async function () {
      let identityManager = await testUtils.getIdentityManager();
      let originalIdAddr = await createIdentity(accounts[0]);
      let authorizeAddr = await createIdentity(accounts[1]);

      //授权
      let tx = await identityManager.authorize(originalIdAddr, authorizeAddr, {from: accounts[0]});

      mlog.log("tx", print(tx));

      //授权列表中包含被授权id
      var authorizeList = await identityManager.getAuthorizedAddrs(originalIdAddr);
      mlog.log("should add authorizeAddr in authorizeList", authorizeList);
      assert.equal(authorizeList[0], authorizeAddr, "the authorization list contains the authorized ID address");

      assert.equal(tx.logs[0].event, "IdAuthorized");
      assert.equal(tx.logs[0].args.targetId, originalIdAddr);
      assert.equal(tx.logs[0].args.authorizedId, authorizeAddr);

      //用其他人的钱包地址进行授权
      mlog.log("should not be able to authorized by not owner");
      await testUtils.assertThrows(identityManager.authorize(originalIdAddr, authorizeAddr, {from: accounts[1]}))
    })


    it("should be able to unauthorize wallet public key to Individual account, then it should lost access", async function () {

      //移除授权
      let identityManager = await testUtils.getIdentityManager();
      let originalIdAddr = await createIdentity(accounts[0]);
      let authorizeAddr = await createIdentity(accounts[1]);
      let unauthorizeAddr = await createIdentity(accounts[2]);
      let tx1 = await identityManager.authorize(originalIdAddr, authorizeAddr, {from: accounts[0]});
      assert.equal(tx1.logs[0].event, "IdAuthorized");
      assert.equal(tx1.logs[0].args.targetId, originalIdAddr);
      assert.equal(tx1.logs[0].args.authorizedId, authorizeAddr);

      let tx2 = await identityManager.authorize(originalIdAddr, unauthorizeAddr, {from: accounts[0]});
      assert.equal(tx2.logs[0].event, "IdAuthorized");
      assert.equal(tx2.logs[0].args.targetId, originalIdAddr);
      assert.equal(tx2.logs[0].args.authorizedId, unauthorizeAddr);

      let tx3 = await identityManager.unauthorize(originalIdAddr, unauthorizeAddr, {from: accounts[0]});

      assert.equal(tx3.logs[0].event, "IdUnauthorized");
      assert.equal(tx3.logs[0].args.targetId, originalIdAddr);
      assert.equal(tx3.logs[0].args.authorizedId, unauthorizeAddr);

      //授权列表中不包含被授权id
      var authorizeList = await identityManager.getAuthorizedAddrs(originalIdAddr);
      assert.equal(authorizeList[0], authorizeAddr, "should add authorizeAddr in authorizeList");
      assert.equal(authorizeList.length, 1, "should remove authorizeAddr in authorizeList");
      mlog.log("authorizeList", authorizeList)

      //用其他人的钱包地址移除授权
      await testUtils.assertThrows(identityManager.unauthorize(originalIdAddr, authorizeAddr, {from: accounts[1]}))
    })

    it("should be able to authorize individual Identity to company Identity", async () => {
      let identityManager = await testUtils.getIdentityManager();
      let originalCompanyIdAddr = await createIdentity(accounts[0], true);
      let authorizeCompanyAddr = await createIdentity(accounts[1], true);

      //授权
      let tx = await identityManager.authorize(originalCompanyIdAddr, authorizeCompanyAddr, {from: accounts[0]});

      assert.equal(tx.logs[0].event, "IdAuthorized");
      assert.equal(tx.logs[0].args.targetId, originalCompanyIdAddr);
      assert.equal(tx.logs[0].args.authorizedId, authorizeCompanyAddr);

      //授权列表中包含被授权id
      var authorizeList = await identityManager.getAuthorizedAddrs(originalCompanyIdAddr);
      mlog.log("should add authorizeCompanyAddr in authorizeList", authorizeList);
      assert.equal(authorizeList[0], authorizeCompanyAddr, "the authorization list contains the authorized ID address");
    });

    it("should be not able to authorize individual Identity to company Identity not by owner", async () => {
      let identityManager = await testUtils.getIdentityManager();
      let originalCompanyIdAddr = await createIdentity(accounts[0], true);
      let authorizeCompanyAddr = await createIdentity(accounts[1], true);
      await testUtils.assertThrows(identityManager.authorize(originalCompanyIdAddr, authorizeCompanyAddr, {from: accounts[1]}));
    });

    it("should be able to unauthorize individual Identity to company Identity, then it should lost access", async () => {

      //移除授权
      let identityManager = await testUtils.getIdentityManager();
      let originalCompanyIdAddr = await createIdentity(accounts[0], true);
      let authorizeCompanyAddr = await createIdentity(accounts[1], true);
      let unauthorizeCompanyAddr = await createIdentity(accounts[2], true);
      let tx1 = await identityManager.authorize(originalCompanyIdAddr, authorizeCompanyAddr, {from: accounts[0]});
      assert.equal(tx1.logs[0].event, "IdAuthorized");
      assert.equal(tx1.logs[0].args.targetId, originalCompanyIdAddr);
      assert.equal(tx1.logs[0].args.authorizedId, authorizeCompanyAddr);

      let tx2 = await identityManager.authorize(originalCompanyIdAddr, unauthorizeCompanyAddr, {from: accounts[0]});
      assert.equal(tx2.logs[0].event, "IdAuthorized");
      assert.equal(tx2.logs[0].args.targetId, originalCompanyIdAddr);
      assert.equal(tx2.logs[0].args.authorizedId, unauthorizeCompanyAddr);

      let tx3 = await identityManager.unauthorize(originalCompanyIdAddr, unauthorizeCompanyAddr, {from: accounts[0]});
      assert.equal(tx3.logs[0].event, "IdUnauthorized");
      assert.equal(tx3.logs[0].args.targetId, originalCompanyIdAddr);
      assert.equal(tx3.logs[0].args.authorizedId, unauthorizeCompanyAddr);

      //授权列表中不包含被授权id
      var authorizeList = await identityManager.getAuthorizedAddrs(originalCompanyIdAddr);
      assert.equal(authorizeList[0], authorizeCompanyAddr, "should add authorizeCompanyAddr in authorizeList");
      assert.equal(authorizeList.length, 1, "should remove authorizeCompanyAddr in authorizeList");
      mlog.log("authorizeList", authorizeList)

      //用其他人的钱包地址移除授权
      await testUtils.assertThrows(identityManager.authorize(originalCompanyIdAddr, authorizeCompanyAddr, {from: accounts[1]}))
    });
  });


  describe("Attest and modify identity's owner", function () {
    it("should be modify identity's attestLevel and add a new attestation record.", async function () {

      let identityManager = await testUtils.getIdentityManager();
      let svcNodeRegistry = await testUtils.getSvcNodeRegistry();

      let newIdAddr = await createIdentity(accounts[1]);
      let attestationSvc = await testUtils.createAndInitWithContract(AttestationSvc, ["Test Svc", newIdAddr], accounts[1]);
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_1", 1, {from: accounts[1]});
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_2", 2, {from: accounts[1]});
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_3", 3, {from: accounts[1]});
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_4", 4, {from: accounts[1]});
      svcNodeRegistry.register(attestationSvc.address, 6, 0, {from: accounts[1]});
      mlog.log("Create attestation service... ");

      let idAddr = await createIdentity(accounts[0]);
      let id = await Identity.at(idAddr);

      var signData1 = "SIGN_CONTRACT_4" + "true" + await id.idHash();
      var signResult = testUtils.signDataFunc(signData1, accounts[1]);
      mlog.log(idAddr, attestationSvc.address, "SIGN_CONTRACT_4", 4, "true", signResult.v, signResult.r, signResult.s);
      var tx = await identityManager.updateAttestLevel(idAddr, attestationSvc.address, "SIGN_CONTRACT_4", signResult.v, signResult.r, signResult.s);
      assert.equal(tx.logs[0].event, "IdAttestedLog");
    });

    it("should not be modify identity's attestLevel by lower attestLevel and add a new attestation record with failures.", async function () {
      let identityManager = await testUtils.getIdentityManager();
      let svcNodeRegistry = await testUtils.getSvcNodeRegistry();

      let newIdAddr = await createIdentity(accounts[1]);
      let attestationSvc = await testUtils.createAndInitWithContract(AttestationSvc, ["Test Svc", newIdAddr], accounts[1]);
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_1", 1, {from: accounts[1]});
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_2", 2, {from: accounts[1]});
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_3", 3, {from: accounts[1]});
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_4", 4, {from: accounts[1]});
      svcNodeRegistry.register(attestationSvc.address, 6, 0, {from: accounts[1]});
      mlog.log("Create attestation service... ");

      let idAddr = await createIdentity(accounts[0]);

      var signData1 = "SIGN_CONTRACT_4" + "true" + await Identity.at(idAddr).idHash();
      var signResult = testUtils.signDataFunc(signData1, accounts[1]);

      mlog.log("updateAttestLevel... ");
      var tx = await identityManager.updateAttestLevel(idAddr, attestationSvc.address, "SIGN_CONTRACT_4", signResult.v, signResult.r, signResult.s);
      mlog.log("result", print(tx.logs[0]), "accounts[1]:", accounts[1]);
      assert.equal(tx.logs[0].event, "IdAttestedLog");
      assert.equal(await Identity.at(idAddr).attestLevel(), 4);

      signData1 = "SIGN_CONTRACT_2" + "true" + await Identity.at(idAddr).idHash();
      signResult = testUtils.signDataFunc(signData1, accounts[1]);
      let tx2 = await identityManager.updateAttestLevel(idAddr, attestationSvc.address, "SIGN_CONTRACT_2", signResult.v, signResult.r, signResult.s);
      assert.equal(tx.logs[0].event, "IdAttestedLog");
    });

    it("should be modify identity(individual)'s owner by greater attestLevel and add a new attestation record.", async function () {

      let identityManager = await testUtils.getIdentityManager();
      let svcNodeRegistry = await testUtils.getSvcNodeRegistry();

      let attestSvcAddr = await createIdentity(accounts[1]);
      let attestationSvc = await testUtils.createAndInitWithContract(AttestationSvc, ["Test Svc", attestSvcAddr], accounts[1]);

      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_1", 1, {from: accounts[1]});
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_2", 2, {from: accounts[1]});
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_3", 3, {from: accounts[1]});
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_4", 4, {from: accounts[1]});
      await svcNodeRegistry.register(attestationSvc.address, 6, 0, {from: accounts[1]});
      mlog.log("Create attestation service... ");

      let idAddr = await createIdentity(accounts[0]);

      var signData1 = "SIGN_CONTRACT_4" + "true" + await Identity.at(idAddr).idHash();
      var signResult = testUtils.signDataFunc(signData1, accounts[1]);
      var newOwner = accounts[2];
      await identityManager.resetOwner(idAddr, newOwner, attestationSvc.address, "SIGN_CONTRACT_4", signResult.v, signResult.r, signResult.s);
      assert.equal(await identityManager.owners(idAddr), newOwner);

    });


    it("should not be modify identity(individual)'s owner by lower attestLevel and add a new attestation record with failures.", async function () {

      let identityManager = await testUtils.getIdentityManager();
      let svcNodeRegistry = await testUtils.getSvcNodeRegistry();

      let attestSvcAddr = await createIdentity(accounts[1]);
      let attestationSvc = await testUtils.createAndInitWithContract(AttestationSvc, ["Test Svc", attestSvcAddr], accounts[1]);
       await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_1", 1, {from: accounts[1]});
       await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_2", 2, {from: accounts[1]});
       await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_3", 3, {from: accounts[1]});
       await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_4", 4, {from: accounts[1]});
       await svcNodeRegistry.register(attestationSvc.address, 6, 0, {from: accounts[1]});
      mlog.log("Create attestation service... ");

      let idAddr = await createIdentity(accounts[0]);

      var signData1 = "SIGN_CONTRACT_4" + "true" + await Identity.at(idAddr).idHash();
      var signResult = testUtils.signDataFunc(signData1, accounts[1]);
      var newOwner = accounts[2];
      await identityManager.resetOwner(idAddr, newOwner, attestationSvc.address, "SIGN_CONTRACT_4", signResult.v, signResult.r, signResult.s);
      assert.equal(await identityManager.owners(idAddr), newOwner);

      signData1 = "SIGN_CONTRACT_1" + "true" + await Identity.at(idAddr).idHash();
      signResult = testUtils.signDataFunc(signData1, accounts[1]);
      newOwner = accounts[3];

      await testUtils.assertThrows(identityManager.resetOwner(idAddr, newOwner, attestationSvc.address, "SIGN_CONTRACT_1", signResult.v, signResult.r, signResult.s) );
      assert.notEqual(await identityManager.owners(idAddr), newOwner);
    });

    it("should be modify identity(individual)'s owner by maxAttestLevel .", async function () {

      let identityManager = await testUtils.getIdentityManager();
      let svcNodeRegistry = await testUtils.getSvcNodeRegistry();

      let attestSvcAddr = await createIdentity(accounts[1]);
      let attestationSvc = await testUtils.createAndInitWithContract(AttestationSvc, ["Test Svc", attestSvcAddr], accounts[1]);
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_1", 1, {from: accounts[1]});
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_2", 2, {from: accounts[1]});
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_3", 3, {from: accounts[1]});
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_4", 4, {from: accounts[1]});
      await svcNodeRegistry.register(attestationSvc.address, 6, 0, {from: accounts[1]});
      mlog.log("Create attestation service... ");

      let idAddr = await createIdentity(accounts[0]);

      var signData1 = "SIGN_CONTRACT_4" + "true" + await Identity.at(idAddr).idHash();
      var signResult = testUtils.signDataFunc(signData1, accounts[1]);
      var newOwner = accounts[2];
      await identityManager.resetOwner(idAddr, newOwner, attestationSvc.address, "SIGN_CONTRACT_4", signResult.v, signResult.r, signResult.s);
      mlog.log("Identity owner is :", await identityManager.owners(idAddr));
      assert.equal(await identityManager.owners(idAddr), newOwner);

      signData1 = "SIGN_CONTRACT_4" + "true" + await Identity.at(idAddr).idHash();
      signResult = testUtils.signDataFunc(signData1, accounts[1]);
      newOwner = accounts[3];
      await identityManager.resetOwner(idAddr, newOwner, attestationSvc.address, "SIGN_CONTRACT_4", signResult.v, signResult.r, signResult.s);
      mlog.log("Identity owner is :", await identityManager.owners(idAddr));
      assert.equal(await identityManager.owners(idAddr), newOwner);

    });


    it("should be modify identity(company)'s owner by greater attestLevel and add a new attestation record with failures.", async function () {

      let identityManager = await testUtils.getIdentityManager();
      let svcNodeRegistry = await testUtils.getSvcNodeRegistry();

      let attestSvcAddr = await createIdentity(accounts[1]);
      let attestationSvc = await testUtils.createAndInitWithContract(AttestationSvc, ["Test Svc", attestSvcAddr], accounts[1]);
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_1", 1, {from: accounts[1]});
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_2", 2, {from: accounts[1]});
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_3", 3, {from: accounts[1]});
      await svcNodeRegistry.register(attestationSvc.address, 6, 0, {from: accounts[1]});
      mlog.log("Create attestation service... ");


      let idAddr = await createIdentity(accounts[0], true);

      var signData1 = "SIGN_CONTRACT_2" + "true" + await Identity.at(idAddr).idHash();
      var signResult = testUtils.signDataFunc(signData1, accounts[1]);
      var newOwner = await createIdentity(accounts[0], false);
      await identityManager.resetOwner(idAddr, newOwner, attestationSvc.address, "SIGN_CONTRACT_2", signResult.v, signResult.r, signResult.s);
      assert.equal(await identityManager.owners(idAddr), newOwner);


      signData1 = "SIGN_CONTRACT_3" + "true" + await Identity.at(idAddr).idHash();
      signResult = testUtils.signDataFunc(signData1, accounts[1]);
      newOwner = await createIdentity(accounts[1], false);
      await identityManager.resetOwner(idAddr, newOwner, attestationSvc.address, "SIGN_CONTRACT_3", signResult.v, signResult.r, signResult.s);
      assert.equal(await identityManager.owners(idAddr), newOwner);

    });

    it("should not be modify identity(company)'s owner by lower attestLevel and add a new attestation record with failures.", async function () {

      let identityManager = await testUtils.getIdentityManager();
      let svcNodeRegistry = await testUtils.getSvcNodeRegistry();

      let attestSvcAddr = await createIdentity(accounts[1]);
      let attestationSvc = await testUtils.createAndInitWithContract(AttestationSvc, ["Test Svc", attestSvcAddr], accounts[1]);
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_1", 1, {from: accounts[1]});
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_2", 2, {from: accounts[1]});
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_3", 3, {from: accounts[1]});
      await svcNodeRegistry.register(attestationSvc.address, 6, 0, {from: accounts[1]});
      mlog.log("Create attestation service... ");


      let idAddr = await createIdentity(accounts[0], true);

      var signData1 = "SIGN_CONTRACT_3" + "true" + await Identity.at(idAddr).idHash();
      var signResult = testUtils.signDataFunc(signData1, accounts[1]);
      var newOwner = await createIdentity(accounts[0], false);
      await identityManager.resetOwner(idAddr, newOwner, attestationSvc.address, "SIGN_CONTRACT_3", signResult.v, signResult.r, signResult.s);
      assert.equal(await identityManager.owners(idAddr), newOwner);

      signData1 = "SIGN_CONTRACT_2" + "true" + await Identity.at(idAddr).idHash();
      signResult = testUtils.signDataFunc(signData1, accounts[1]);
      newOwner = await createIdentity(accounts[0], false);
      await testUtils.assertThrows(identityManager.resetOwner(idAddr, newOwner, attestationSvc.address, "SIGN_CONTRACT_2", signResult.v, signResult.r, signResult.s) );
      assert.notEqual(await identityManager.owners(idAddr), newOwner);

    });

    it("should be modify identity(company)'s owner by maxAttestLevel and add a new attestation record with failures.", async function () {

      let identityManager = await testUtils.getIdentityManager();
      let svcNodeRegistry = await testUtils.getSvcNodeRegistry();

      let attestSvcAddr = await createIdentity(accounts[1]);
      let attestationSvc = await testUtils.createAndInitWithContract(AttestationSvc, ["Test Svc", attestSvcAddr], accounts[1]);
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_1", 1, {from: accounts[1]});
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_2", 2, {from: accounts[1]});
      await attestationSvc.addSupportedAttestationType("SIGN_CONTRACT_3", 3, {from: accounts[1]});
      await svcNodeRegistry.register(attestationSvc.address, 6, 0, {from: accounts[1]});
      mlog.log("Create attestation service... ");


      let idAddr = await createIdentity(accounts[0], true);

      var signData1 = "SIGN_CONTRACT_3" + "true" + await Identity.at(idAddr).idHash();
      var signResult = testUtils.signDataFunc(signData1, accounts[1]);
      var newOwner = await createIdentity(accounts[0], false);
      await identityManager.resetOwner(idAddr, newOwner, attestationSvc.address, "SIGN_CONTRACT_3", signResult.v, signResult.r, signResult.s);
      assert.equal(await identityManager.owners(idAddr), newOwner);

      signData1 = "SIGN_CONTRACT_3" + "true" + await Identity.at(idAddr).idHash();
      signResult = testUtils.signDataFunc(signData1, accounts[1]);
      newOwner = await createIdentity(accounts[0], false);
      await identityManager.resetOwner(idAddr, newOwner, attestationSvc.address, "SIGN_CONTRACT_3", signResult.v, signResult.r, signResult.s);
      assert.equal(await identityManager.owners(idAddr), newOwner);
    });

  });

  describe("Upgrade contract", function () {
    it("should be able to add new variable and change createIdentity logic", async function () {

      let fromAcct = accounts[0];

      mlog.log("Create and Init V1 ..");
      let proxy = await testUtils.createAndInit(IdentityManager, [await testUtils.getSvcNodeRegistry().address], accounts[0]);
      let idMgrV1Proxy = IdentityManager.at(proxy.address);

      let idMgrV2 = await IdentityManagerV2_NewFunc.new();
      let idMgV2Proxy = await IdentityManagerV2_NewFunc.at(proxy.address)

      mlog.log("Upgrade to V2 ..");
      await idMgrV1Proxy.upgradeTo(idMgrV2.address);

      mlog.log("Create id with idMgr V2 ..");
      let owner = accounts[0];
      let type = consts.IdentityType.INDIVIDUAL;
      let testId = "testid_" + Date.now();
      let testName = "testName_" + Date.now();
      let testIdSha3 = testUtils.keccak256(testId);
      let testNameSha3 = testUtils.keccak256(testName);
      mlog.log("Creating Identity with V2 IdMgr with idHash: ", last8(testIdSha3), " nameHash:", last8(testNameSha3), " type:", type, "owner: " + last8(owner), "fromAcct: " + last8(owner));
      if (!testUtils.anchorAttestSvcAccount) {
        throw new Error("Anchor attestation svc hasn't been initialize, you should init the service in before{} hook with 'initAnchorAttestationSvc(accounts[9])' in Truffle test.");
      }
      let signResult = testUtils.signDataFunc("attest_2_apply" + "true" + testIdSha3, testUtils.anchorAttestSvcAccount);

      let idproxy = await testUtils.createAndInit(Identity, [testIdSha3, testNameSha3, true, type, testUtils.defaultPubKey, testUtils.defaultNodeKey], fromAcct);
      let idProxied = await Identity.at(idproxy.address);

      mlog.log("Registering id to IdMgr ...");
      let tx = await idMgV2Proxy.registerIdentity(idProxied.address, owner, testUtils.anchorAttestSvcAddr, "attest_2_apply", signResult.v, signResult.r, signResult.s, {from: fromAcct});

      mlog.log("Verify new create id result and new idMgr state, tx.logs:", print(tx.logs));
      assert.equal(tx.logs.length, 2);
      assert.equal(tx.logs[0].args.owner, owner);
      assert.equal(await idMgV2Proxy.newUint(), 1);
    })

  })
})