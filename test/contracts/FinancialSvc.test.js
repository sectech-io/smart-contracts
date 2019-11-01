'use strict'

import testUtils from '../support/truffle.test.utils';
import consts from '../support/consts';
import mlog from 'mocha-logger';

var FinancialSvc = artifacts.require("./FinancialSvc.sol");
var FinancialSvcV2_NewFunc = artifacts.require("FinancialSvcV2_NewFunc");
var Proxy = artifacts.require('Proxy');

contract('FinancialSvc Test', function(accounts) {

  before(async () => {
      await testUtils.initTestEnv(accounts[9]);
    }
  );

  describe("Create FinancialSvc", function() {
    it("should be able to create FinancialSvc with all the getter set", async function() {
      let svcOwner = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[0]);
      let proxy = await testUtils.createAndInit(FinancialSvc, ["Test Financial Svc", svcOwner, "Desc"], accounts[0]);

      let newSvcViaProxy = FinancialSvc.at(proxy.address);
      assert.equal(await newSvcViaProxy.getSvcOwner(), svcOwner);
      assert.equal(await newSvcViaProxy.owner(), svcOwner);
      assert.equal(await newSvcViaProxy.name(), "Test Financial Svc");
      assert.equal(await newSvcViaProxy.desc(), "Desc");
      let baseAttr = await newSvcViaProxy.getBaseAttrs()
      assert.equal(baseAttr[0], svcOwner);
      assert.equal(baseAttr[1], "Test Financial Svc");
      assert.equal(baseAttr[2], "Desc");
    })
  });

  describe("Manage Product Types", function() {
    it("should be able to add and enable/disable product", async function() {
      mlog.log("Create Svc Owner Identity ..");
      let svcOwner = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[0]);
      let proxy = await testUtils.createAndInit(FinancialSvc, ["Test Financial Svc", svcOwner, "Desc"], accounts[0]);
      let newSvc = FinancialSvc.at(proxy.address);


      mlog.log("Adding product 1");
      let ptx1 = await newSvc.addProduct("pIpfs1", true);
      assert.equal(ptx1.logs[0].event, "ProductAddedEvent");
      assert.equal(ptx1.logs[0].args.idx, 0);
      let productId1 = ptx1.logs[0].args.idx;

      mlog.log("Adding product 2");
      let ptx2 = await newSvc.addProduct("pIpfs2", true);
      assert.equal(ptx2.logs[0].event, "ProductAddedEvent");
      assert.equal(ptx2.logs[0].args.idx, 1);
      let productId2 = ptx2.logs[0].args.idx;

      mlog.log("Setting ipfs of Product 1 ");
      await newSvc.setProductIpfs(productId1, "ifodfodofdfdfdfdfdfdffdfd", true);
      let product1Details = await newSvc.getProduct(productId1);
      assert.equal(product1Details[0], "ifodfodofdfdfdfdfdfdffdfd");
      assert.equal(product1Details[1], true);


      mlog.log("Disable Product 1 ");
      await newSvc.setProductEnabled(productId1, false);
      product1Details = await newSvc.getProduct(productId1);
      assert.equal(product1Details[0], "ifodfodofdfdfdfdfdfdffdfd");
      assert.equal(product1Details[1], false);
    })

    it("should not be able to add product without permission", async function() {
      mlog.log("Create Svc Owner Identity ..");
      let svcOwner = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[0]);
      let proxy = await testUtils.createAndInit(FinancialSvc, ["Test Financial Svc", svcOwner, "Desc"], accounts[0]);
      let newSvc = FinancialSvc.at(proxy.address);

      mlog.log("Adding product without permission");
      await testUtils.assertThrows(newSvc.addProduct("pIpfs2", true, { from: accounts[1] }));
    })

    it("should not be able to set product enabled wihtout permission", async function() {
      mlog.log("Create Svc Owner Identity ..");
      let svcOwner = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[0]);
      let proxy = await testUtils.createAndInit(FinancialSvc, ["Test Financial Svc", svcOwner, "Desc"], accounts[0]);
      let newSvc = FinancialSvc.at(proxy.address);

      mlog.log("Adding product");
      let ptx = await newSvc.addProduct("pIpfs2", true);
      let productId = ptx.logs[0].args.idx;
      mlog.log("Setting product enabled without permission");
      await testUtils.assertThrows(newSvc.setProductEnabled(productId, false, { from: accounts[1] }));
    })
  });


  describe("Upgrade FinancialSvc", function() {

    it("Test Upgrade", async function() {
      mlog.log("Create Svc Owner Identity ..");
      let svcOwner = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[0]);

      mlog.log("Create and Init V1 ..");
      let proxy = await testUtils.createAndInit(FinancialSvc, ["Test Financial Svc", svcOwner, "Desc"], accounts[0]);
      let svcV1Proxy = FinancialSvc.at(proxy.address);

      let svcV2 = await FinancialSvcV2_NewFunc.new();
      let svcV2Proxy = FinancialSvcV2_NewFunc.at(proxy.address)

      mlog.log("Upgrade to V2 ..");
      await svcV1Proxy.upgradeTo(svcV2.address);
      assert.equal(await svcV2Proxy.newGetSvcOwner(), svcOwner);

      mlog.log("Verify contract state ..");
      assert.equal(await svcV2Proxy.owner(), svcOwner);
      assert.equal(await svcV2Proxy.name(), "Test Financial Svc");
      assert.equal(await svcV2Proxy.desc(), "Desc");
    })

    it("Should not be able to upgrade if it's not admin", async function() {
      mlog.log("Create Svc Owner Identity ..");
      let svcOwner = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[0]);

      mlog.log("Create and Init V1 ..");
      let proxy = await testUtils.createAndInit(FinancialSvc, ["Test Financial Svc", svcOwner, "Desc"], accounts[0]);
      let svcV1Proxy = FinancialSvc.at(proxy.address);

      let svcV2 = await FinancialSvcV2_NewFunc.new();

      mlog.log("Upgrade to V2 by non-admin, so it should fails ..");
      await testUtils.assertThrows(svcV1Proxy.upgradeTo(svcV2.address, {from: accounts[1]}));

      mlog.log("Should still be able to use proxy v1 ");
      assert.equal(await svcV1Proxy.getSvcOwner(), svcOwner);

    })
  });
});