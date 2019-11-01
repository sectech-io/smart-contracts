'use strict';

import assert from 'assert';
import mlog from 'mocha-logger';
import consts from './consts';
import web3Utils from 'web3-utils';
import utils from './utils.js';
import async from 'async';
import web3Abi from "web3-eth-abi";

var IdentityManager = artifacts.require("./IdentityManager.sol");
var SvcNodeRegistry = artifacts.require("./SvcNodeRegistry.sol");
var AttestationSvc = artifacts.require("./AttestationSvc.sol");
var Agreement = artifacts.require("./Agreement.sol");
var CreditLine = artifacts.require("./CreditLine.sol");
var Loan = artifacts.require("./Loan.sol");
var Identity = artifacts.require("Identity");
var ethJSUtil = require('ethereumjs-util');
var EventBus = artifacts.require('./EventBus.sol');
var ContractProxy = artifacts.require('./AdminableProxy.sol');

var last8 = utils.last8;
var print = utils.print;
var nodes = exports.nodes = [
  'BULeR8JyUWhiuuCMU/HLA0Q5pzkYT+cHII3ZKBey3Bo=',
  'QfeDAys9MPDs2XHExtc84jKGHxZg/aj52DTh0vtA3Xc=',
  '1iTZde/ndBHvzhcl7V68x44Vx7pl8nwx9LqnM/AfJUg=',
  'oNspPPgszVUFw0qmGFfWwh1uxVUXgvBxleXORHj07g8=',
  'R56gy4dn24YOjwyesTczYa8m5xhP6hF2uTMCju/1xkY='];

var privateForNodes = exports.privateForNodes = ['QfeDAys9MPDs2XHExtc84jKGHxZg/aj52DTh0vtA3Xc=']; // 2nd node

var pubKey = exports.defaultPubKey = "-----BEGIN PUBLIC KEY----- MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvP6LgE8vbrEJrSrBaxS7 mxJrthbzbgInyJnOUdBNrAOaZEX969iJ4ry6HO4K+9JBlTZpvLdQ2rqgz5G1jaiI rVfDkjy/xhmagFdvhdW3qrOW1pUCPT+MEGl0XCrFt3xtweGL8l0SFrAb2mQdseBd TidPAL+aXWmfgIJ3g7WwdQFW0JpxSfu7twZAxpCjOo/2HYK+nNhxciSu6lqGqyC3 LGDOhrS7TJYrICoVDt3iUlYAHvWG2ziPQSAg0lCNPxFg8/+mRzDTpPcMMaCpw/l4 OC8Wm3aWVJmAQfQUzljc8tCUsHIseRQMdxEGXJWtmD9USrmTkA1zkHIbeCXgenAB WwIDAQAB -----END PUBLIC KEY-----";
var nodeKey = exports.defaultNodeKey = "BULeR8JyUWhiuuCMU/HLA0Q5pzkYT+cHII3ZKBey3Bo=";

var anchorAttestationSvcInfo;
var idMgrProxy;
var eventBusProxy;
var svcNodeRegistryProxy;

var isTestRpcEnv = () => {
  return global.currentNetwork.search("testrpc") >= 0 || global.currentNetwork.search("quorum") >= 0;
}

var getIdentityManager = exports.getIdentityManager = async () => {
  if (isTestRpcEnv()) {
    return idMgrProxy;
  } else {
    return await IdentityManager.at(consts.Global_Address.IDENTITY_MANAGER);
  }
}

var initIdMgr = async (adminAcct) => {
  if (isTestRpcEnv()) {
    let proxy = await createAndInit(IdentityManager, [(await getSvcNodeRegistry()).address], adminAcct);
    idMgrProxy = IdentityManager.at(proxy.address);
    mlog.log("Initiated idMgrProxy");
  }
}

var initEventBus = async (adminAcct) => {
  if (isTestRpcEnv()) {
    let proxy = await createAndInit(EventBus, [], adminAcct);
    eventBusProxy = EventBus.at(proxy.address);
    mlog.log("Initiated eventBusProxy");
  }
}

var initSvcNodeRegistry = async (adminAcct) => {
  if (isTestRpcEnv()) {
    let proxy = await createAndInit(SvcNodeRegistry, [], adminAcct);
    svcNodeRegistryProxy = SvcNodeRegistry.at(proxy.address);
    mlog.log("Initiated svcNodeRegistryProxy");
  }
}

