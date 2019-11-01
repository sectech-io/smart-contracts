'use strict';

import testUtils from '../support/truffle.test.utils';
import consts from '../support/consts';
import utils from '../support/utils';
import mlog from 'mocha-logger';

var last8 = utils.last8;
var print = utils.print;
var Loan = artifacts.require("./Loan.sol");

contract('Loan', function (accounts) {

  before(async () => {
      await testUtils.initTestEnv(accounts[9]);
    }
  );

  describe("Create Loan", function () {
    it("should be able to create loan succesfully with all the getter checked", async function () {
      let data = await testUtils.createLoan(accounts);
      let loan = data.loan;
      mlog.log("Adding addPrivateFor ...");
      let tx = await loan.addPrivateFor(testUtils.nodes[1], {
        from: data.borrowerAccount,
        privateFor: testUtils.privateForNodes
      });

      mlog.log(`Verify PrivateFor field in the contract..., tx: ${print(tx)}`);
      assert.equal(await loan.privateFor(0), testUtils.nodes[1]);
      let participantsInfo = await loan.getParticipants();
      mlog.log("participantsInfo", JSON.stringify(participantsInfo));
      let participants = participantsInfo[0];
      let roles = participantsInfo[1];
      assert.equal(participants.length, 3);
      assert.equal(participants[0], data.participants[0]);
      assert.equal(participants[1], data.participants[1]);
      assert.equal(participants[2], data.participants[2]);

      assert.equal(roles.length, 3);
      assert.equal(roles[0], data.roles[0]);
      assert.equal(roles[1], data.roles[1]);
      assert.equal(roles[2], data.roles[2]);

    });

    it("should be able to setPrivateFor with authorize account", async function () {
      let data = await testUtils.createLoan(accounts);
      let loan = data.loan;
      mlog.log("Adding addPrivateFor ...");

      let borrowerDelegate = data.borrowerDelegate;
      mlog.log("borrowerDelegate", print(borrowerDelegate));
      let borrowerDelegateAccount = data.borrowerDelegateAccount;
      mlog.log("borrowerDelegateAccount", print(borrowerDelegateAccount));

      let tx = await loan.addPrivateFor(testUtils.nodes[1], {
        from: borrowerDelegateAccount,
        privateFor: testUtils.privateForNodes
      });

      mlog.log(`Verify PrivateFor field in the contract..., tx: ${print(tx)}`);
      assert.equal(await loan.privateFor(0), testUtils.nodes[1]);

    });

    it("should  be able to create loan if there isn't enough credit", async function () {
      let creditLineData = await testUtils.createCreditLine(accounts);
      let creditLine = creditLineData.creditLine;

      mlog.log("Approve creditline ... ");
      await creditLine.submit(creditLineData.borrower, consts.ZERO_ADDRESS, 300000, {
        from: creditLineData.borrowerAccount,
        privateFor: testUtils.privateForNodes
      });
      await creditLine.action(creditLineData.approvalWorkflow[0], consts.ZERO_ADDRESS, true, 300000, "Remarks", {
        from: creditLineData.guaranteeAccount,
        privateFor: testUtils.privateForNodes
      });
      await creditLine.action(creditLineData.approvalWorkflow[1], consts.ZERO_ADDRESS, true, 300000, "Remarks", {
        from: creditLineData.lenderAccount,
        privateFor: testUtils.privateForNodes
      });

      assert.equal(await creditLine.isOpened(), true);
      assert.equal(await creditLineData.creditLine.getAvailableAmount(), 300000);
      mlog.log("CreditLine isOpened:", await creditLine.isOpened(), ",available amount:", await creditLineData.creditLine.getAvailableAmount(), ",used Amount:", await creditLine.getUsedAmount(), ",frozen Amount", await creditLine.getFrozenAmount());

      mlog.log("Creating loan with amount bigger than the available amount, then it should success ... ");
      let loan = await Loan.new(
        creditLine.address, creditLineData.participants,
        creditLineData.roles, creditLineData.approvalWorkflow,
        0, 3, 1200, 300001, "productConfigIpfsHash", "id", "encryptionKey", {
          from: creditLineData.borrowerAccount,
          privateFor: testUtils.privateForNodes
        } // , privateFor: [ nodes[1] ]
      );
      mlog.log(`Loan state = ${await loan.state()}`);
      assert.equal(await loan.state(), consts.Loan.Status.PENDING);

    });

    it("should not be able to create loan other than borrower", async function () {
      await testUtils.assertThrows((testUtils.createLoan(accounts, testUtils.lenderAccount)));
    });
  })


  describe("Approval", function () {
    it("should be able to approve by all approvers then transit state to Approved state", async function () {
      let data = await (testUtils.createLoan(accounts));
      let loan = data.loan;
      let approvers = data.approvalWorkflow;
      mlog.log("Approvers=", approvers);

      mlog.log(`Approving by ${approvers[0]} with account = ${accounts[0]}`);
      await loan.approve(approvers[0], consts.ZERO_ADDRESS, true, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      }); // idAddr1
      mlog.log(`Loan state = ${await loan.state()}`);
      assert.equal(await loan.state(), consts.Loan.Status.PENDING);

      mlog.log(`Approving by ${approvers[1]} with account = ${accounts[2]}`);
      await loan.approve(approvers[1], consts.ZERO_ADDRESS, true, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      }); // idAddr3

      await loan.approve(data.borrower, consts.ZERO_ADDRESS, true, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });

      mlog.log(`Loan state = ${await loan.state()}`);
      assert.equal(await loan.state(), consts.Loan.Status.APPROVED);

      let approvalDetails = await loan.getApprovalDetails();
      mlog.log(`Approval Details = ${JSON.stringify(approvalDetails)}`);
      let rtnApprovers = approvalDetails[0];
      let rtnRoles = approvalDetails[1];
      let rtnIsResponsed = approvalDetails[2];
      let rtnIsApproved = approvalDetails[3];

      assert.equal(rtnApprovers.length, 3);
      assert.equal(rtnApprovers[0], approvers[0]);
      assert.equal(rtnApprovers[1], approvers[1]);

      assert.equal(rtnRoles.length, 3);
      assert.equal(rtnRoles[0], 3);
      assert.equal(rtnRoles[1], 2);

      assert.equal(rtnIsResponsed.length, 3);
      assert.equal(rtnIsResponsed[0], true);
      assert.equal(rtnIsResponsed[1], true);

      assert.equal(rtnIsApproved.length, 3);
      assert.equal(rtnIsApproved[0], true);
      assert.equal(rtnIsApproved[1], true);
    });

    it("should only be able to approve once per approver", async function () {
      let data = await (testUtils.createLoan(accounts));
      let loan = data.loan;
      let approvers = data.approvalWorkflow;
      mlog.log("Approvers=", approvers);

      mlog.log(`Approve by ${approvers[0]} with account = ${accounts[0]}`);
      await loan.approve(approvers[0], consts.ZERO_ADDRESS, true, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      }); // idAddr1

      mlog.log(`Approve again, then it should throw.. `);
      await testUtils.assertThrows(loan.approve(approvers[0], consts.ZERO_ADDRESS, true, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      })); // idAddr1
    });

    it("should be able to recall when loan is pendingOnApproval", async function () {
      let data = await (testUtils.createLoan(accounts));
      let loan = data.loan;
      let approvers = data.approvalWorkflow;
      mlog.log("Approvers=", approvers);

      mlog.log(`Approve by ${approvers[0]} with account = ${accounts[0]}`);
      await loan.approve(approvers[0], consts.ZERO_ADDRESS, true, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      }); // idAddr1

      let approval = await loan.getApprovalDetails();
      mlog.log("approval=", approval);

      assert.equal(approval[2][0], true);
      assert.equal(approval[3][0], true);
      await loan.recall(approvers[0], consts.ZERO_ADDRESS, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      });
      approval = await loan.getApprovalDetails();
      mlog.log("approval=", approval);
      assert.equal(approval[2][0], false);
      assert.equal(approval[3][0], false);


    });

    it("should be able to reject loan", async function () {
      let data = await (testUtils.createLoan(accounts));
      let loan = data.loan;
      let approvers = data.approvalWorkflow;
      mlog.log("Approvers=", approvers);

      mlog.log(`Rejecting by ${approvers[0]} with account = ${accounts[0]}`);
      await loan.approve(approvers[0], consts.ZERO_ADDRESS, false, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      }); // idAddr1
      mlog.log(`Loan state = ${await loan.state()}`);
      assert.equal(await loan.state(), consts.Loan.Status.REJECTED);
    });

    it("should be able to reject loan once per approver", async function () {
      let data = await (testUtils.createLoan(accounts));
      let loan = data.loan;
      let approvers = data.approvalWorkflow;
      mlog.log("Approvers=", approvers);

      mlog.log(`Rejecting by ${approvers[0]} with account = ${accounts[0]}`);
      await loan.approve(approvers[0], consts.ZERO_ADDRESS, false, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      }); // idAddr1
      mlog.log(`Loan state = ${await loan.state()}`);
      assert.equal(await loan.state(), consts.Loan.Status.REJECTED);

      mlog.log(`Reject again, then it should throw.. `);
      await testUtils.assertThrows(loan.approve(approvers[0], consts.ZERO_ADDRESS, false, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      })); // idAddr1
    });

    it("should be able to approve loan by delegates of approvers", async function () {
      let data = await (testUtils.createLoan(accounts));
      let loan = data.loan;
      let approvers = data.approvalWorkflow;

      mlog.log(`Approving by ${last8(approvers[0])} with by delegate ${last8(data.guaranteeDelegate)} account = ${last8(data.guaranteeDelegateAccount)}`); // guarantee
      await loan.approve(approvers[0], data.guaranteeDelegate, true, {
        from: data.guaranteeDelegateAccount,
        privateFor: testUtils.privateForNodes
      }); // idAddr1
      mlog.log(`Loan state = ${await loan.state()}`);
      assert.equal(await loan.state(), consts.Loan.Status.PENDING);

      mlog.log(`Approving by ${last8(approvers[1])} with by delegate ${last8(data.lenderDelegate)} account = ${last8(data.lenderDelegateAccount)}`)
      await loan.approve(approvers[1], data.lenderDelegate, true, {
        from: data.lenderDelegateAccount,
        privateFor: testUtils.privateForNodes
      }); // idAddr3
      assert.equal(await loan.state(), consts.Loan.Status.PENDING);
      mlog.log(`Loan state = ${await loan.state()}`);
      await loan.approve(data.borrower, consts.ZERO_ADDRESS, true, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(await loan.state(), consts.Loan.Status.APPROVED);
    });

  })

  describe("Cancel Loan", function () {
    it("should be able to cancel loan by approver on Approved state", async function () {
      let data = await testUtils.createLoan(accounts);
      let loan = data.loan;
      let approvers = data.approvalWorkflow;
      mlog.log("Approvers=", approvers);

      mlog.log(`Approving by ${approvers[0]} and ${approvers[1]}`);
      await loan.approve(approvers[0], consts.ZERO_ADDRESS, true, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      }); // idAddr1
      await loan.approve(approvers[1], consts.ZERO_ADDRESS, true, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      }); // idAddr3
      await loan.approve(data.borrower, consts.ZERO_ADDRESS, true, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });

      mlog.log(`Loan state = ${await loan.state()}`);
      assert.equal(await loan.state(), consts.Loan.Status.APPROVED);
      mlog.log(`Available credit line: ${await data.creditLine.getAvailableAmount()}`);

      mlog.log(`Cancel loan ...`);
      await loan.cancel(approvers[0], consts.ZERO_ADDRESS, {from: accounts[0], privateFor: testUtils.privateForNodes});
      mlog.log(`Loan state = ${await loan.state()}`);
      assert.equal(await loan.state(), consts.Loan.Status.CANCELLED);
      mlog.log(`Available credit line: ${await data.creditLine.getAvailableAmount()}`);
    });


    it("should be able to cancel loan by borrower on Approved state", async function () {
      let data = await testUtils.createLoan(accounts);
      let loan = data.loan;
      let approvers = data.approvalWorkflow;
      mlog.log("Approvers=", approvers);

      mlog.log(`Approving by ${approvers[0]} and ${approvers[1]}`);
      await loan.approve(approvers[0], consts.ZERO_ADDRESS, true, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      }); // idAddr1
      await loan.approve(approvers[1], consts.ZERO_ADDRESS, true, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      }); // idAddr3
      await loan.approve(data.borrower, consts.ZERO_ADDRESS, true, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });

      mlog.log(`Loan state = ${await loan.state()}`);
      assert.equal(await loan.state(), consts.Loan.Status.APPROVED);

      mlog.log(`Cancel by borrower ${data.borrower}`);
      await loan.cancel(data.borrower, consts.ZERO_ADDRESS, {from: accounts[1], privateFor: testUtils.privateForNodes});
      mlog.log(`Loan state = ${await loan.state()}`);
      assert.equal(await loan.state(), consts.Loan.Status.CANCELLED);
    });

    it("should be able to cancel loan by borrower on PendingAtApproved state", async function () {
      let data = await testUtils.createLoan(accounts);
      let loan = data.loan;

      mlog.log(`Loan state = ${await loan.state()}`);
      assert.equal(await loan.state(), consts.Loan.Status.PENDING);

      mlog.log(`Cancel by borrower ${data.borrower}`);
      await loan.cancel(data.borrower, consts.ZERO_ADDRESS, {
        from: data.borrowerAccount,
        privateFor: testUtils.privateForNodes
      });

      mlog.log(`Loan state = ${await loan.state()}`);
      assert.equal(await loan.state(), consts.Loan.Status.CANCELLED);
    });

    it("should be able to cancel loan by borrower's delegate");
    it("should be able to cancel loan by approver's delegate");
  })

  describe("Disburse Fund", function () {
    it("should be able to disburse fund by lender", async function () {
      let data = await testUtils.createLoan(accounts);
      let loan = data.loan;
      let approvers = data.approvalWorkflow;
      mlog.log("Approvers=", approvers);

      mlog.log(`Approving by ${approvers[0]} and ${approvers[1]}`);
      await loan.approve(approvers[0], consts.ZERO_ADDRESS, true, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      }); // idAddr1
      await loan.approve(approvers[1], consts.ZERO_ADDRESS, true, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      }); // idAddr3
      await loan.approve(data.borrower, consts.ZERO_ADDRESS, true, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });
      mlog.log(`Loan state = ${await loan.state()}`);
      assert.equal(await loan.state(), consts.Loan.Status.APPROVED);

      let now = Date.now();
      let dueTime = [now, now + 10000, now + 20000];
      let dueAmount = [10000, 10000, 10000];
      let dueInterest = [1, 2, 3];
      let debtor = [data.borrower, data.borrower, data.borrower];
      let scheduledPaymentSequence = [1, 2, 3];

      let disburseTime = Date.now();
      let interestStartTime = Date.now() + 1;

      await loan.disburseRequest(consts.ZERO_ADDRESS, dueTime, dueAmount, dueInterest, disburseTime, interestStartTime, debtor, scheduledPaymentSequence, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      });
      mlog.log(`Sent disburseRequest, Loan state = ${await loan.state()}`);
      assert.equal(await loan.state(), consts.Loan.Status.PENDING_ON_CONFIRM_DISBURSEMENT);
    });

    it("should be able to disburse fund by lender's delegate");

    it("should be able to confirm disburse by any participant", async function () {
      let data = await testUtils.createLoan(accounts);
      let loan = data.loan;
      let approvers = data.approvalWorkflow;
      mlog.log("Approvers=", approvers);

      mlog.log(`Approving by ${approvers[0]} and ${approvers[1]}`);
      await loan.approve(approvers[0], consts.ZERO_ADDRESS, true, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      }); // idAddr1
      await loan.approve(approvers[1], consts.ZERO_ADDRESS, true, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      }); // idAddr3
      await loan.approve(data.borrower, consts.ZERO_ADDRESS, true, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });
      mlog.log(`Loan state = ${await loan.state()}`);
      assert.equal(await loan.state(), consts.Loan.Status.APPROVED);

      let now = Date.now();
      let dueTime = [now, now + 10000, now + 20000];
      let dueAmount = [10000, 10000, 10000];
      let dueInterest = [1, 2, 3];
      let debtor = [data.borrower, data.borrower, data.borrower];
      let scheduledPaymentSequence = [1, 2, 3];

      let disburseTime = Date.now();
      let interestStartTime = Date.now() + 1;

      await loan.disburseRequest(consts.ZERO_ADDRESS, dueTime, dueAmount, dueInterest, disburseTime, interestStartTime, debtor, scheduledPaymentSequence, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      });
      mlog.log(`Loan state = ${await loan.state()}`);
      assert.equal(await loan.state(), consts.Loan.Status.PENDING_ON_CONFIRM_DISBURSEMENT);

      await loan.confirmDisburse(data.borrower, consts.ZERO_ADDRESS, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });
      mlog.log(`Loan state = ${await loan.state()}`);
      assert.equal(await loan.state(), consts.Loan.Status.REPAYING);
    });

    it("should be able to cancel disburse by any participant", async function () {
      let data = await testUtils.createLoan(accounts);
      let loan = data.loan;
      let approvers = data.approvalWorkflow;
      mlog.log("Approvers=", approvers);

      mlog.log(`Approving by ${approvers[0]} and ${approvers[1]}`);
      await loan.approve(approvers[0], consts.ZERO_ADDRESS, true, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      }); // idAddr1
      await loan.approve(approvers[1], consts.ZERO_ADDRESS, true, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      }); // idAddr3
      await loan.approve(data.borrower, consts.ZERO_ADDRESS, true, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });

      mlog.log(`Loan state = ${await loan.state()}`);
      assert.equal(await loan.state(), consts.Loan.Status.APPROVED);

      let now = Date.now();
      let dueTime = [now, now + 10000, now + 20000];
      let dueAmount = [10000, 10000, 10000];
      let dueInterest = [1, 2, 3];
      let debtor = [data.borrower, data.borrower, data.borrower];
      let scheduledPaymentSequence = [1, 2, 3];

      let disburseTime = Date.now();
      let interestStartTime = Date.now() + 1;

      mlog.log(`Disburse request ... `);
      await loan.disburseRequest(consts.ZERO_ADDRESS, dueTime, dueAmount, dueInterest, disburseTime, interestStartTime, debtor, scheduledPaymentSequence, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      });
      mlog.log(`Loan state = ${await loan.state()}`);
      mlog.log(`Loan paymentCount = ${await loan.getScheduledPaymentCount()}`);
      assert.equal(await loan.getScheduledPaymentCount(), 3);
      assert.equal(await loan.state(), consts.Loan.Status.PENDING_ON_CONFIRM_DISBURSEMENT);
      assert.equal(await loan.disburseTime(), disburseTime);
      assert.equal(await loan.interestStartTime(), interestStartTime);

      mlog.log(`Cancelling disburse ... `);
      await loan.cancelDisburse(data.lender, consts.ZERO_ADDRESS, {
        from: data.lenderAccount,
        privateFor: testUtils.privateForNodes
      });
      mlog.log(`Loan state = ${await loan.state()}`);
      assert.equal(await loan.getScheduledPaymentCount(), 0);
      assert.equal(await loan.state(), consts.Loan.Status.APPROVED);
      assert.equal(await loan.disburseTime(), 0, "disburseTime should be reset");
      assert.equal(await loan.interestStartTime(), 0, "interestStartTime should be reset");
    });

    it("should be able to confirm disburse by any participant's delegate");
  })

  describe("Repayment", function () {
    it("should be able to raise repay request by borrower and confirm by lender", async function () {
      let data = await testUtils.createLoan(accounts);
      let loan = data.loan;
      let approvers = data.approvalWorkflow;

      mlog.log(`Approving by ${approvers[0]} and ${approvers[1]}`);
      await loan.approve(approvers[0], consts.ZERO_ADDRESS, true, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      }); // idAddr1
      await loan.approve(approvers[1], consts.ZERO_ADDRESS, true, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      }); // idAddr3
      await loan.approve(data.borrower, consts.ZERO_ADDRESS, true, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });

      let now = Date.now();
      let firstDueTime = now;
      let secondDueTime = firstDueTime + 10000;
      let dueTime = [firstDueTime, secondDueTime, firstDueTime + 20000];
      let duePrinciple = [10000, 10000, 10000];
      let dueInterest = [1, 2, 3];
      let debtor = [data.borrower, data.borrower, data.borrower];
      let scheduledPaymentSequence = [1, 2, 3];

      let disburseTime = Date.now();
      let interestStartTime = Date.now() + 1;

      mlog.log("Disburse request ...");
      await loan.disburseRequest(consts.ZERO_ADDRESS, dueTime, duePrinciple, dueInterest, disburseTime, interestStartTime, debtor, scheduledPaymentSequence, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      });

      assert.equal(await loan.getScheduledPaymentCount(), 3);
      assert.equal(await loan.totalInterest(), 6);
      assert.equal(await loan.outstandingPrinciple(), 0);
      assert.equal(await loan.shouldLockOnCredit(), true);

      let sp0 = await loan.getScheduledPayment(0);

      assert.equal(sp0[0], dueTime[0]); //isCompleted
      assert.equal(sp0[1], duePrinciple[0]); //isCompleted
      assert.equal(sp0[2], dueInterest[0]); //isCompleted
      assert.equal(sp0[3], false); //isCompleted
      assert.equal(sp0[4], data.borrower);
      assert.equal(sp0[5], 1);

      let sp1 = await loan.getScheduledPayment(1);
      assert.equal(sp1[0], dueTime[1]); //isCompleted
      assert.equal(sp1[1], duePrinciple[1]); //isCompleted
      assert.equal(sp1[2], dueInterest[1]); //isCompleted
      assert.equal(sp1[3], false); //isCompleted
      assert.equal(sp1[4], data.borrower);
      assert.equal(sp1[5], 2);

      mlog.log("Confirming disburse request ...");
      await loan.confirmDisburse(data.borrower, consts.ZERO_ADDRESS, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(await loan.state(), consts.Loan.Status.REPAYING);
      assert.equal(await loan.outstandingPrinciple(), 30000);
      assert.equal(await loan.shouldLockOnCredit(), false);

      mlog.log("1st payment request for [1st schedule payment] by borrower ...");
      let firstPaymentTime = firstDueTime - 1;
      await loan.repayRequest(0, consts.ZERO_ADDRESS, firstPaymentTime, 10000, 1, true, data.borrower, {
        from: testUtils.borrowerAccount,
        privateFor: testUtils.privateForNodes
      });
      let payment = await loan.getPayment(0);
      mlog.log("Payment state:", payment);
      assert.equal(payment[0], 0); // spIdx
      assert.equal(payment[1], 10000); // paidPrinciple
      assert.equal(payment[2], 1); // paidInterest
      assert.equal(payment[3], firstPaymentTime); // paidTime
      assert.equal(payment[4], 0); // confirmBlockTime
      assert.equal(payment[5], true); // markScheduledPaymentCompleted
      assert.equal(payment[6], consts.Loan.Payment.Status.PAYMENT_REQUESTED); // state
      assert.equal(await loan.outstandingPrinciple(), 30000);

      mlog.log("Confirm 1st payment request by lender's delegate ...");
      await loan.repayConfirm(0, data.lenderDelegate, {
        from: data.lenderDelegateAccount,
        privateFor: testUtils.privateForNodes
      });
      payment = await loan.getPayment(0);
      mlog.log("1st Payment state:", payment);
      assert.equal(payment[0], 0);
      assert.equal(payment[1], 10000);
      assert.equal(payment[2], 1);
      assert.equal(payment[3], firstPaymentTime);
      assert(payment[4] != 0);
      assert.equal(payment[5], true);
      assert.equal(payment[6], consts.Loan.Payment.Status.PAYMENT_CONFIRMED);

      sp0 = await loan.getScheduledPayment(0);
      assert.equal(sp0[3], true); //isCompleted
      assert.equal(await loan.outstandingPrinciple(), 20000);

      mlog.log("2nd payment request for [2nd schedule payment], but rejected ...");
      await loan.repayRequest(1, consts.ZERO_ADDRESS, secondDueTime, 10000, 2, true, data.borrower, {
        from: testUtils.borrowerAccount,
        privateFor: testUtils.privateForNodes
      });
      await loan.repayReject(1, testUtils.guaranteeIdAddr, consts.ZERO_ADDRESS, {
        from: testUtils.guaranteeAccount,
        privateFor: testUtils.privateForNodes
      });
      payment = await loan.getPayment(1);
      mlog.log("2nd Payment state:", payment);
      assert.equal(payment[0], 1);
      assert.equal(payment[1], 10000);
      assert.equal(payment[2], 2);
      assert.equal(payment[3], secondDueTime);
      assert.equal(payment[4], 0);
      assert.equal(payment[5], true);
      assert.equal(payment[6], consts.Loan.Payment.Status.PAYMENT_REJECTED);
      assert.equal(await loan.outstandingPrinciple(), 20000);
      assert((await loan.isCompleted()) == false);

      mlog.log("Testing paying more interest than due, 3nd payment request for [2nd schedule payment], confirm the payment. ");
      await loan.repayRequest(1, consts.ZERO_ADDRESS, now, 10000, 10, true, data.borrower, {
        from: testUtils.borrowerAccount,
        privateFor: testUtils.privateForNodes
      }); // 2nd payment
      await loan.repayConfirm(2, consts.ZERO_ADDRESS, {
        from: testUtils.lenderAccount,
        privateFor: testUtils.privateForNodes
      }); // confirm the 2nd payment
      assert((await loan.isCompleted()) == false);

      mlog.log("4rd payment request for [3rd schedule payment] and confirm the payment ...");
      await loan.repayRequest(2, consts.ZERO_ADDRESS, now, 10000, 3, true, data.borrower, {
        from: testUtils.borrowerAccount,
        privateFor: testUtils.privateForNodes
      }); //
      payment = await loan.getPayment(3);
      mlog.log("3rd Payment state:", payment);
      assert.equal(payment[0], 2);
      assert.equal(payment[1], 10000);
      assert.equal(payment[2], 3);
      assert.equal(payment[3], now);
      assert.equal(payment[4], 0);
      assert.equal(payment[5], true);
      assert.equal(payment[6], consts.Loan.Payment.Status.PAYMENT_REQUESTED);

      mlog.log("Confirm the 4th payment request and confirm the payment ...");
      await loan.repayConfirm(3, consts.ZERO_ADDRESS, {
        from: testUtils.lenderAccount,
        privateFor: testUtils.privateForNodes
      }); // confirm the 4rd payment request
      assert.equal(await loan.outstandingPrinciple(), 0);

      mlog.log("The loan should be completed ...");
      sp0 = await loan.getScheduledPayment(0);
      sp1 = await loan.getScheduledPayment(1);
      let sp2 = await loan.getScheduledPayment(2);
      assert.equal(sp0[3], true); //isCompleted
      assert.equal(sp1[3], true); //isCompleted
      assert.equal(sp2[3], true); //isCompleted
      assert.ok(await loan.isCompleted());
      assert.ok(await loan.state(), consts.Loan.Status.COMPLETED);
    });


    it("should be able to raise repay request by borrower and guarantee , confirm by lender", async function () {
      let data = await testUtils.createLoan(accounts);
      let loan = data.loan;
      let approvers = data.approvalWorkflow;

      mlog.log(`Approving by ${approvers[0]} and ${approvers[1]}`);
      await loan.approve(approvers[0], consts.ZERO_ADDRESS, true, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      }); // idAddr1
      await loan.approve(approvers[1], consts.ZERO_ADDRESS, true, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      }); // idAddr3
      await loan.approve(data.borrower, consts.ZERO_ADDRESS, true, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });

      let now = Date.now();
      let firstDueTime = now;
      let secondDueTime = firstDueTime + 10000;
      let dueTime = [firstDueTime, secondDueTime, firstDueTime + 20000];
      let duePrinciple = [10000, 10000, 10000];
      let dueInterest = [1, 2, 3];
      let debtor = [data.borrower, data.borrower, data.borrower];
      let scheduledPaymentSequence = [1, 2, 3];

      let disburseTime = Date.now();
      let interestStartTime = Date.now() + 1;

      mlog.log("Disburse request ...");
      await loan.disburseRequest(consts.ZERO_ADDRESS, dueTime, duePrinciple, dueInterest, disburseTime, interestStartTime, debtor, scheduledPaymentSequence, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      });

      assert.equal(await loan.getScheduledPaymentCount(), 3);
      assert.equal(await loan.totalInterest(), 6);
      assert.equal(await loan.outstandingPrinciple(), 0);
      assert.equal(await loan.shouldLockOnCredit(), true);

      let sp0 = await loan.getScheduledPayment(0);

      assert.equal(sp0[0], dueTime[0]); //isCompleted
      assert.equal(sp0[1], duePrinciple[0]); //isCompleted
      assert.equal(sp0[2], dueInterest[0]); //isCompleted
      assert.equal(sp0[3], false); //isCompleted
      assert.equal(sp0[4], data.borrower);
      assert.equal(sp0[5], 1);

      let sp1 = await loan.getScheduledPayment(1);
      assert.equal(sp1[0], dueTime[1]); //isCompleted
      assert.equal(sp1[1], duePrinciple[1]); //isCompleted
      assert.equal(sp1[2], dueInterest[1]); //isCompleted
      assert.equal(sp1[3], false); //isCompleted
      assert.equal(sp1[4], data.borrower);
      assert.equal(sp1[5], 2);

      mlog.log("Confirming disburse request ...");
      await loan.confirmDisburse(data.borrower, consts.ZERO_ADDRESS, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(await loan.state(), consts.Loan.Status.REPAYING);
      assert.equal(await loan.outstandingPrinciple(), 30000);
      assert.equal(await loan.shouldLockOnCredit(), false);

      mlog.log("1st payment request for [1st schedule payment] by borrower ...");
      let firstPaymentTime = firstDueTime - 1;
      await loan.repayRequest(0, consts.ZERO_ADDRESS, firstPaymentTime, 10000, 1, true, data.borrower, {
        from: testUtils.borrowerAccount,
        privateFor: testUtils.privateForNodes
      });
      let payment = await loan.getPayment(0);
      mlog.log("Payment state:", payment);
      assert.equal(payment[0], 0); // spIdx
      assert.equal(payment[1], 10000); // paidPrinciple
      assert.equal(payment[2], 1); // paidInterest
      assert.equal(payment[3], firstPaymentTime); // paidTime
      assert.equal(payment[4], 0); // confirmBlockTime
      assert.equal(payment[5], true); // markScheduledPaymentCompleted
      assert.equal(payment[6], consts.Loan.Payment.Status.PAYMENT_REQUESTED); // state
      assert.equal(await loan.outstandingPrinciple(), 30000);

      mlog.log("Confirm 1st payment request by lender's delegate ...");
      await loan.repayConfirm(0, data.lenderDelegate, {
        from: data.lenderDelegateAccount,
        privateFor: testUtils.privateForNodes
      });
      payment = await loan.getPayment(0);
      mlog.log("1st Payment state:", payment);
      assert.equal(payment[0], 0);
      assert.equal(payment[1], 10000);
      assert.equal(payment[2], 1);
      assert.equal(payment[3], firstPaymentTime);
      assert(payment[4] != 0);
      assert.equal(payment[5], true);
      assert.equal(payment[6], consts.Loan.Payment.Status.PAYMENT_CONFIRMED);

      sp0 = await loan.getScheduledPayment(0);
      assert.equal(sp0[3], true); //isCompleted
      assert.equal(await loan.outstandingPrinciple(), 20000);

      mlog.log("2nd payment request for [2nd schedule payment], but rejected ...");
      await loan.repayRequest(1, consts.ZERO_ADDRESS, secondDueTime, 10000, 2, true, data.borrower, {
        from: testUtils.borrowerAccount,
        privateFor: testUtils.privateForNodes
      });
      await loan.repayReject(1, testUtils.guaranteeIdAddr, consts.ZERO_ADDRESS, {
        from: testUtils.guaranteeAccount,
        privateFor: testUtils.privateForNodes
      });
      payment = await loan.getPayment(1);
      mlog.log("2nd Payment state:", payment);
      assert.equal(payment[0], 1);
      assert.equal(payment[1], 10000);
      assert.equal(payment[2], 2);
      assert.equal(payment[3], secondDueTime);
      assert.equal(payment[4], 0);
      assert.equal(payment[5], true);
      assert.equal(payment[6], consts.Loan.Payment.Status.PAYMENT_REJECTED);
      assert.equal(await loan.outstandingPrinciple(), 20000);
      assert((await loan.isCompleted()) == false);

      mlog.log("Testing paying more interest than due, 3nd payment request for [2nd schedule payment], confirm the payment. ");
      await loan.repayRequest(1, consts.ZERO_ADDRESS, now, 10000, 10, true, data.borrower, {
        from: testUtils.borrowerAccount,
        privateFor: testUtils.privateForNodes
      }); // 2nd payment
      await loan.repayConfirm(2, consts.ZERO_ADDRESS, {
        from: testUtils.lenderAccount,
        privateFor: testUtils.privateForNodes
      }); // confirm the 2nd payment
      assert((await loan.isCompleted()) == false);

      mlog.log("4rd payment request for [3rd schedule payment] and confirm the payment ...");
      await loan.repayRequest(2, consts.ZERO_ADDRESS, now, 10000, 3, true, data.borrower, {
        from: testUtils.borrowerAccount,
        privateFor: testUtils.privateForNodes
      }); //
      payment = await loan.getPayment(3);
      mlog.log("3rd Payment state:", payment);
      assert.equal(payment[0], 2);
      assert.equal(payment[1], 10000);
      assert.equal(payment[2], 3);
      assert.equal(payment[3], now);
      assert.equal(payment[4], 0);
      assert.equal(payment[5], true);
      assert.equal(payment[6], consts.Loan.Payment.Status.PAYMENT_REQUESTED);

      mlog.log("Confirm the 4th payment request and confirm the payment ...");
      await loan.repayConfirm(3, consts.ZERO_ADDRESS, {
        from: testUtils.lenderAccount,
        privateFor: testUtils.privateForNodes
      }); // confirm the 4rd payment request
      assert.equal(await loan.outstandingPrinciple(), 0);

      mlog.log("The loan should be completed ...");
      sp0 = await loan.getScheduledPayment(0);
      sp1 = await loan.getScheduledPayment(1);
      let sp2 = await loan.getScheduledPayment(2);
      assert.equal(sp0[3], true); //isCompleted
      assert.equal(sp1[3], true); //isCompleted
      assert.equal(sp2[3], true); //isCompleted
      assert.ok(await loan.isCompleted());
      assert.ok(await loan.state(), consts.Loan.Status.COMPLETED);
    });

    it("should be able to disburse and repay with more than 6 scheduled payments", async function () {
      let data = await testUtils.createLoan(accounts);
      let loan = data.loan;
      let approvers = data.approvalWorkflow;

      mlog.log(`Approving by ${approvers[0]} and ${approvers[1]}`);
      await loan.approve(approvers[0], consts.ZERO_ADDRESS, true, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      }); // idAddr1
      await loan.approve(approvers[1], consts.ZERO_ADDRESS, true, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      }); // idAddr3
      await loan.approve(data.borrower, consts.ZERO_ADDRESS, true, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });

      let now = Date.now();
      let firstDueTime = now;
      let secondDueTime = firstDueTime + 10000;
      let dueTime = [firstDueTime, secondDueTime, firstDueTime + 20000, firstDueTime + 30000, firstDueTime + 40000, firstDueTime + 20000, firstDueTime + 20000, firstDueTime + 20000];
      let duePrinciple = [4000, 4000, 4000, 4000, 4000, 4000, 4000, 2000];
      let dueInterest = [1, 2, 3, 1, 2, 3, 1, 3];
      let debtor = [data.borrower, data.borrower, data.borrower, data.borrower, data.borrower, data.borrower, data.borrower, data.borrower];
      let scheduledPaymentSequence = [1, 2, 3, 4, 5, 6, 7, 8];

      let disburseTime = Date.now();
      let interestStartTime = Date.now() + 1;

      mlog.log("Disburse request ...");
      await loan.disburseRequest(consts.ZERO_ADDRESS, dueTime, duePrinciple, dueInterest, disburseTime, interestStartTime, debtor, scheduledPaymentSequence, {
        from: testUtils.lenderAccount,
        privateFor: testUtils.privateForNodes
      });

      assert.equal(await loan.getScheduledPaymentCount(), 8);
      assert.equal(await loan.totalInterest(), 16);
      assert.equal(await loan.outstandingPrinciple(), 0);
      assert.equal(await loan.shouldLockOnCredit(), true);

      mlog.log("Confirming disburse request ...");
      await loan.confirmDisburse(data.borrower, consts.ZERO_ADDRESS, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(await loan.state(), consts.Loan.Status.REPAYING);
      assert.equal(await loan.outstandingPrinciple(), 30000);
      assert.equal(await loan.shouldLockOnCredit(), false);

      mlog.log("1st payment request for [1st schedule payment] by borrower ...");
      let firstPaymentTime = firstDueTime - 1;
      await loan.repayRequest(0, consts.ZERO_ADDRESS, firstPaymentTime, 4000, 1, true, data.borrower, {
        from: testUtils.borrowerAccount,
        privateFor: testUtils.privateForNodes
      });

      mlog.log("Confirm 1st payment request by lender's delegate ...");
      await loan.repayConfirm(0, data.lenderDelegate, {
        from: data.lenderDelegateAccount,
        privateFor: testUtils.privateForNodes
      });
      let payment = await loan.getPayment(0);
      mlog.log("1st Payment state:", payment);
      assert.equal(payment[6], consts.Loan.Payment.Status.PAYMENT_CONFIRMED);
    });

    it("should be able to raise repay request by borrower's delegate");

    it("should be not able to raise repay request other than borrower", async function () {
      let data = await testUtils.createLoan(accounts);
      let loan = data.loan;
      let approvers = data.approvalWorkflow;

      mlog.log(`Approving by ${approvers[0]} and ${approvers[1]}`);
      await loan.approve(approvers[0], consts.ZERO_ADDRESS, true, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      }); // idAddr1
      await loan.approve(approvers[1], consts.ZERO_ADDRESS, true, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      }); // idAddr3
      await loan.approve(data.borrower, consts.ZERO_ADDRESS, true, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });

      let now = Date.now();
      let dueTime = [now, now + 10000, now + 20000];
      let dueAmount = [10000, 10000, 10000];
      let dueInterest = [1, 2, 3];
      let debtor = [data.borrower, data.borrower, data.borrower];
      let scheduledPaymentSequence = [1, 2, 3];

      let disburseTime = Date.now();
      let interestStartTime = Date.now() + 1;

      mlog.log("Disburse request ...");
      await loan.disburseRequest(consts.ZERO_ADDRESS, dueTime, dueAmount, dueInterest, disburseTime, interestStartTime, debtor, scheduledPaymentSequence, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      });

      mlog.log("Confirming disburse request ...");
      await loan.confirmDisburse(data.borrower, consts.ZERO_ADDRESS, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(await loan.state(), consts.Loan.Status.REPAYING);

      mlog.log("Repaying not by borrower, so it should throw...");
      await testUtils.assertThrows(loan.repayRequest(0, consts.ZERO_ADDRESS, now + 1, 10000, 1, true, data.borrower, {
        from: accounts[3],
        privateFor: testUtils.privateForNodes
      }));
    });

    it("should be not able to confirm repayment twice", async function () {
      let data = await testUtils.createLoan(accounts);
      let loan = data.loan;
      let approvers = data.approvalWorkflow;

      mlog.log(`Approving by ${approvers[0]} and ${approvers[1]}`);
      await loan.approve(approvers[0], consts.ZERO_ADDRESS, true, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      }); // idAddr1
      await loan.approve(approvers[1], consts.ZERO_ADDRESS, true, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      }); // idAddr3

      await loan.approve(data.borrower, consts.ZERO_ADDRESS, true, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });


      let now = Date.now();
      let dueTime = [now, now + 10000, now + 20000];
      let dueAmount = [10000, 10000, 10000];
      let dueInterest = [1, 2, 3];
      let debtor = [data.borrower, data.borrower, data.borrower];
      let scheduledPaymentSequence = [1, 2, 3];

      let disburseTime = Date.now();
      let interestStartTime = Date.now() + 1;

      mlog.log("Disburse request ...");
      await loan.disburseRequest(consts.ZERO_ADDRESS, dueTime, dueAmount, dueInterest, disburseTime, interestStartTime, debtor, scheduledPaymentSequence, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      });

      mlog.log("Confirming disburse request ...");
      await loan.confirmDisburse(data.borrower, consts.ZERO_ADDRESS, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(await loan.state(), consts.Loan.Status.REPAYING);

      mlog.log("1st Repayment request by borrower ..");
      await loan.repayRequest(0, consts.ZERO_ADDRESS, now + 1, 10000, 1, true, data.borrower, {
        from: testUtils.borrowerAccount,
        privateFor: testUtils.privateForNodes
      });

      mlog.log("2nd (duplicated) repayment request by borrower ..");
      await loan.repayRequest(0, consts.ZERO_ADDRESS, now + 1, 10000, 1, true, data.borrower, {
        from: testUtils.borrowerAccount,
        privateFor: testUtils.privateForNodes
      });

      mlog.log("confirm the 1st repayment by lender ..");
      await loan.repayConfirm(0, consts.ZERO_ADDRESS, {
        from: testUtils.lenderAccount,
        privateFor: testUtils.privateForNodes
      }); // confirm the 2nd payment

      mlog.log("should not be able to confirm the 2nd repayment by lender ..");
      await testUtils.assertThrows(loan.repayConfirm(1, consts.ZERO_ADDRESS, {
        from: testUtils.lenderAccount,
        privateFor: testUtils.privateForNodes
      })); // confirm the 2nd payment

      mlog.log("lender should be able to reject the 2nd repayment by lender ..");
      await loan.repayReject(1, testUtils.lenderIdAddr, consts.ZERO_ADDRESS, {
        from: testUtils.lenderAccount,
        privateFor: testUtils.privateForNodes
      });

      let payment = await loan.getPayment(1);
      mlog.log("2nd Payment state:", print(payment));
      assert.equal(payment[0], 0);
      assert.equal(payment[1], 10000);
      assert.equal(payment[6], consts.Loan.Payment.Status.PAYMENT_REJECTED);
    });
  })


  describe("Uploading Data", function () {
    it("should upload data to loan ", async function () {
      let data = await testUtils.createLoan(accounts);
      let loan = data.loan;
      let approvers = data.approvalWorkflow;

      let tx = await loan.addData(approvers[0], "QmVPu34oUpK4WuSr7vX4KqpptFyTV3GNfBe2JKxf7dMJLi", {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(tx.logs[0].args.actor, approvers[0]);
      assert.equal(tx.logs[0].args.dataId, 0);
    })

    it("should be able to sign contract", async function () {
      let data = await testUtils.createLoan(accounts);
      let loan = data.loan;
      let approvers = data.approvalWorkflow;
      let tx = await loan.eContractSigned(approvers[0], "QmVPu34oUpK4WuSr7vX4KqpptFyTV3GNfBe2JKxf7dMJLi", 1, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(tx.logs[0].args.actor, approvers[0]);
      assert.equal(tx.logs[0].args.dataId, 0);

      assert.equal(tx.logs[1].args.signerId, approvers[0]);
      assert.equal(tx.logs[1].args.idx, 0);
      assert.equal(tx.logs[1].args.templateId, 1);
    })

  });

  describe("Transfer Loan", function () {
    it("should be able to transfer loan", async function () {
      let data = await testUtils.createLoan(accounts);
      let loan = data.loan;
      let approvers = data.approvalWorkflow;

      mlog.log(`Approving Loan`);
      await loan.approve(approvers[0], consts.ZERO_ADDRESS, true, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      }); // idAddr1
      await loan.approve(approvers[1], consts.ZERO_ADDRESS, true, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      }); // idAddr3
      await loan.approve(data.borrower, consts.ZERO_ADDRESS, true, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });
      let now = Date.now();
      let firstDueTime = now;
      let secondDueTime = firstDueTime + 10000;
      let dueTime = [firstDueTime, secondDueTime, firstDueTime + 20000];
      let duePrinciple = [10000, 10000, 10000];
      let dueInterest = [1, 2, 3];
      let debtor = [data.borrower, data.borrower, data.borrower];
      let scheduledPaymentSequence = [1, 2, 3];

      let disburseTime = Date.now();
      let interestStartTime = Date.now() + 1;
      await loan.disburseRequest(consts.ZERO_ADDRESS, dueTime, duePrinciple, dueInterest, disburseTime, interestStartTime, debtor, scheduledPaymentSequence, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      });
      await loan.confirmDisburse(data.borrower, consts.ZERO_ADDRESS, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(await loan.state(), consts.Loan.Status.REPAYING);

      mlog.log(`Lender ${data.lender} should have correct balance ${await loan.totalPrinciple()}`);
      assert.equal(await loan.totalPrinciple(), 30000);
      assert.equal(await loan.balances(data.lender), 30000);

      let someCompany = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[8]);
      mlog.log(`Transferring some asset to some company ${last8(someCompany)}`);
      await loan.transfer(data.lender, someCompany, 2000, Date.now(), {
        from: data.lenderAccount,
        privateFor: testUtils.privateForNodes
      });
      assert.equal(await loan.balances(data.lender), 28000);
      assert.equal(await loan.balances(someCompany), 2000);

      let someCompany2 = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[9]);
      mlog.log(`Transferring some asset to some company ${last8(someCompany2)}`);
      await loan.transfer(someCompany, someCompany2, 1500, Date.now(), {
        from: accounts[8],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(await loan.balances(data.lender), 28000);
      assert.equal(await loan.balances(someCompany), 500);
      assert.equal(await loan.balances(someCompany2), 1500);
    });


    it("should be able to transfer more than owned", async function () {
      let data = await testUtils.createLoan(accounts);
      let loan = data.loan;
      let approvers = data.approvalWorkflow;

      mlog.log(`Approving Loan`);
      await loan.approve(approvers[0], consts.ZERO_ADDRESS, true, {
        from: accounts[0],
        privateFor: testUtils.privateForNodes
      }); // idAddr1
      await loan.approve(approvers[1], consts.ZERO_ADDRESS, true, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      }); // idAddr3
      await loan.approve(data.borrower, consts.ZERO_ADDRESS, true, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });

      let now = Date.now();
      let firstDueTime = now;
      let secondDueTime = firstDueTime + 10000;
      let dueTime = [firstDueTime, secondDueTime, firstDueTime + 20000];
      let duePrinciple = [10000, 10000, 10000];
      let dueInterest = [1, 2, 3];
      let debtor = [data.borrower, data.borrower, data.borrower];
      let scheduledPaymentSequence = [1, 2, 3];

      let disburseTime = Date.now();
      let interestStartTime = Date.now() + 1;
      await loan.disburseRequest(consts.ZERO_ADDRESS, dueTime, duePrinciple, dueInterest, disburseTime, interestStartTime, debtor, scheduledPaymentSequence, {
        from: accounts[2],
        privateFor: testUtils.privateForNodes
      });
      await loan.confirmDisburse(data.borrower, consts.ZERO_ADDRESS, {
        from: accounts[1],
        privateFor: testUtils.privateForNodes
      });
      assert.equal(await loan.state(), consts.Loan.Status.REPAYING);

      mlog.log(`Lender ${data.lender} should have correct balance ${await loan.totalPrinciple()}`);
      assert.equal(await loan.totalPrinciple(), 30000);
      assert.equal(await loan.balances(data.lender), 30000);

      let someCompany = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[6]);
      mlog.log(`Transferring more than owned, so it should fail`);
      await testUtils.assertThrows(loan.transfer(data.lender, someCompany, 30001, Date.now(), {
        from: data.lenderAccount,
        privateFor: testUtils.privateForNodes
      }));
    });
  });


})
