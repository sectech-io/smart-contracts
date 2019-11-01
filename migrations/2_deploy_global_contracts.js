var assert = require( "assert");
var web3Abi = require ("web3-eth-abi");
var async = require('async');
var fs = require('fs');

var AdminableProxy = artifacts.require("AdminableProxy");
var IdentityManager = artifacts.require("IdentityManager");
var CreditRegistry = artifacts.require("CreditRegistry");
var AttestationSvc = artifacts.require("AttestationSvc");
var AssetRegistry = artifacts.require("AssetRegistry");
var Agreement = artifacts.require("Agreement");
var StringUtils = artifacts.require("StringUtils");
var SvcNodeRegistry = artifacts.require("SvcNodeRegistry");
var MathUtils = artifacts.require("MathUtils");
var SafeMath = artifacts.require("SafeMath");
var CreditLine = artifacts.require("CreditLine");
var CreditLineV2_OverrideFunc = artifacts.require("CreditLineV2_OverrideFunc");
var Loan = artifacts.require("Loan");
var EventBus = artifacts.require("EventBus");
var LoanLib = artifacts.require("LoanLib");
var AddressArrayUtils = artifacts.require("AddressArrayUtils");
var DataRecordLib = artifacts.require("DataRecordLib");
var CommonDef = artifacts.require("CommonDef");
var IntArrayUtils = artifacts.require("IntArrayUtils");
var AgreementV2_newLib = artifacts.require("AgreementV2_newLib");
var New_AddressArrayUtils = artifacts.require("New_AddressArrayUtils");

global.currentNetwork;

module.exports = async function (deployer, network, accounts) {
  global.currentNetwork = network;

  console.log("Deploying Libaraies .... ");
  deployer.deploy(LoanLib);
  deployer.deploy(StringUtils);
  deployer.deploy(CommonDef);
  deployer.deploy(AddressArrayUtils);
  deployer.deploy(DataRecordLib);
  deployer.deploy(MathUtils);
  deployer.deploy(SafeMath);
  deployer.deploy(IntArrayUtils);

  console.log("Link libs to contracts .... ");
  deployer.link(StringUtils, IdentityManager);
  deployer.link(StringUtils, Agreement);
  deployer.link(IntArrayUtils, Agreement);
  deployer.link(AddressArrayUtils, Agreement);
  deployer.link(AddressArrayUtils, CreditLine);
  deployer.link(StringUtils, CreditLine);
  deployer.link(MathUtils, CreditLine);
  deployer.link(CommonDef, Loan);
  deployer.link(AddressArrayUtils, Loan);
  deployer.link(DataRecordLib, Loan);
  deployer.link(LoanLib, Loan);
  deployer.link(SafeMath, Loan);

  if (network.search("testrpc") >= 0 || network.search("quorum_local") >= 0) {
    console.log("Deploying and link test contracts for truffle tests .... ");
    deployer.deploy(New_AddressArrayUtils);
    deployer.link(StringUtils, AgreementV2_newLib);
    deployer.link(IntArrayUtils, AgreementV2_newLib);
    deployer.link(New_AddressArrayUtils, AgreementV2_newLib);
    deployer.link(StringUtils, CreditLineV2_OverrideFunc);
    deployer.link(MathUtils, CreditLineV2_OverrideFunc);
  }

  let timeout;

  console.log("Deploying global contracts  .... ");
  async.map([IdentityManager, SvcNodeRegistry, EventBus, CreditRegistry, AssetRegistry], function (item, done) {
    deployer.deploy(item).then(function () {
      return deployer.deploy(AdminableProxy, item.address).then(function () {
        console.log(`Deployed Proxy for ${item.contractName} =`, AdminableProxy.address);
        done(null, AdminableProxy.address);
      });
    })
  }, async function (err, results) {
    if (err) {
      console.error("Error occurred when deploy global contracts", err);
    } else {
      console.log("Initiating IdentityManager");
      let args = [results[1]]; // SvcNodeRegistry address
      // Find the correct ABI
      let initializeWithNoArg;
      let initializeWithArgs;
      let abi = IdentityManager.abi;
      for(let i = 0; i < abi.length; i++) {
        if (abi[i].name == "initialize") {
          if (abi[i].inputs.length == 0) {
            initializeWithNoArg = abi[i];
          } else {
            initializeWithArgs = abi[i];
          }
        }
      }
      assert (initializeWithNoArg || initializeWithArgs);
      let abiToUse = args.length == 0 ? initializeWithNoArg : initializeWithArgs;

      console.log(`Initialize IdentityManager ${results[0]}`); // args ${print(args)}
      let initializeTransactionData = web3Abi.encodeFunctionCall(abiToUse, args);
      await web3.eth.sendTransaction({from: accounts[0], to: results[0], data: initializeTransactionData, value: 0, gas: 10000000});
      console.log(`Initialized contract 'IdentityManager' at proxy: ${results[0]} fromAccount: ${accounts[0]}`);

      console.log("All global contracts deployed");
      let globalContracts = {
        network: global.currentNetwork,
        IdentityManager: results[0],
        SvcNodeRegistry: results[1],
        EventBus: results[2],
        CreditRegistry: results[3],
        AssetRegistry: results[4],
      }
      let globalContractsJson = JSON.stringify(globalContracts, null, 2);
      console.log(`Global Contracts: ${globalContractsJson}`);
      fs.writeFileSync("global-contracts-addr.json", globalContractsJson);
      console.log("Generated global-contracts-addr.json");
    }
    clearTimeout(timeout);
  });

  console.log("Set timer to wait for 40s");
  timeout = setTimeout(() => {
    console.log("Timer expired!");
  }, 40000);
};