exports.initTestEnv = async (adminAcct) => {
  await initSvcNodeRegistry(adminAcct);
  await initIdMgr(adminAcct);
  await initAnchorAttestationSvc(adminAcct);
  await initEventBus(adminAcct);
}

let initAnchorAttestationSvc = exports.initAnchorAttestationSvc = async (svcOwnerAcct) => {
  mlog.log("Init the anchor identity for anchor attestation service ... ");
  let svcNodeRegistry = await getSvcNodeRegistry();
  let ownerId = await createAnchorIdentity(consts.IdentityType.INDIVIDUAL, svcOwnerAcct, svcOwnerAcct, "anchor_identity", "441622198302011772"); // anchor node

  mlog.log(`Init the anchor attestation service with owner ${last8(ownerId.idAddr)} ... `);
  let proxy = await createAndInit(AttestationSvc, ["AttestationSvc from truffle test util", ownerId.idAddr], svcOwnerAcct);
  let attestationSvc = await AttestationSvc.at(proxy.address);

  mlog.log(`Registering anchor attest svc ${last8(attestationSvc.address)} to SvcNodeRegistry, fromAcct: ${svcOwnerAcct}`);
  await svcNodeRegistry.register(attestationSvc.address, consts.ServiceType.ATTESTATION, consts.ServiceType.SUBTYPE_DEFAULT, {from: svcOwnerAcct});

  anchorAttestationSvcInfo = {attestSvcAddr: attestationSvc.address, attestSvcAccount: svcOwnerAcct};
  exports.anchorAttestSvcAccount = svcOwnerAcct;
  exports.anchorAttestSvcAddr = attestationSvc.address;
}


var getSvcNodeRegistry = exports.getSvcNodeRegistry = async () => {
  if (isTestRpcEnv()) {
    return svcNodeRegistryProxy;
  } else {
    return await SvcNodeRegistry.at(consts.Global_Address.SVC_NODE_REGISTRY);
  }
}

exports.getEventBus = async () => {
  if (isTestRpcEnv()) {
    return eventBusProxy;
  } else {
    return await EventBus.at(consts.Global_Address.EVENT_BUS);
  }
}

var runner = (identityManager, batchData, createIdRunnable) => {
  let arr = [];
  for (let i = 0; i < batchData.length; i++) {
    let func = async (callback) => {
      let result = await createIdRunnable(identityManager, batchData[i].type, batchData[i].owner, batchData[i].account ? batchData[i].account.toString() : undefined);
      callback(null, result);
    }
    arr.push(func);
  }
  return arr;
}

exports.assertThrows = async (promise) => {
  try {
    await promise;
  } catch (error) {
    const invalidOpcode = error.message.search('invalid opcode') >= 0;
    const outOfGas = error.message.search('out of gas') >= 0;
    const revert = error.message.search('revert') >= 0;
    const quorumErr = error.message.search('StatusCode:500') >= 0;
    const quorumErr2 = (typeof error == "object" && error.toString().search('The contract code couldn\'t be stored, please check your gas amount') >= 0);
    const quorumErr3 = error.message.search('mined but execution failed') >= 0;

    assert(
      invalidOpcode || outOfGas || revert || quorumErr || quorumErr2 || quorumErr3,
      'Expected throw, got \'' + error + '\' instead',
    );
    mlog.log("Received expected error: ", error.message);
    return;
  }
  assert.fail('Expected throw not received');
}

var createIdentityRunnable = async (identityManager, type, owner, account) => {
  assert(owner != undefined, "Identity owner should not be undefined");
  let from = account ? account : owner;
  return await createIdInternal(await getIdentityManager(), type, owner, from);
}

// batchData = [{type, owner}, ...]
let createIdentityInBatch = exports.createIdentityInBatch = async (batchData) => {
  mlog.log(`Create ${batchData.length} Identities in parallel..`);
  let identityManager = await getIdentityManager();
  let start = Date.now();
  let results = await new Promise((resolve, reject) => {
    async.parallel(runner(identityManager, batchData, createIdentityRunnable), function (err, results) {
      if (err) {
        reject(err);
      } else {
        mlog.log("All results returned");
        resolve(results);
      }
    });
  });
  mlog.log(`Create Identity in batch took ${Date.now() - start}ms`);
  return results;
}

