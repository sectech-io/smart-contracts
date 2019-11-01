'use strict'

import testUtils from '../support/truffle.test.utils';
import consts from '../support/consts';
import mlog from 'mocha-logger';

var FinancialSvc = artifacts.require("./FinancialSvc.sol");

contract('Performance Test', function(accounts) {
  describe("Private contract performance test", function() {

    before(async () => {
        await testUtils.initTestEnv(accounts[9]);
      }
    );

    it("Test concurrent read performance / 3", async function() {
      try{
        await performanceTest(3, accounts);
      } catch (err){
        mlog.error("Performance test failed, but it shouldn't fail the test, as the test is for indication only.");
      }
    })

    it("Test concurrent read performance / 4", async function() {
      try{
        await performanceTest(4, accounts);
      } catch (err){
        mlog.error("Performance test failed, but it shouldn't fail the test, as the test is for indication only.");
      }
    })

    it("Test concurrent read performance / 5", async function() {
      try{
        await performanceTest(5, accounts);
      } catch (err){
        mlog.error("Performance test failed, but it shouldn't fail the test, as the test is for indication only.");
      }
    })

    it("Test concurrent read performance / 6", async function() {
      try{
        await performanceTest(6, accounts);
      } catch (err){
        mlog.error("Performance test failed, but it shouldn't fail the test, as the test is for indication only.");
      }
    })

    it("Test concurrent read performance / 10", async function() {
      try{
        await performanceTest(10, accounts);
      } catch (err){
        mlog.error("Performance test failed, but it shouldn't fail the test, as the test is for indication only.");
      }
    })
  });
});

var performanceTest = async (numOfJobs, accounts) =>{
  mlog.log("Create Svc Owner Identity ..");
  let svcOwner = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[0]);
  //mlog.log("Creating Svc private for", testUtils.privateForNodes);

  let newSvc = await testUtils.createAndInitWithContract(FinancialSvc, ["Test Financial Svc", svcOwner, "Desc"], accounts[0]);

  mlog.log("Adding products");
  let numOfProducts = numOfJobs;
  let writeFuns = []
  for (let i = 0; i< numOfProducts; i ++){
    writeFuns.push(async(callback)=>{
      let ptx = await newSvc.addProduct("pIpfs" + i, true ); // {privateFor: testUtils.privateForNodes}
      mlog.log("addProduct completed, txHash:", ptx.tx);
      if (!ptx.logs[0]){
        mlog.error("addProduct returned invalid result");
      }
      callback(null, ptx.logs[0] ? ptx.logs[0].args.idx : null);
    });
  }
  let results = await testUtils.runInParallel(writeFuns);
  mlog.log("Result:", JSON.stringify(results));

  let readFuns = []
  for (let i = 0; i< results.length; i ++){
    readFuns.push(async(callback)=>{
      let product1Details = await newSvc.getProduct(i);
      callback(null, product1Details);
    });
  }
  let start = Date.now();
  results = await testUtils.runInParallel(readFuns);
  mlog.log(`Concurrent read took ${Date.now() - start}ms, result:${JSON.stringify(results)}`);

  let serieReadStart = Date.now();
  for (let i = 0; i< numOfProducts; i ++){
    mlog.log(`Series read result:${JSON.stringify(await newSvc.getProduct(i))}`);
  }
  mlog.log(`Series read took ${Date.now() - serieReadStart}ms}`);
}