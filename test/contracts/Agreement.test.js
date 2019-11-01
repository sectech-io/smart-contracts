'use strict';

import testUtils from '../support/truffle.test.utils';
import consts from '../support/consts';

var Agreement = artifacts.require("./Agreement.sol");
var AgreementV2_newLib = artifacts.require("./AgreementV2_newLib.sol");

var mlog = require("mocha-logger");

contract('Agreement', function(accounts) {

  before(async () => {
      await testUtils.initTestEnv(accounts[9]);
    }
  );

  describe("Create Agreement", function() {
    it("should be able to create and initialize Agreement successfully", async function () {

      mlog.log("Create 4 Identities ..");
      let results = await testUtils.createIdentityInBatch([
        { type: consts.IdentityType.COMPANY, owner: accounts[0] },
        { type: consts.IdentityType.COMPANY, owner: accounts[1] },
        { type: consts.IdentityType.COMPANY, owner: accounts[2] },
        { type: consts.IdentityType.COMPANY, owner: accounts[3] }
      ]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;
      let idAddr4 = results[3].idAddr;

      let participants = [idAddr1, idAddr2, idAddr3, idAddr4];
      let roles = [0, 1, 2, 3];
      let approvalWorkflow = [idAddr1, idAddr2];
      let proxy = await testUtils.createAndInit(Agreement, [idAddr1, participants, roles, approvalWorkflow, "encryptKey"], accounts[0], testUtils.privateForNodes);
      let agreement = Agreement.at(proxy.address);

      mlog.log("Created Agreement, address:", agreement.address);
      assert.equal(await agreement.owner(), idAddr1);
      assert.equal(await agreement.getParticipantsCount(), 4);
      assert.equal(await agreement.participants(0), idAddr1);
      assert.equal(await agreement.participants(1), idAddr2);
      assert.equal(await agreement.participants(2), idAddr3);
      assert.equal(await agreement.participants(3), idAddr4);

      mlog.log("Verify participants status..");
      assert.equal(await agreement.participantStatus(idAddr1), consts.Agreement.Status.ACCEPTED);
      assert.equal(await agreement.participantStatus(idAddr2), consts.Agreement.Status.PENDING);
      assert.equal(await agreement.participantStatus(idAddr3), consts.Agreement.Status.PENDING);
      assert.equal(await agreement.participantStatus(idAddr4), consts.Agreement.Status.PENDING);

      mlog.log("Verify approvers ..");
      assert.equal(await agreement.getApproverCount(), 2);
      assert.equal(await agreement.approvalWorkflow(0), idAddr1);
      assert.equal(await agreement.approvalWorkflow(1), idAddr2);

      assert.equal(await agreement.roles(idAddr1), 0);
      assert.equal(await agreement.roles(idAddr2), 1);
      assert.equal(await agreement.roles(idAddr3), 2);
      assert.equal(await agreement.roles(idAddr4), 3);

      let allAttrs = await agreement.getAllAttrs();
      mlog.log("getAllAttrs() returned:", JSON.stringify(allAttrs, null, 2));
      assert.equal(allAttrs[0], idAddr1);
      assert.equal(allAttrs[1], participants.length);
      assert.equal(allAttrs[2], approvalWorkflow.length);
      assert.equal(allAttrs[3], 0);
      assert.equal(allAttrs[4], "encryptKey");

      mlog.log("setParticipantName", idAddr3, results[2].name);
      await agreement.setParticipantName(idAddr3, results[2].name, {privateFor: testUtils.privateForNodes});

      let participantInfo = await agreement.getParticipantInfo(2);
      mlog.log("getParticipantInfo() returned:", JSON.stringify(participantInfo, null, 2));
      assert.equal(participantInfo[0], idAddr3);
      assert.equal(participantInfo[1], 2);
      assert.equal(participantInfo[2], consts.Agreement.Status.PENDING);
      assert.equal(participantInfo[3], results[2].name);
    });

    it("should be able to get agreement createdTime", async function () {

      mlog.log("Create 4 Identities ..");
      let results = await testUtils.createIdentityInBatch([
        { type: consts.IdentityType.COMPANY, owner: accounts[0] },
        { type: consts.IdentityType.COMPANY, owner: accounts[1] },
        { type: consts.IdentityType.COMPANY, owner: accounts[2] },
        { type: consts.IdentityType.COMPANY, owner: accounts[3] }
      ]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;
      let idAddr4 = results[3].idAddr;

      let participants = [idAddr1, idAddr2, idAddr3, idAddr4];
      let roles = [0, 1, 2, 3];
      let approvalWorkflow = [idAddr1, idAddr2];
      let proxy = await testUtils.createAndInit(Agreement, [idAddr1, participants, roles, approvalWorkflow, "encryptKey"], accounts[0], testUtils.privateForNodes);
      let agreement = Agreement.at(proxy.address);

      mlog.log("Created Agreement, address:", agreement.address);
      let createdTime = await agreement.createdTime();
      mlog.log("Agreement createdTime:", createdTime);
      assert.ok(createdTime);
    });

    it("should not be able to set participant name with sha3(name) != id.nameHash", async function() {
      mlog.log("Create 4 Identities ..");
      let results = await testUtils.createIdentityInBatch([{
        type: consts.IdentityType.COMPANY, owner: accounts[0]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[1]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[2]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[3]
      }]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;
      let idAddr4 = results[3].idAddr;

      let participants = [idAddr1, idAddr2, idAddr3, idAddr4];
      let roles = [0, 1, 2, 3];
      let approvalWorkflow = [idAddr1, idAddr2];
      let proxy = await testUtils.createAndInit(Agreement, [idAddr1, participants, roles, approvalWorkflow, "encryptKey"], accounts[0], testUtils.privateForNodes);
      let agreement = Agreement.at(proxy.address);
      mlog.log("Created Agreement, address:", agreement.address);

      mlog.log("Setting participant ..");
      await testUtils.assertThrows(agreement.setParticipantName(idAddr3, results[2].name + "dsdsldjsld", {privateFor: testUtils.privateForNodes})); // incorrect name
    });

    it("should not able to create Agreement if participants.length != roles.length", async function() {

      mlog.log("Create 4 Identities ..");
      let results = await testUtils.createIdentityInBatch([{
        type: consts.IdentityType.COMPANY, owner: accounts[0]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[1]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[2]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[3]
      }]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;
      let idAddr4 = results[3].idAddr;

      mlog.log("Have 4 participant ");
      let participants = [idAddr1, idAddr2, idAddr3, idAddr4];

      mlog.log("But only has 3 roles");
      let roles = [0, 1, 2];
      let approvalWorkflow = [idAddr1, idAddr2];
      mlog.log("So it should throw exception ...");

      await testUtils.assertThrows(testUtils.createAndInit(Agreement, [idAddr1, participants, roles, approvalWorkflow, "encryptKey"], accounts[0], testUtils.privateForNodes));
    });

    it("should not able to create Agreement if there are duplicated participants", async function() {

      mlog.log("Create 4 Identities ..");
      let results = await testUtils.createIdentityInBatch([{
        type: consts.IdentityType.COMPANY, owner: accounts[0]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[1]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[2]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[3]
      }]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;
      let idAddr4 = results[3].idAddr;

      mlog.log("Have duplicated participants");
      let participants = [idAddr1, idAddr2, idAddr3, idAddr3];
      let roles = [0, 1, 2, 3];
      let approvalWorkflow = [idAddr1, idAddr2];
      mlog.log("So it should throw exception ...");
      await testUtils.assertThrows(testUtils.createAndInit(Agreement, [idAddr1, participants, roles, approvalWorkflow, "encryptKey"], accounts[0], testUtils.privateForNodes));

    });

    it("should not able to create Agreement if there are duplicated id in approvalWorkflow", async function() {
      mlog.log("Create 4 Identities ..");
      let results = await testUtils.createIdentityInBatch([{
        type: consts.IdentityType.COMPANY, owner: accounts[0]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[1]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[2]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[3]
      }]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;
      let idAddr4 = results[3].idAddr;

      let participants = [idAddr1, idAddr2, idAddr3, idAddr4];
      let roles = [0, 1, 2, 3];

      mlog.log("Have duplicated participants");
      let approvalWorkflow = [idAddr1, idAddr1];
      mlog.log("So it should throw exception ...");
      await testUtils.assertThrows(testUtils.createAndInit(Agreement, [idAddr1, participants, roles, approvalWorkflow, "encryptKey"], accounts[0], testUtils.privateForNodes));
    });

    it("should not able to create Agreement if participant doesn't include all the values in approvalWorkflow", async function() {
      mlog.log("Create 4 Identities ..");
      let results = await testUtils.createIdentityInBatch([{
        type: consts.IdentityType.COMPANY, owner: accounts[0]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[1]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[2]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[3]
      }]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;
      let idAddr4 = results[3].idAddr;

      mlog.log("Have 2 participants");
      let participants = [idAddr1, idAddr2];
      let roles = [0, 1];

      mlog.log("Have approver that not in participant list");
      let approvalWorkflow = [idAddr1, idAddr3];

      mlog.log("So it should throw exception ...");
      await testUtils.assertThrows(testUtils.createAndInit(Agreement, [idAddr1, participants, roles, approvalWorkflow, "encryptKey"], accounts[0], testUtils.privateForNodes));

    });

    it("should be able to set approval sequence by the owner if requirements met", async function() {

      mlog.log("Create 4 Identities ..");
      let results = await testUtils.createIdentityInBatch([{
        type: consts.IdentityType.COMPANY, owner: accounts[0]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[1]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[2]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[3]
      }]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;
      let idAddr4 = results[3].idAddr;

      let participants = [idAddr1, idAddr2, idAddr3, idAddr4];
      let roles = [0, 1, 2, 3];
      let approvalWorkflow = [idAddr1, idAddr3];

      let proxy = await testUtils.createAndInit(Agreement, [idAddr1, participants, roles, approvalWorkflow, "encryptKey"], accounts[0], testUtils.privateForNodes);
      let agreement = Agreement.at(proxy.address);

      mlog.log("Created Agreement, address:", agreement.address);

      mlog.log("Changing approval sequence...");
      await agreement.setApprovalWorkflow([idAddr3, idAddr2, idAddr1], {privateFor: testUtils.privateForNodes});

      mlog.log("Verify result ...", agreement.address);
      assert.equal(await agreement.getApproverCount(), 3);
      assert.equal(await agreement.approvalWorkflow(0), idAddr3);
      assert.equal(await agreement.approvalWorkflow(1), idAddr2);
      assert.equal(await agreement.approvalWorkflow(2), idAddr1);

    });

    it("should be able to set approval sequence by the authorized id from owner if requirements met", async function() {
      mlog.log("Create 4 Identities ..");
      let results = await testUtils.createIdentityInBatch([{
        type: consts.IdentityType.COMPANY, owner: accounts[0]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[1]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[2]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[3]
      }]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;
      let idAddr4 = results[3].idAddr;

      let participants = [idAddr1, idAddr2, idAddr3, idAddr4];
      let roles = [0, 1, 2, 3];
      let approvalWorkflow = [idAddr1, idAddr3];

      let proxy = await testUtils.createAndInit(Agreement, [idAddr1, participants, roles, approvalWorkflow, "encryptKey"], accounts[0], testUtils.privateForNodes);
      let agreement = Agreement.at(proxy.address);
      mlog.log("Created Agreement, address:", agreement.address);

      await testUtils.authorize(idAddr1, idAddr4, accounts[0]);

      mlog.log("Changing approval sequence by authorized id...");
      await agreement.setApprovalWorkflow([idAddr3, idAddr2, idAddr1], { from: accounts[3], privateFor: testUtils.privateForNodes });

      mlog.log("Verify result ...", agreement.address);
      assert.equal(await agreement.getApproverCount(), 3);
      assert.equal(await agreement.approvalWorkflow(0), idAddr3);
      assert.equal(await agreement.approvalWorkflow(1), idAddr2);
      assert.equal(await agreement.approvalWorkflow(2), idAddr1);
    });

    it("should not able to set approval sequence there is duplicated value in approvalWorkflow", async function() {

      mlog.log("Create 4 Identities ..");
      let results = await testUtils.createIdentityInBatch([{
        type: consts.IdentityType.COMPANY, owner: accounts[0]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[1]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[2]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[3]
      }]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;
      let idAddr4 = results[3].idAddr;

      let participants = [idAddr1, idAddr2, idAddr3, idAddr4];
      let roles = [0, 1, 2, 3];
      let approvalWorkflow = [idAddr1, idAddr3];

      let proxy = await testUtils.createAndInit(Agreement, [idAddr1, participants, roles, approvalWorkflow, "encryptKey"], accounts[0], testUtils.privateForNodes);
      let agreement = Agreement.at(proxy.address);
      mlog.log("Created Agreement, address:", agreement.address);

      mlog.log("Changing approval sequence with duplicated values, then it should throw exception");
      await testUtils.assertThrows(agreement.setApprovalWorkflow([idAddr3, idAddr3], {privateFor: testUtils.privateForNodes}));

    });

    it("should not able to set approval sequence if participant doesn't include all the values in new approvalWorkflow", async function() {

      mlog.log("Create 4 Identities ..");
      let results = await testUtils.createIdentityInBatch([{
        type: consts.IdentityType.COMPANY, owner: accounts[0]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[1]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[2]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[3]
      }]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;
      let idAddr4 = results[3].idAddr;

      let participants = [idAddr1, idAddr2, idAddr3];
      let roles = [0, 1, 2];
      let approvalWorkflow = [idAddr1, idAddr3];
      let proxy = await testUtils.createAndInit(Agreement, [idAddr1, participants, roles, approvalWorkflow, "encryptKey"], accounts[0], testUtils.privateForNodes);
      let agreement = Agreement.at(proxy.address);
      mlog.log("Created Agreement, address:", agreement.address);

      mlog.log("Changing approval sequence with values in new approvalWorkflow that in participant lists, it should throw exception");
      await testUtils.assertThrows(agreement.setApprovalWorkflow([idAddr3, idAddr4], {privateFor: testUtils.privateForNodes}));

    });

    it("should be able to update exisiting product config with history updated correctly", async function() {

      mlog.log("Create 4 Identities ..");
      let results = await testUtils.createIdentityInBatch([{
        type: consts.IdentityType.COMPANY, owner: accounts[0]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[1]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[2]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[3]
      }]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;
      let idAddr4 = results[3].idAddr;

      let participants = [idAddr1, idAddr2, idAddr3];
      let roles = [0, 1, 2];
      let approvalWorkflow = [idAddr1, idAddr3];
      let proxy = await testUtils.createAndInit(Agreement, [idAddr1, participants, roles, approvalWorkflow, "encryptKey"], accounts[0], testUtils.privateForNodes);
      let agreement = Agreement.at(proxy.address);
      mlog.log("Created Agreement, address:", agreement.address);

      mlog.log("Updateing product config ... ");
      await agreement.updateProductConfig("1", "QmZRAHmUL3GN3HyNJWEHx66ZoGZKNN9JH1sDd7KYj5MBwn", true, {privateFor: testUtils.privateForNodes});

      mlog.log("Updateing product config again... ");
      await agreement.updateProductConfig("1", "QmZRAHmUL3GN3HyNJWEHx66ZoGZKNN9JH1sDd7KYj5MBwn.1", true, {privateFor: testUtils.privateForNodes});

      mlog.log("Verifying result ... ");
      assert.equal(await agreement.getProductConfigHistoryCount("1"), 2);
      let olderHistory = await agreement.getProductConfigHistory("1", 0);
      assert.equal(olderHistory[0], "QmZRAHmUL3GN3HyNJWEHx66ZoGZKNN9JH1sDd7KYj5MBwn");
      let newerHistory = await agreement.getProductConfigHistory("1", 1);
      assert.equal(newerHistory[0], "QmZRAHmUL3GN3HyNJWEHx66ZoGZKNN9JH1sDd7KYj5MBwn.1");
      assert.ok(newerHistory[1] >= olderHistory[1]);

    });

    it("should not allow anyone other than owner and the authorized id to update product config", async function() {
      mlog.log("Create 4 Identities ..");
      let results = await testUtils.createIdentityInBatch([{
        type: consts.IdentityType.COMPANY, owner: accounts[0]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[1]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[2]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[3]
      }]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;

      let participants = [idAddr1, idAddr2, idAddr3];
      let roles = [0, 1, 2];
      let approvalWorkflow = [idAddr1, idAddr3];
      let proxy = await testUtils.createAndInit(Agreement, [idAddr1, participants, roles, approvalWorkflow, "encryptKey"], accounts[0], testUtils.privateForNodes);
      let agreement = Agreement.at(proxy.address);
      mlog.log("Created Agreement, address:", agreement.address);

      mlog.log("Updateing product config with account other than owner, so it should throw exception... ");
      await testUtils.assertThrows(agreement.updateProductConfig("1", "QmZRAHmUL3GN3HyNJWEHx66ZoGZKNN9JH1sDd7KYj5MBwn", true, { from: accounts[1], privateFor: testUtils.privateForNodes }));
    });

    it("should allow authorized id from owner to update product config", async function() {
      mlog.log("Create 4 Identities ..");
      let results = await testUtils.createIdentityInBatch([{
        type: consts.IdentityType.COMPANY, owner: accounts[0]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[1]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[2]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[3]
      }]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;
      let idAddr4 = results[3].idAddr;

      let participants = [idAddr1, idAddr2, idAddr3];
      let roles = [0, 1, 2];
      let approvalWorkflow = [idAddr1, idAddr3];
      let proxy = await testUtils.createAndInit(Agreement, [idAddr1, participants, roles, approvalWorkflow, "encryptKey"], accounts[0], testUtils.privateForNodes);
      let agreement = Agreement.at(proxy.address);
      mlog.log("Created Agreement, address:", agreement.address);

      await testUtils.authorize(idAddr1, idAddr4, accounts[0]);

      mlog.log("Updateing product config ... ");
      await agreement.updateProductConfig("1", "QmZRAHmUL3GN3HyNJWEHx66ZoGZKNN9JH1sDd7KYj5MBwn", true, { from: accounts[3], privateFor: testUtils.privateForNodes });

      mlog.log("Updateing product config again... ");
      await agreement.updateProductConfig("1", "QmZRAHmUL3GN3HyNJWEHx66ZoGZKNN9JH1sDd7KYj5MBwn.1", true, { from: accounts[3], privateFor: testUtils.privateForNodes });

      mlog.log("Verifying result ... ");
      assert.equal(await agreement.getProductConfigHistoryCount("1"), 2);
      let olderHistory = await agreement.getProductConfigHistory("1", 0);
      assert.equal(olderHistory[0], "QmZRAHmUL3GN3HyNJWEHx66ZoGZKNN9JH1sDd7KYj5MBwn");
      let newerHistory = await agreement.getProductConfigHistory("1", 1);
      assert.equal(newerHistory[0], "QmZRAHmUL3GN3HyNJWEHx66ZoGZKNN9JH1sDd7KYj5MBwn.1");
      assert.ok(newerHistory[1] >= olderHistory[1]);
    });


    it("should be set product config to be opened", async function() {

      mlog.log("Create 4 Identities ..");
      let results = await testUtils.createIdentityInBatch([{
        type: consts.IdentityType.COMPANY, owner: accounts[0]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[1]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[2]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[3]
      }]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;


      let participants = [idAddr1, idAddr2, idAddr3];
      let roles = [0, 1, 2];
      let approvalWorkflow = [idAddr1, idAddr3];
      let proxy = await testUtils.createAndInit(Agreement, [idAddr1, participants, roles, approvalWorkflow, "encryptKey"], accounts[0], testUtils.privateForNodes);
      let agreement = Agreement.at(proxy.address);
      mlog.log("Created Agreement, address:", agreement.address);

      mlog.log("Updateing product config ... ");
      await agreement.updateProductConfig("1", "QmZRAHmUL3GN3HyNJWEHx66ZoGZKNN9JH1sDd7KYj5MBwn", false, {privateFor: testUtils.privateForNodes});

      mlog.log("Verifying default isOpened = false");
      let productConfig = await agreement.getProductConfig("1");
      assert.equal(productConfig[1], false);

      mlog.log("Updateing product config isOpened... ");
      await agreement.setProductConfigOpened("1", true, {privateFor: testUtils.privateForNodes});

      mlog.log("Verifying again isOpened = true");
      let productConfig1 = await agreement.getProductConfig("1");
      assert.equal(productConfig1[1], true);

    });

    it("should be able set participant status by participant itself", async function() {

      mlog.log("Create 4 Identities ..");
      let results = await testUtils.createIdentityInBatch([{
        type: consts.IdentityType.COMPANY, owner: accounts[0]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[1]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[2]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[3]
      }]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;
      let idAddr4 = results[3].idAddr;

      let participants = [idAddr1, idAddr2, idAddr3];
      let roles = [0, 1, 2];
      let approvalWorkflow = [idAddr1, idAddr3];
      let proxy = await testUtils.createAndInit(Agreement, [idAddr1, participants, roles, approvalWorkflow, "encryptKey"], accounts[0], testUtils.privateForNodes);
      let agreement = Agreement.at(proxy.address);
      mlog.log("Created Agreement, address:", agreement.address);

      mlog.log("Verifying participant status = PENDING");
      assert.equal(await agreement.participantStatus(idAddr2), consts.Agreement.Status.PENDING);

      mlog.log("Updateing participant status to be ACCEPTED... ");
      await agreement.setParticipantStatus(idAddr2, consts.Agreement.Status.ACCEPTED, { from: accounts[1], privateFor: testUtils.privateForNodes});

      mlog.log("Verifying again participant status = ACCEPTED");
      assert.equal(await agreement.participantStatus(idAddr2), consts.Agreement.Status.ACCEPTED);
    });

    it("should not be able set participant status other than participant itself", async function() {

      mlog.log("Create 4 Identities ..");
      let results = await testUtils.createIdentityInBatch([{
        type: consts.IdentityType.COMPANY, owner: accounts[0]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[1]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[2]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[3]
      }]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;
      let idAddr4 = results[3].idAddr;

      let participants = [idAddr1, idAddr2, idAddr3];
      let roles = [0, 1, 2];
      let approvalWorkflow = [idAddr1, idAddr3];
      let proxy = await testUtils.createAndInit(Agreement, [idAddr1, participants, roles, approvalWorkflow, "encryptKey"], accounts[0], testUtils.privateForNodes);
      let agreement = Agreement.at(proxy.address);
      mlog.log("Created Agreement, address:", agreement.address);

      mlog.log("Verifying participant status = PENDING");
      assert.equal(await agreement.participantStatus(idAddr2), consts.Agreement.Status.PENDING);

      mlog.log("Updateing participant status other than owner, so it should throw exception... ");
      await testUtils.assertThrows(agreement.setParticipantStatus(idAddr2, consts.Agreement.Status.ACCEPTED, { from: accounts[0], privateFor: testUtils.privateForNodes}));
    });
  })
  describe("Manage Status", function() {
    it("should be able get agreement overall status", async function() {

      mlog.log("Create 4 Identities ..");
      let results = await testUtils.createIdentityInBatch([{
        type: consts.IdentityType.COMPANY, owner: accounts[0]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[1]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[2]
      }]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;

      let participants = [idAddr1, idAddr2, idAddr3];
      let roles = [0, 1, 2];
      let approvalWorkflow = [idAddr1, idAddr3];
      let proxy = await testUtils.createAndInit(Agreement, [idAddr1, participants, roles, approvalWorkflow, "encryptKey"], accounts[0], testUtils.privateForNodes);
      let agreement = Agreement.at(proxy.address);
      mlog.log("Created Agreement, address:", agreement.address);

      //assert.equal(await agreement.getOverallStatus(), consts.Agreement.Status.PENDING);

      mlog.log("Updating one participant status to be ACCEPTED... ");
      await agreement.setParticipantStatus(idAddr2, consts.Agreement.Status.ACCEPTED, { from: accounts[1], privateFor: testUtils.privateForNodes });

      mlog.log("Overall Status should still be PENDING.. ");
      assert.equal(await agreement.getOverallStatus(), consts.Agreement.Status.PENDING);

      mlog.log("Updating all other participant status to be ACCEPTED... ");
      await agreement.setParticipantStatus(idAddr1, consts.Agreement.Status.ACCEPTED, { from: accounts[0], privateFor: testUtils.privateForNodes });
      await agreement.setParticipantStatus(idAddr3, consts.Agreement.Status.ACCEPTED, { from: accounts[2], privateFor: testUtils.privateForNodes });

      mlog.log("Overall Status should still be ACCEPTED.. ");
      assert.equal(await agreement.getOverallStatus(), consts.Agreement.Status.ACCEPTED);

      mlog.log("Updating one participant status to be REJECTED... ");
      await agreement.setParticipantStatus(idAddr3, consts.Agreement.Status.REJECTED, { from: accounts[2], privateFor: testUtils.privateForNodes });
      assert.equal(await agreement.getOverallStatus(), consts.Agreement.Status.REJECTED);

      mlog.log("Updating one participant status to be EXITED... ");
      await agreement.setParticipantStatus(idAddr3, consts.Agreement.Status.EXITED, { from: accounts[2], privateFor: testUtils.privateForNodes });
      assert.equal(await agreement.getOverallStatus(), consts.Agreement.Status.EXITED);

      mlog.log("Updating one participant status to be ACCEPTED... ");
      await agreement.setParticipantStatus(idAddr3, consts.Agreement.Status.ACCEPTED, { from: accounts[2], privateFor: testUtils.privateForNodes });
      assert.equal(await agreement.getOverallStatus(), consts.Agreement.Status.ACCEPTED);

    });
  })

  describe("Manage PrivateFor", function() {
    it("should be able to add and remove privateFor", async function() {
      mlog.log("Create 4 Identities ..");
      let results = await testUtils.createIdentityInBatch([{
        type: consts.IdentityType.COMPANY, owner: accounts[0]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[1]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[2]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[3]
      }]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;

      let participants = [idAddr1, idAddr2, idAddr3];
      let roles = [0, 1, 2];
      let approvalWorkflow = [idAddr1, idAddr3];
      let proxy = await testUtils.createAndInit(Agreement, [idAddr1, participants, roles, approvalWorkflow, "encryptKey"], accounts[0], testUtils.privateForNodes);
      let agreement = Agreement.at(proxy.address);
      mlog.log("Created Agreement, address:", agreement.address);

      mlog.log("Add privateFor ..");
      await agreement.addPrivateFor("Node1", {privateFor: testUtils.privateForNodes});
      await agreement.addPrivateFor("Node2", {privateFor: testUtils.privateForNodes});
      assert.equal(await agreement.privateForCount(), 2);

      mlog.log("Remove privateFor ..");
      await agreement.removePrivateFor("Node2", {privateFor: testUtils.privateForNodes});
      assert.equal(await agreement.privateForCount(), 1);
    });
  })

  describe("Upgrade Contract", function() {
    it("Test Upgrade", async function() {
      mlog.log("Create 4 Identities ..");
      let results = await testUtils.createIdentityInBatch([{
        type: consts.IdentityType.COMPANY, owner: accounts[0]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[1]
      }, {
        type: consts.IdentityType.COMPANY, owner: accounts[2]
      }]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;

      let participants = [idAddr1, idAddr2, idAddr3];
      let roles = [0, 1, 2];
      let approvalWorkflow = [idAddr1, idAddr3];
      let proxy = await testUtils.createAndInit(Agreement, [idAddr1, participants, roles, approvalWorkflow, "encryptKey"], accounts[0], testUtils.privateForNodes);
      let agreement = Agreement.at(proxy.address);
      mlog.log("Created Agreement V1, address:", agreement.address);

      let svcV2 = await AgreementV2_newLib.new({privateFor: testUtils.privateForNodes});
      let svcV2Proxy = AgreementV2_newLib.at(proxy.address)

      mlog.log("Upgrade to V2 ..");
      await proxy.upgradeTo(svcV2.address, {privateFor: testUtils.privateForNodes});
      await svcV2Proxy.setApprovalWorkflow([idAddr3, idAddr2, idAddr1], {privateFor: testUtils.privateForNodes});
      assert.equal(await svcV2Proxy.newValue(), 5);
    })
  });
})