let createIdInternal = async (identityManager, type, owner, fromAcct, name, id) => {
  let idCounter = last8(utils.genUUid());
  let testId = id ? id : "testid_" + idCounter;
  let testName = name ? name : "testName_" + idCounter;
  let testIdSha3 = keccak256(testId);
  let testNameSha3 = keccak256(testName);
  mlog.log("Creating Identity with idHash: ", last8(testIdSha3), " nameHash:", last8(testNameSha3), " type:", type, "owner: " + last8(owner), "fromAcct: " + last8(fromAcct));
  if (!anchorAttestationSvcInfo) {
    throw new Error("Anchor attestation svc hasn't been initialize, you should init the service in before{} hook with 'initAnchorAttestationSvc(accounts[9])' in Truffle test.");
  }
  let attestType = "attest_2_apply";
  let signResult = signDataFunc(attestType + "true" + testIdSha3, anchorAttestationSvcInfo.attestSvcAccount);

  let proxy = await createAndInit(Identity, [testIdSha3, testNameSha3, true, type, pubKey, nodeKey], fromAcct);
  let idProxy = await Identity.at(proxy.address);

  mlog.log(`Registering id to IdMgr ${last8(identityManager.address)}`);

  let tx = await identityManager.registerIdentity(idProxy.address, owner, anchorAttestationSvcInfo.attestSvcAddr, attestType, signResult.v, signResult.r, signResult.s, {from: fromAcct});
  assert.equal(tx.logs[1].args.owner, owner);
  return {
    tx: tx,
    fromAcct: fromAcct,
    type: type,
    owner: owner,
    id: testId,
    name: testName,
    idSha3: testIdSha3,
    nameSha3: testNameSha3,
    idAddr: tx.logs[1].args.identity
  };
}
//     let ownerId = await createAnchorIdentity(consts.IdentityType.INDIVIDUAL, svcOwnerAcct, svcOwnerAcct, "anchor_identity", "440000201801010000"); // anchor node
let createAnchorIdentity = exports.createAnchorIdentity = async (type, owner, fromAccount, testName, testId) => {
  let testIdSha3 = '0x' + ethJSUtil.sha3(testId).toString('hex');
  let testNameSha3 = '0x' + ethJSUtil.sha3(testName).toString('hex');

  mlog.log("Creating Anchor Identity with idHash: ", last8(testIdSha3), " nameHash:", last8(testNameSha3), " type:", type, "owner: " + last8(owner), "fromAcct: " + last8(fromAccount));

  let proxy = await createAndInit(Identity, [testIdSha3, testNameSha3, true, type, pubKey, nodeKey], fromAccount);
  let idProxy = await Identity.at(proxy.address);

  let identityManager = await getIdentityManager();
  mlog.log(`Registering id to IdMgr ${last8(identityManager.address)}`);
  let tx = await identityManager.registerIdentity(idProxy.address, owner, null, "attest_2_apply", 0, null, null, {from: fromAccount});
  mlog.log("Created Anchor Identity");
  assert.equal(tx.logs[0].args.owner, owner);
  return {
    tx: tx,
    fromAcct: fromAccount,
    type: type,
    owner: owner,
    id: testId,
    name: testName,
    idSha3: testIdSha3,
    nameSha3: testNameSha3,
    idAddr: tx.logs[0].args.identity
  };
}

exports.createIdentity = async (type, owner, fromAcct) => {
  assert(owner != undefined, "Identity owner should not be undefined");
  let from = fromAcct ? fromAcct : owner;
  let idData = await createIdInternal(await getIdentityManager(), type, owner, from);
  return idData.idAddr;
}

exports.createIdentityWithIdName = async (type, owner, fromAcct, name, id) => {
  assert(owner != undefined, "Identity owner should not be undefined");
  let from = fromAcct ? fromAcct : owner;
  let idData = await createIdInternal(await getIdentityManager(), type, owner, from, name, id);
  return idData.idAddr;
}

