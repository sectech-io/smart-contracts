'use strict';

import testUtils from '../support/truffle.test.utils';
import consts from '../support/consts';
import mlog from 'mocha-logger'

var CreditLine = artifacts.require("./CreditLine.sol");
var CreditLineV2_OverrideFunc = artifacts.require("./CreditLineV2_OverrideFunc.sol");
var Loan = artifacts.require("./Loan.sol");

var print = testUtils.print;
var noDelegate = "0x00"; //Use address 0x00 to indicate the action is directlyfrom the approver, not from delegate

contract('CreditLine', function (accounts) {

  before(async () => {
      await testUtils.initTestEnv(accounts[9]);
    }
  );

  describe("Create CreditLine", function () {
    it("should be able to create credit line by owner of borrower successfully", async function () {
      let agreementResult = await testUtils.createAgreement(accounts);
      let agreementAddr = agreementResult.agreement.address;
      mlog.log("Created agreement:", agreementAddr);

      let borrowerCompanyOwner = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[5]);
      let borrowerCompany = await testUtils.createIdentity(consts.IdentityType.COMPANY, borrowerCompanyOwner, accounts[5]);

      let productId = "1";
      let desEncryptionKey = "1233910u1";
      mlog.log("Creating creditLine... ");
      let proxy = await testUtils.createAndInit(CreditLine, [agreementAddr, borrowerCompany, borrowerCompanyOwner, "1", desEncryptionKey], accounts[5], testUtils.privateForNodes);
      let creditLine = CreditLine.at(proxy.address);

      mlog.log("Submitting creditLine... ");
      await creditLine.submit(borrowerCompany, borrowerCompanyOwner, 500000, {
        from: accounts[5],
        privateFor: testUtils.privateForNodes
      });

      mlog.log("Verifying result... ");
      let expectedParticipantCount = agreementResult.participants.length + 1; // participants from agreement plus borrower
      assert.equal(await creditLine.owner(), borrowerCompany);
      assert.equal(await creditLine.agreement(), agreementAddr);
      assert.equal(await creditLine.productId(), productId);
      assert.equal(await creditLine.getEncryptionKey(), desEncryptionKey);

      mlog.log("Verifying participants... ");
      assert.equal(await creditLine.participants(0), agreementResult.participants[0]);
      assert.equal(await creditLine.participants(1), agreementResult.participants[1]);
      assert.equal(await creditLine.participants(2), agreementResult.participants[2]);
      assert.equal(expectedParticipantCount, await creditLine.getParticipantCount());

      mlog.log("Verifying approval workflow... ");

      assert.equal(await creditLine.approvalWorkflow(0), borrowerCompany); // should be borrower
      assert.equal(await creditLine.approvalWorkflow(1), agreementResult.approvalWorkflow[0]);
      assert.equal(await creditLine.approvalWorkflow(2), agreementResult.approvalWorkflow[1]);
      assert.equal(await creditLine.getApproverCount(), 3);
      assert.ok(await creditLine.createdTime());

      let allAttrs = await creditLine.getAllAttributes();
      mlog.log("getAllAttributes() returned", JSON.stringify(allAttrs, null, 2));

      assert.equal(allAttrs[0], borrowerCompany);
      assert.equal(allAttrs[1], agreementAddr);
      assert.equal(allAttrs[2], productId);
      assert.equal(allAttrs[3], desEncryptionKey);
      assert.ok(allAttrs[4]); // createdTime
      assert.equal(allAttrs[5], expectedParticipantCount);
      assert.equal(allAttrs[6], agreementResult.approvalWorkflow.length + 1);
      assert.equal(allAttrs[7], "0"); // loans
      assert.equal(allAttrs[8], "0"); // data
      assert.equal(allAttrs[9], "1"); // history

      let participantInfo = await creditLine.getParticipantInfo(1);
      mlog.log("getParticipantInfo() returned", JSON.stringify(participantInfo, null, 2));
      assert.equal(participantInfo[0], agreementResult.participants[1]);
      assert.equal(participantInfo[1], "2");
      assert.equal(participantInfo[2], 0);
    });

    it("should be able to create credit line by delegate of borrower successfully", async function () {
      let agreementResult = await testUtils.createAgreement(accounts);
      let agreementAddr = agreementResult.agreement.address;
      mlog.log("Created agreement:", agreementAddr);

      let borrowerCompanyOwner = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[4]);
      let borrowerCompany = await testUtils.createIdentity(consts.IdentityType.COMPANY, borrowerCompanyOwner, accounts[5]);
      let borrowerDelegate = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[7]);
      testUtils.authorize(borrowerCompany, borrowerDelegate, accounts[4]);

      //TODO Don't konw why but it has to run "testUtils.getIdentityManager()" to get this test passed. will check later
      let identityManager = await testUtils.getIdentityManager();
      mlog.log("identityManager.isOwnerOrAuthorized(borrowerCompany, accounts[7])", await identityManager.isOwnerOrAuthorized(borrowerCompany, accounts[7]));

      let productId = "1";
      let desEncryptionKey = "1233910u1";

      mlog.log("Creating credit line...");
      let proxy = await testUtils.createAndInit(CreditLine, [agreementAddr, borrowerCompany, borrowerDelegate, productId, desEncryptionKey], accounts[7], testUtils.privateForNodes);
      let creditLine = CreditLine.at(proxy.address);

      mlog.log("Submitting credit line");
      await creditLine.submit(borrowerCompany, borrowerDelegate, 500000, {
        from: accounts[7],
        privateFor: testUtils.privateForNodes
      });
    });
  })
  describe("Submit and approval", function () {
    it("should be able to approve by approver", async function () {
      let agreementResult = await testUtils.createAgreement(accounts);
      let agreementAddr = agreementResult.agreement.address;
      mlog.log("Created agreement:", agreementAddr);

      let borrower = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[6]);
      let productId = "1";
      let desEncryptionKey = "1233910u1";
      let proxy = await testUtils.createAndInit(CreditLine, [agreementAddr, borrower, consts.ZERO_ADDRESS, "1", desEncryptionKey], accounts[6], testUtils.privateForNodes);
      let creditLine = CreditLine.at(proxy.address);

      await creditLine.submit(borrower, "0", 500000, {from: accounts[6], privateFor: testUtils.privateForNodes});
      assert.equal(await creditLine.getOverallStatus(), consts.CreditLine.Status.PENDING);

      mlog.log("Created Credit Line:", creditLine.address);

      mlog.log("Approving by approver:", agreementResult.approvalWorkflow[0]);
      let tx1 = await creditLine.action(agreementResult.approvalWorkflow[0], noDelegate, true, 3000, "Remarks", {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(tx1.logs[0].event, "ActionEvent");
      assert.equal(tx1.logs[0].args.approver, agreementResult.approvalWorkflow[0]);
      assert.equal(tx1.logs[0].args.actionId, "1");
      assert.equal(await creditLine.getOverallStatus(), consts.CreditLine.Status.PENDING);

      mlog.log("Approved by approver:", agreementResult.approvalWorkflow[1]);
      let tx2 = await creditLine.action(agreementResult.approvalWorkflow[1], noDelegate, true, 2000, "Remarks", {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(tx2.logs[0].event, "ActionEvent");
      assert.equal(tx2.logs[0].args.approver, agreementResult.approvalWorkflow[1]);
      assert.equal(tx2.logs[0].args.actionId, "2");
      assert.equal(await creditLine.getOverallStatus(), consts.CreditLine.Status.APPROVED);

      assert.ok(await creditLine.isOpened());
      assert.equal(await creditLine.getAvailableAmount(), 2000);

    });

    it("should be able to approve by approver's delegate", async function () {
      let agreementResult = await testUtils.createAgreement(accounts);
      let agreementAddr = agreementResult.agreement.address;
      mlog.log("Created agreement:", agreementAddr);

      mlog.log("Authorizing delegate to id:", agreementResult.approvalWorkflow[0]);
      let identityManager = await testUtils.getIdentityManager();
      let delegateId = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[1]);
      await identityManager.authorize(agreementResult.approvalWorkflow[0], delegateId, {from: accounts[0]});

      let borrower = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[6]);
      let productId = "1";
      let desEncryptionKey = "1233910u1";
      let proxy = await testUtils.createAndInit(CreditLine, [agreementAddr, borrower, consts.ZERO_ADDRESS, productId, desEncryptionKey], accounts[6], testUtils.privateForNodes);
      let creditLine = CreditLine.at(proxy.address);
      await creditLine.submit(borrower, "0", 500000, {from: accounts[6], privateFor: testUtils.privateForNodes});
      mlog.log("Created Credit Line:", creditLine.address);

      mlog.log("Approving by approver:", agreementResult.approvalWorkflow[0], " delegate id:", delegateId);
      let tx1 = await creditLine.action(agreementResult.approvalWorkflow[0], delegateId, true, 3000, "Remarks", {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(tx1.logs[0].event, "ActionEvent");
      assert.equal(tx1.logs[0].args.approver, agreementResult.approvalWorkflow[0]);
      assert.equal(tx1.logs[0].args.actionId, "1");
    });

    it("should not be able to approve by approver's delegate if wallet pub key isn't authorized to action on behalf of delegate");


    it("should not be able to approve other than the approvalWorkflow", async function () {
      let agreementResult = await testUtils.createAgreement(accounts);
      let agreementAddr = agreementResult.agreement.address;
      mlog.log("Created agreement:", agreementAddr);

      let borrower = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[6]);
      let productId = "1";
      let desEncryptionKey = "1233910u1";
      let proxy = await testUtils.createAndInit(CreditLine, [agreementAddr, borrower, consts.ZERO_ADDRESS, productId, desEncryptionKey], accounts[6], testUtils.privateForNodes);
      let creditLine = CreditLine.at(proxy.address);
      await creditLine.submit(borrower, "0", 500000, {from: accounts[6], privateFor: testUtils.privateForNodes});
      mlog.log("Created Credit Line:", creditLine.address);

      mlog.log("Approving by participant who isn't a approver:", agreementResult.participants[0]);
      await testUtils.assertThrows(creditLine.action(agreementResult.participants[1], noDelegate, true, 3000, "Remarks", {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      }));
    });

    it("should be able to reject by approvalWorkflow", async function () {
      let agreementResult = await testUtils.createAgreement(accounts);
      let agreementAddr = agreementResult.agreement.address;
      mlog.log("Created agreement:", agreementAddr);

      let borrower = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[6]);
      let productId = "1";
      let desEncryptionKey = "1233910u1";
      let proxy = await testUtils.createAndInit(CreditLine, [agreementAddr, borrower, consts.ZERO_ADDRESS, "1", desEncryptionKey], accounts[6], testUtils.privateForNodes);
      let creditLine = CreditLine.at(proxy.address);
      await creditLine.submit(borrower, "0", 500000, {from: accounts[6], privateFor: testUtils.privateForNodes});
      mlog.log("Created Credit Line:", creditLine.address);
      assert.equal(await creditLine.getOverallStatus(), consts.CreditLine.Status.PENDING);

      let noDelegate = "0x00"; //Use address 0x00 to indicate the action is directlyfrom the approver, not from delegate
      mlog.log("Approving by approver:", agreementResult.approvalWorkflow[0]);
      let tx1 = await creditLine.action(agreementResult.approvalWorkflow[0], noDelegate, false, 0, "Remarks", {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(tx1.logs[0].event, "ActionEvent");
      assert.equal(tx1.logs[0].args.approver, agreementResult.approvalWorkflow[0]);
      assert.equal(tx1.logs[0].args.actionId, "1");
      assert.equal(await creditLine.getOverallStatus(), consts.CreditLine.Status.REJECTED);
    });
  })

  describe("Adding data", function () {
    it("should be able to upload data if uploader is one of participant", async function () {
      let result = await testUtils.createCreditLine(accounts);
      let creditLine = result.creditLine;

      mlog.log("Adding data ...");
      await creditLine.addData(result.participants[0], "guaranteeData", {
        "from": accounts[0],
        privateFor: testUtils.privateForNodes
      });
      let dataLength = await creditLine.getDataLength();
      assert.equal(1, dataLength);

      mlog.log("Adding data again...");
      await creditLine.addData(result.borrower, "borrowerData", {
        "from": accounts[1],
        privateFor: testUtils.privateForNodes
      });
      dataLength = await creditLine.getDataLength();
      assert.equal(2, dataLength);
    });

    it("should be able to upload data if uploader is one of participant's delegate", async function () {
      let result = await testUtils.createCreditLine(accounts);
      let creditLine = result.creditLine;

      let delegate = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[6]);
      await testUtils.authorize(result.participants[0], delegate, accounts[0]);

      await creditLine.addData(delegate, "guaranteeData", {"from": accounts[6], privateFor: testUtils.privateForNodes});
      let dataLength = await creditLine.getDataLength();
      assert.equal(1, dataLength);
    });

    it("should not be able to upload data if uploader is NOT one of participant", async function () {
      let result = await testUtils.createCreditLine(accounts);
      let creditLine = result.creditLine;
      let notAParticipant = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[8]);
      await testUtils.assertThrows(creditLine.addData(notAParticipant, "guaranteeData", {
        "from": accounts[7],
        privateFor: testUtils.privateForNodes
      }));
    });

    it("should be able to set data hash and discard by owner", async function () {
      let result = await testUtils.createCreditLine(accounts);
      let creditLine = result.creditLine;

      mlog.log("Adding another data ..", creditLine.address);
      await creditLine.addData(result.borrower, "borrowerData", {
        "from": accounts[1],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(1, await creditLine.getDataLength());

      await creditLine.setDataRecordDeleted(0, true, {"from": accounts[1], privateFor: testUtils.privateForNodes});
      assert.equal(1, await creditLine.getDataLength());
      let data = await creditLine.data(0);
      assert.equal(data[3], true);

    });

    it("should be able to set data hash and discard by data uploader owner", async function () {
      let result = await testUtils.createCreditLine(accounts);
      let creditLine = result.creditLine;

      mlog.log("Adding data to Credit Line..", creditLine.address);
      await creditLine.addData(result.participants[0], "guaranteeData", {
        "from": accounts[0],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(1, await creditLine.getDataLength());

      mlog.log("Adding another data ..");
      await creditLine.addData(result.borrower, "borrowerData", {
        "from": accounts[1],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(2, await creditLine.getDataLength());

      mlog.log("Remove the data by value ..");
      await creditLine.setDataRecordDeleted(1, true, {"from": accounts[1], privateFor: testUtils.privateForNodes});

      mlog.log("Verify if it's deleted ..");
      assert.equal(2, await creditLine.getDataLength());
      let data = await creditLine.data(1);
      assert.equal(data[3], true);

    });

    it("should not be able to set data hash to be discarded if not authorized", async function () {
      let result = await testUtils.createCreditLine(accounts);
      let creditLine = result.creditLine;

      mlog.log("Adding data to Credit Line..", creditLine.address);
      await creditLine.addData(result.participants[0], "guaranteeData", {
        "from": accounts[0],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(1, await creditLine.getDataLength());

      mlog.log("Remove the data by neither owner or uploader, so it should throw exception ..");
      await testUtils.assertThrows(creditLine.setDataRecordDeleted(0, true, {
        "from": accounts[2],
        privateFor: testUtils.privateForNodes
      }));

    });
  });

  describe("Manage Participants", function () {
    it("should allow new participant to join, instructed by his/her own or authoirzed person", async function () {
      let result = await testUtils.createCreditLine(accounts);
      let creditLine = result.creditLine;

      let newParticipant = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[5]);
      await creditLine.addParticipant(newParticipant, consts.Role.GUARANTEE, {
        from: accounts[5],
        privateFor: testUtils.privateForNodes
      });

      let participantsCount = await creditLine.getParticipantCount();
      mlog.log("participantsCount = ", participantsCount);
      assert.equal(participantsCount, 5);
    });

    it("should not allow participant to join again if already exists", async function () {
      let result = await testUtils.createCreditLine(accounts);
      let creditLine = result.creditLine;

      let newParticipant = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[5]);
      await creditLine.addParticipant(newParticipant, consts.Role.GUARANTEE, {
        from: accounts[5],
        privateFor: testUtils.privateForNodes
      });

      mlog.log("Add the same participant again, then it should throw exception");
      await testUtils.assertThrows(creditLine.addParticipant(newParticipant, consts.Role.GUARANTEE, {
        from: accounts[5],
        privateFor: testUtils.privateForNodes
      }));
    });


    it("should allow credit owner to inactivate participant if it's not approver");
    it("should allow participant to inactivate him/herself, it's not approver");
    it("should not allow to inactivate participant if it approver");
  });


  describe("Check Frozen/Used/Available Amount", function () {
    it("should be able to check Frozen/Used/Available amount", async function () {
      let agreementResult = await testUtils.createAgreement(accounts);
      let agreementAddr = agreementResult.agreement.address;
      mlog.log("Created agreement:", agreementAddr);

      let borrower = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[6]);
      let productId = "1";
      let desEncryptionKey = "1233910u1";
      let proxy = await testUtils.createAndInit(CreditLine, [agreementAddr, borrower, consts.ZERO_ADDRESS, productId, desEncryptionKey], accounts[6], testUtils.privateForNodes);
      let creditLine = CreditLine.at(proxy.address);
      await creditLine.submit(borrower, "0", 500000, {from: accounts[6], privateFor: testUtils.privateForNodes});
      mlog.log("Created Credit Line:", creditLine.address);

      mlog.log("Approving by approver:", agreementResult.approvalWorkflow[0]);
      let tx1 = await creditLine.action(agreementResult.approvalWorkflow[0], noDelegate, true, 300000, "Remarks", {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      });
      mlog.log(`tx1=${print(tx1)}`);
      assert.equal(tx1.logs[0].event, "ActionEvent");
      assert.equal(tx1.logs[0].args.approver, agreementResult.approvalWorkflow[0]);
      assert.equal(tx1.logs[0].args.actionId, "1");

      mlog.log("Approved by approver:", agreementResult.approvalWorkflow[1]);
      let tx2 = await creditLine.action(agreementResult.approvalWorkflow[1], noDelegate, true, 300000, "Remarks", {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(tx2.logs[0].event, "ActionEvent");
      assert.equal(tx2.logs[0].args.approver, agreementResult.approvalWorkflow[1]);
      assert.equal(tx2.logs[0].args.actionId, "2");

      assert.ok(await creditLine.isOpened());
      assert.equal(await creditLine.getAvailableAmount(), 300000);

      mlog.log("Creating Loan ..");
      let loan1 = await Loan.new(
        creditLine.address, agreementResult.participants,
        agreementResult.roles, agreementResult.approvalWorkflow,
        0, 3, 1200, 30000, "productConfigIpfsHash", "id", "encryptionKey", {
          from: accounts[6],
          privateFor: testUtils.privateForNodes
        }
      );


      mlog.log("Creating another Loan ..");

      let loan2 = await Loan.new(
        creditLine.address, agreementResult.participants,
        agreementResult.roles, agreementResult.approvalWorkflow,
        0, 3, 1200, 30000, "productConfigIpfsHash", "id", "encryptionKey", {
          from: accounts[6],
          privateFor: testUtils.privateForNodes
        }
      );

      mlog.log("Approve the loan1, and checking Frozen/Used/Available Amount ... ");
      await loan1.approve(agreementResult.approvalWorkflow[0], consts.ZERO_ADDRESS, true, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      });
      await loan1.approve(agreementResult.approvalWorkflow[1], consts.ZERO_ADDRESS, true, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      });
      await loan1.approve(borrower, consts.ZERO_ADDRESS, true, {
        from: accounts[6],
        privateFor: testUtils.privateForNodes
      });
      mlog.log("Approve the loan1 state=", await loan1.state());
      mlog.log("Approve the loan1 frozenAmount=", await creditLine.getFrozenAmount());
      assert.equal(await loan1.state(), consts.Loan.Status.APPROVED);
      assert.equal(await creditLine.getFrozenAmount(), 30000);
      assert.equal(await creditLine.getUsedAmount(), 0);
      assert.equal(await creditLine.getAvailableAmount(), 270000);

      mlog.log("Disburse fund for loan1 by lender, and checking Frozen/Used/Available Amount ... ");
      let now = Date.now();
      let dueTime = [now, now + 10000, now + 20000];
      let dueAmount = [10000, 10000, 10000];
      let dueInterest = [1, 2, 3];
      let debtor = [borrower, borrower, borrower];
      let scheduledPaymentSequence = [1, 2, 3];

      let disburseTime = Date.now();
      let interestStartTime = Date.now() + 1;

      await loan1.disburseRequest(consts.ZERO_ADDRESS, dueTime, dueAmount, dueInterest, disburseTime, interestStartTime, debtor, scheduledPaymentSequence, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      });


      await loan1.confirmDisburse(borrower, consts.ZERO_ADDRESS, {
        from: accounts[6],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(await loan1.state(), consts.Loan.Status.REPAYING);

      assert.equal(await creditLine.getFrozenAmount(), 0);
      assert.equal(await creditLine.getUsedAmount(), 30000);
      assert.equal(await creditLine.getAvailableAmount(), 270000);

      mlog.log("Approve the loan2, and checking Frozen/Used/Available Amount ... ");
      await loan2.approve(agreementResult.approvalWorkflow[0], consts.ZERO_ADDRESS, true, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      });
      await loan2.approve(agreementResult.approvalWorkflow[1], consts.ZERO_ADDRESS, true, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      });
      await loan2.approve(borrower, consts.ZERO_ADDRESS, true, {
        from: accounts[6],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(await loan2.state(), consts.Loan.Status.APPROVED);

      assert.equal(await creditLine.getFrozenAmount(), 30000);
      assert.equal(await creditLine.getUsedAmount(), 30000);
      assert.equal(await creditLine.getAvailableAmount(), 240000);

      mlog.log("Disburse fund for loan2 by lender, and checking Frozen/Used/Available Amount ... ");

      await loan2.disburseRequest(consts.ZERO_ADDRESS, dueTime, dueAmount, dueInterest, disburseTime, interestStartTime, debtor, scheduledPaymentSequence, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      });

      await loan2.confirmDisburse(borrower, consts.ZERO_ADDRESS, {
        from: accounts[6],
        privateFor: testUtils.privateForNodes
      });

      assert.equal(await loan2.state(), consts.Loan.Status.REPAYING);

      assert.equal(await creditLine.getFrozenAmount(), 0);
      assert.equal(await creditLine.getUsedAmount(), 60000)
      assert.equal(await creditLine.getAvailableAmount(), 240000);
    });
  });

  describe("Adding privateFor", function () {
    it("should be able to add and remove privateFor by owner", async function () {
      let result = await testUtils.createCreditLine(accounts);
      let creditLine = result.creditLine;

      mlog.log("Adding PrivateFor to Credit Line..");
      await creditLine.addPrivateFor("3358b06ecf010dedbb747533f15e07bec2a7b725665be556faf38d71979e613d", {
        "from": accounts[1],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(1, await creditLine.privateForCount());

      mlog.log("Adding PrivateFor to Credit Line..");
      await creditLine.addPrivateFor("176ee132a30a48f1e240d58b058bcf5bdcde751e09b2111969263025dfed6426", {
        "from": accounts[1],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(2, await creditLine.privateForCount());

      mlog.log("Remove PrivateFor to Credit Line..");
      await creditLine.removePrivateFor("3358b06ecf010dedbb747533f15e07bec2a7b725665be556faf38d71979e613d", {
        "from": accounts[1],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(1, await creditLine.privateForCount());
    });

    it("should not be able to add and remove privateFor other than owner", async function () {
      let result = await testUtils.createCreditLine(accounts);
      let creditLine = result.creditLine;

      mlog.log("Adding PrivateFor to Credit Line by a id other than owner, so it should throw exception ..");
      await testUtils.assertThrows(creditLine.addPrivateFor("3358b06ecf010dedbb747533f15e07bec2a7b725665be556faf38d71979e613d", {
        "from": accounts[5],
        privateFor: testUtils.privateForNodes
      }));
    });
  });

  describe("Upgrade Contract", function () {

    it("Test Upgrade", async function () {
      mlog.log("Create and Init V1 ..");
      let result = await testUtils.createCreditLine(accounts);
      let creditLine = result.creditLine;

      mlog.log("Upgrade to V2 ..");
      let clV2 = await CreditLineV2_OverrideFunc.new({privateFor: testUtils.privateForNodes});
      let clV2Proxy = CreditLineV2_OverrideFunc.at(creditLine.address)
      await creditLine.upgradeTo(clV2.address, {privateFor: testUtils.privateForNodes});
      assert.equal(await clV2Proxy.newFunc(), 3);
    });
  });
})