let prepareData = async (accounts) => {

  let results = await createIdentityInBatch([
    {type: consts.IdentityType.COMPANY, owner: accounts[0]},
    {type: consts.IdentityType.COMPANY, owner: accounts[1]},
    {type: consts.IdentityType.COMPANY, owner: accounts[2]},
    {type: consts.IdentityType.COMPANY, owner: accounts[3]},
    {type: consts.IdentityType.INDIVIDUAL, owner: accounts[4]},
    {type: consts.IdentityType.INDIVIDUAL, owner: accounts[5]},
    {type: consts.IdentityType.INDIVIDUAL, owner: accounts[6]},
    {type: consts.IdentityType.INDIVIDUAL, owner: accounts[7]},
  ]);

  let guarantee = results[0].idAddr;
  let borrower = results[1].idAddr;
  let lender = results[2].idAddr;
  let channel = results[3].idAddr;

  let participants = [guarantee, lender, channel];
  let roles = [consts.Role.GUARANTEE, consts.Role.LENDER, consts.Role.CHANNEL];
  let approvalWorkflow = [guarantee, lender];

  exports.guaranteeAccount = accounts[0];
  exports.borrowerAccount = accounts[1];
  exports.lenderAccount = accounts[2];

  exports.guaranteeIdAddr = guarantee;
  exports.borrowerIdAddr = borrower;
  exports.lenderIdAddr = lender;

  let guaranteeDelegate = results[4].idAddr;
  let borrowerDelegate = results[5].idAddr;
  let lenderDelegate = results[6].idAddr;
  let channelDelegate = results[7].idAddr;

  await runInParallel([
    async (callback) => {
      await authorize(guarantee, guaranteeDelegate, accounts[0]);
      callback(null, null);
    },
    async (callback) => {
      await authorize(borrower, borrowerDelegate, accounts[1]);
      callback(null, null);
    },
    async (callback) => {
      await authorize(lender, lenderDelegate, accounts[2]);
      callback(null, null);
    },
    async (callback) => {
      await authorize(channel, channelDelegate, accounts[3]);
      callback(null, null);
    }
  ]);

  await authorize(guarantee, guaranteeDelegate, accounts[0]);
  await authorize(borrower, borrowerDelegate, accounts[1]);
  await authorize(lender, lenderDelegate, accounts[2]);
  await authorize(channel, channelDelegate, accounts[3]);

  return {
    participants: participants,
    roles: roles,
    borrower: borrower,
    borrowerAccount: accounts[1],
    lender: lender,
    lenderAccount: accounts[2],
    guarantee: guarantee,
    guaranteeAccount: accounts[0],
    channel: channel,
    channelAccount: accounts[3],
    borrowerDelegate: borrowerDelegate,
    borrowerDelegateAccount: accounts[5],
    lenderDelegate: lenderDelegate,
    lenderDelegateAccount: accounts[6],
    guaranteeDelegate: guaranteeDelegate,
    guaranteeDelegateAccount: accounts[4],
    channelDelegate: channelDelegate,
    channelDelegateAccount: accounts[7],
    approvalWorkflow: approvalWorkflow
  }
}

let createAgreement = exports.createAgreement = async (accounts) => {
  mlog.log(`Creating Agreement ...`);
  let data = await prepareData(accounts);
  mlog.log(`Agreement privateForNodes ${print(privateForNodes)}`);
  let proxy = await createAndInit(Agreement, [data.participants[0], data.participants, data.roles, data.approvalWorkflow, "encryptKey"], accounts[0], privateForNodes);
  let agreementProxy = Agreement.at(proxy.address);
  return Object.assign({agreement: agreementProxy}, data);
}


let authorize = exports.authorize = async (tagAddr, authorizedAddr, fromAccount) => {
  mlog.log("Authorizing id", last8(tagAddr), "to " + last8(authorizedAddr), "from account", last8(fromAccount));
  let identityManager = await getIdentityManager();
  await identityManager.authorize(tagAddr, authorizedAddr, {from: fromAccount});
}

exports.toAscii = function (web3, hex) {
  return web3.toAscii(hex).replace(/\u0000/g, '');
}

let createCreditLine = exports.createCreditLine = async (accounts) => {
  let agreementResult = await createAgreement(accounts);
  let agreementAddr = agreementResult.agreement.address;

  let borrower = agreementResult.borrower; // idAddr2 is borrower
  let lender = agreementResult.participants[1]; // idAddr3 is lender
  let desEncryptionKey = "1233910u1";
  mlog.log("Creating Credit Line with account:", last8(agreementResult.borrowerAccount));
  let proxy = await createAndInit(CreditLine, [agreementAddr, borrower, consts.ZERO_ADDRESS, "1", desEncryptionKey], agreementResult.borrowerAccount, privateForNodes);
  let creditLine = CreditLine.at(proxy.address);
  mlog.log("Created Credit Line:", creditLine.address, "borrower:", await creditLine.borrower());
  return Object.assign({
    creditLine: creditLine,
  }, agreementResult);
}

exports.createCreditLineWithOneMillionApprovedAmount = async (accounts) => {
  let creditLineResult = await createCreditLine(accounts);
  let agreementAddr = creditLineResult.agreementResult.agreement.address;
  let approvers = creditLineResult.agreementResult.approvers;
  let desEncryptionKey = "1233910u1";
  let creditLine = await CreditLine.new(agreementAddr, "1", desEncryptionKey);
  mlog.log("Created Credit Line:", creditLine.address);

  await creditLine.action(approvers[0], "0x00", true, 1000000, "approved by addr1", {from: accounts[0]});
  await creditLine.action(approvers[1], "0x00", true, 1000000, "approved by addr3", {from: accounts[2]});
  return creditLineResult;
}

exports.createLoan = async (accounts, borrowerAs) => {
  let creditLineData = await createCreditLine(accounts);
  let useBorrowerAccount = borrowerAs ? borrowerAs : accounts[1];
  let creditLine = creditLineData.creditLine;

  mlog.log("Approve creditline ... ");
  await creditLine.submit(creditLineData.borrower, consts.ZERO_ADDRESS, 300000, {
    from: accounts[1],
    privateFor: privateForNodes
  });
  await creditLine.action(creditLineData.approvalWorkflow[0], consts.ZERO_ADDRESS, true, 300000, "Remarks", {
    from: accounts[0],
    privateFor: privateForNodes
  });
  await creditLine.action(creditLineData.approvalWorkflow[1], consts.ZERO_ADDRESS, true, 300000, "Remarks", {
    from: accounts[2],
    privateFor: privateForNodes
  });
  // creditLineData.participants.push(creditLineData.borrower);
  // creditLineData.roles.push(consts.Role.BORROWER);
  // creditLineData.approvalWorkflow.push(creditLineData.borrower);

  mlog.log("CreditLine isOpened:", await creditLine.isOpened(), ",available amount:", await creditLineData.creditLine.getAvailableAmount(), ",used Amount:", await creditLine.getUsedAmount(), ",frozen Amount", await creditLine.getFrozenAmount());
  mlog.log("Creating Loan with borrower account:", useBorrowerAccount,);
  mlog.log("Creating Loan with borrower participants:", creditLineData.participants);
  mlog.log("Creating Loan with borrower account:", creditLineData.roles);
  mlog.log("Creating Loan with borrower approvalWorkflow:", creditLineData.approvalWorkflow);
  let loan = await Loan.new(
    creditLine.address, creditLineData.participants,
    creditLineData.roles, creditLineData.approvalWorkflow,
    0, 3, 1200, 30000, "productConfigIpfsHash", "id", "encryptionKey", {
      from: useBorrowerAccount,
      privateFor: privateForNodes
    }
  );

  let txReceipt = await web3.eth.getTransactionReceipt(loan.transactionHash);
  mlog.log(`Created Loan ${loan.address}, used gas: ${txReceipt.gasUsed}`);
  return Object.assign(creditLineData, {loan: loan});
}

exports.print = (json) => {
  return JSON.stringify(json, null, 2);
}

let runInParallel = exports.runInParallel = async (jobs) => {
  mlog.log(`Running ${jobs.length} jobs in parallel`);
  let start = Date.now();
  return new Promise((resolve, reject) => {
    async.parallel(jobs,
      function (err, results) {
        if (err) {
          mlog.log(`Error occurred when running jobs`);
          reject(err);
        } else {
          mlog.log(`All results returned, took ${Date.now() - start}ms`);
          resolve(results);
        }
      });
  });
}

var signDataFunc = exports.signDataFunc = function (data, accountAddr) {
  var msgData = web3Utils.soliditySha3(data);
  var signature = web3.eth.sign(accountAddr, msgData.toString('hex')); // Signing the message
  var r = signature.slice(0, 66);
  var s = '0x' + signature.slice(66, 130);
  var v = '0x' + signature.slice(130, 132);
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

var createAndInit = exports.createAndInit = async (contract, args, fromAcct, privateFor) => {

  let isPrivateContract = (privateFor && privateFor.length > 0);
  let newContract = isPrivateContract ? await contract.new({
    privateFor: privateFor,
    gas: 20000000
  }) : await contract.new({gas: 20000000});
  let receipt = await web3.eth.getTransactionReceipt(newContract.transactionHash);
  mlog.log(`Target ${isPrivateContract ? "private " : ""}${contract.contractName} contract created: ${newContract.address} used gas ${receipt.gasUsed}`);
  let proxy = isPrivateContract ? await ContractProxy.new(newContract.address, {
    privateFor: privateFor,
    gas: 20000000
  }) : await ContractProxy.new(newContract.address, {gas: 20000000});
  let proxied = contract.at(proxy.address);

  // Find the correct ABI
  let initializeWithNoArg;
  let initializeWithArgs;
  let abi = contract.abi;
  for (let i = 0; i < abi.length; i++) {
    if (abi[i].name == "initialize") {
      if (abi[i].inputs.length == 0) {
        initializeWithNoArg = abi[i];
      } else {
        initializeWithArgs = abi[i];
      }
    }
  }
  assert(initializeWithNoArg || initializeWithArgs);
  let abiToUse = args.length == 0 ? initializeWithNoArg : initializeWithArgs;

  mlog.log(`Initialize ${isPrivateContract ? "private " : ""}${contract.contractName} contract ${last8(newContract.address)}`); // args ${print(args)}
  let initializeTransactionData = web3Abi.encodeFunctionCall(abiToUse, args);
  let ethOption = {from: fromAcct, to: proxied.address, data: initializeTransactionData, value: 0, gas: 20000000};
  if (isPrivateContract) {
    ethOption = Object.assign(ethOption, {privateFor: privateFor});
  }
  receipt = await new Promise(async (resolve, reject) => {
    web3.eth.sendTransaction(ethOption, function (err, transactionHash) {
      if (err) {
        mlog.log(`Error when init proxy contract: ${err}`);
        return reject({message: err.toString()});
      } else {
        tryTillResponse(transactionHash, 20, (err, result) => {
          if (err) {
            mlog.log(`Error when init proxy contract: ${err}`);
            return reject({message: err.toString()});
          } else {
            return resolve(result);
          }
        })
      }
    });
  });
  mlog.log(`Initialized ${isPrivateContract ? "private " : ""}${contract.contractName} contract '${contract.contractName}' at proxy: ${last8(proxied.address)} target: ${last8(newContract.address)}, fromAccount: ${last8(fromAcct)}, tx = ${print(receipt.transactionHash)}`);
  return proxy;
}

exports.createAndInitWithContract = async (contract, args, fromAcct) => {
  let proxy = await createAndInit(contract, args, fromAcct);
  return contract.at(proxy.address);
}

exports.createAndInitWithPrivateContract = async (contract, args, fromAcct, privateFor) => {
  let proxy = await createAndInit(contract, args, fromAcct, privateFor);
  return contract.at(proxy.address);
}

var keccak256 = exports.keccak256 = (str) => {
  return '0x' + ethJSUtil.sha3(str).toString('hex');
}

let tryTillResponse = (txhash, tryTime, done) => {
  web3.eth.getTransactionReceipt(txhash, (err, result) => {
    if (err || !result) {
      if (tryTime) {
        //logger.debug(`Try get data of ${txhash} at ${tryTime} count `)
        setTimeout(function () {
          tryTillResponse(txhash, --tryTime, done)
        }, 800);
      } else {
        err = 'The number of retries has been used up';
        done(err, null, tryTime)
      }
    } else {
      if (result.status == "0x0") {
        err = `Transaction of ${txhash} mined but execution failed.`
      }
      done(err, result);
    }
  })
}
