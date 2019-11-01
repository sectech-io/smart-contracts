import testUtils from '../support/truffle.test.utils';
import consts from '../support/consts';
import assert from "assert";

var SvcNodeRegistry = artifacts.require("./SvcNodeRegistry.sol");
var DataProvider = artifacts.require("./DataProviderSvc.sol");
var FinancialSvc = artifacts.require("./FinancialSvc.sol");
var AttestationSvc = artifacts.require("./AttestationSvc.sol");
var mlog = require("mocha-logger");


var addSupportTypes = async (dp, accounts) => {
  await testUtils.runInParallel([
    async (callback) => {
      await dp.addSupportedType("typeA", {from: accounts[1]});
      callback(null, null);
    },
    async (callback) => {
      await dp.addSupportedType("typeB", {from: accounts[1]});
      callback(null, null);
    },
    async (callback) => {
      await dp.addSupportedType("typeC", {from: accounts[1]});
      callback(null, null);
    }
  ]);
}

contract('SvcNodeRegistry', function(accounts) {

  before(async () => {
      await testUtils.initTestEnv(accounts[9]);
    }
  );

  describe("Registering svc", function() {
    it("should be able to register it's is owner", async function () {
      let proxy = await testUtils.createAndInit(SvcNodeRegistry, [], accounts[0]);
      let svcNodeReg = await SvcNodeRegistry.at(proxy.address);

      let identityManager = await testUtils.getIdentityManager();

      mlog.log("Create 1 Identities ..");
      let idAddr1 = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[1]);

      let dpProxy = await testUtils.createAndInit(DataProvider, ["Test Svc", idAddr1, "desc", identityManager.address, svcNodeReg.address], accounts[1]);
      let newDataProvider = await DataProvider.at(dpProxy.address);

      mlog.log("New DataProvider created :", newDataProvider.address);
      assert.equal(await newDataProvider.getSupportedTypesLength(), 0);

      mlog.log("Adding 3 supportedType");
      await addSupportTypes(newDataProvider, accounts);

      assert.equal(await newDataProvider.getSupportedTypesLength(), 3);

      mlog.log("Registering as svc node ..");
      var beforeLength = await svcNodeReg.getSvcNodeCount();
      await svcNodeReg.register(newDataProvider.address, 1, 2, { from: accounts[1] });

      mlog.log("Verifying svc node count");
      assert.equal(await svcNodeReg.getSvcNodeCount(), parseInt(beforeLength) + 1);

      let svcNode = await svcNodeReg.getSvcNode(beforeLength);
      mlog.log("Verifying svcnode 0:", svcNode);
      assert.equal(svcNode[0], newDataProvider.address);
      assert.equal(svcNode[1], 1);
      assert.equal(svcNode[2], 2);

      mlog.log("Verifying getSvcNodeByAddr ..");
      let svcNode2 = await svcNodeReg.getSvcNodeByAddr(newDataProvider.address);
      assert.equal(svcNode2[0], newDataProvider.address);
      assert.equal(svcNode2[1], 1);
      assert.equal(svcNode2[2], 2);
    })

    it("should be able to register it's is authorized from owner", async function() {

      let proxy = await testUtils.createAndInit(SvcNodeRegistry, [], accounts[0]);
      let svcNodeReg = await SvcNodeRegistry.at(proxy.address);
      let identityManager = await testUtils.getIdentityManager();

      mlog.log("Create 2 Identities ..");
      let results = await testUtils.createIdentityInBatch([
        {type: consts.IdentityType.COMPANY, owner: accounts[1]},
        {type: consts.IdentityType.INDIVIDUAL, owner: accounts[2]}
      ]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;

      await testUtils.authorize(idAddr1, idAddr2, accounts[1]);

      let dpProxy = await testUtils.createAndInit(DataProvider, ["Test Svc", idAddr1, "desc", identityManager.address, svcNodeReg.address], accounts[1]);
      let newDataProvider = await DataProvider.at(dpProxy.address);

      mlog.log("New DataProvider created :", newDataProvider.address);
      assert.equal(await newDataProvider.getSupportedTypesLength(), 0);

      mlog.log("Adding 3 supportedType");
      await addSupportTypes(newDataProvider, accounts);
      assert.equal(await newDataProvider.getSupportedTypesLength(), 3);

      mlog.log("Registering as svc node ..");
      await svcNodeReg.register(newDataProvider.address, 1, 2, { from: accounts[2] });

      mlog.log("Verifying result ..");
      assert.equal(await svcNodeReg.getSvcNodeCount(), 1);
      let svcNode = await svcNodeReg.getSvcNode(0);
      assert.equal(svcNode[0], newDataProvider.address);
      assert.equal(svcNode[1], 1);
      assert.equal(svcNode[2], 2);
    })

    it("should not be able to register it's is not authorized or owner", async function() {

      let proxy = await testUtils.createAndInit(SvcNodeRegistry, [], accounts[0]);
      let svcNodeReg = await SvcNodeRegistry.at(proxy.address);
      let identityManager = await testUtils.getIdentityManager();

      mlog.log("Create 1 Identities ..");
      let idAddr1 = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[1]);

      let dpProxy = await testUtils.createAndInit(DataProvider, ["Test Svc", idAddr1, "desc", identityManager.address, svcNodeReg.address], accounts[1]);
      let newDataProvider = await DataProvider.at(dpProxy.address);

      mlog.log("New DataProvider created :", newDataProvider.address);
      assert.equal(await newDataProvider.getSupportedTypesLength(), 0);
      mlog.log("Adding 3 supportedType");
      await addSupportTypes(newDataProvider, accounts);
      assert.equal(await newDataProvider.getSupportedTypesLength(), 3);

      mlog.log("Registering as svc node from other than owner or authorized id, so it should throw exception ..");
      await testUtils.assertThrows(svcNodeReg.register(newDataProvider.address, 1, 2, { from: accounts[2] }));

    });

    it("should not be able to register duplicated svc address", async function() {

      let proxy = await testUtils.createAndInit(SvcNodeRegistry, [], accounts[0]);
      let svcNodeReg = await SvcNodeRegistry.at(proxy.address);
      let identityManager = await testUtils.getIdentityManager();

      mlog.log("Create 1 Identities ..");
      let idAddr1 = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[1]);

      let dpProxy = await testUtils.createAndInit(DataProvider, ["Test Svc", idAddr1, "desc", identityManager.address, svcNodeReg.address], accounts[1]);
      let newDataProvider = await DataProvider.at(dpProxy.address);

      mlog.log("New DataProvider created :", newDataProvider.address);
      assert.equal(await newDataProvider.getSupportedTypesLength(), 0);
      mlog.log("Adding 3 supportedType");
      await addSupportTypes(newDataProvider, accounts);
      assert.equal(await newDataProvider.getSupportedTypesLength(), 3);

      mlog.log("Registering as svc node using id:", newDataProvider.address);
      await svcNodeReg.register(newDataProvider.address, 1, 2, { from: accounts[1] });

      mlog.log("Registering as svc node using the same id, then it should throw exception ..");
      await testUtils.assertThrows(svcNodeReg.register(newDataProvider.address, 1, 1, { from: accounts[1] }));

    });
  })

  describe("Unregistering svc", function() {
    it("should be able to unregister it's is owner", async function() {

      let proxy = await testUtils.createAndInit(SvcNodeRegistry, [], accounts[0]);
      let svcNodeReg = await SvcNodeRegistry.at(proxy.address);
      let identityManager = await testUtils.getIdentityManager();

      mlog.log("Create 1 Identities ..");
      let idAddr1 = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[1]);

      let dpProxy = await testUtils.createAndInit(DataProvider, ["Test Svc", idAddr1, "desc", identityManager.address, svcNodeReg.address], accounts[1]);
      let newDataProvider = await DataProvider.at(dpProxy.address);

      mlog.log("New DataProvider created :", newDataProvider.address);
      assert.equal(await newDataProvider.getSupportedTypesLength(), 0);
      mlog.log("Adding 3 supportedType");
      await addSupportTypes(newDataProvider, accounts);
      assert.equal(await newDataProvider.getSupportedTypesLength(), 3);

      mlog.log("Registering as svc node ..");
      await svcNodeReg.register(newDataProvider.address, 1, 2, { from: accounts[1] });

      mlog.log("Verifying result ..");
      assert.equal(await svcNodeReg.getSvcNodeCount(), 1);

      mlog.log("Unregistering as svc node ..");
      await svcNodeReg.unregister(newDataProvider.address, { from: accounts[1] });

      mlog.log("Verifying result ..");
      assert.equal(await svcNodeReg.getSvcNodeCount(), 0);

    })

    it("should be able to unregister it's is authorized from owner", async function() {

      let proxy = await testUtils.createAndInit(SvcNodeRegistry, [], accounts[0]);
      let svcNodeReg = await SvcNodeRegistry.at(proxy.address);
      let identityManager = await testUtils.getIdentityManager();

      let results = await testUtils.createIdentityInBatch([
        {type: consts.IdentityType.COMPANY, owner: accounts[1]},
        {type: consts.IdentityType.INDIVIDUAL, owner: accounts[2]}
      ]);
      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;

      await testUtils.authorize(idAddr1, idAddr2, accounts[1]);

      let dpProxy = await testUtils.createAndInit(DataProvider, ["Test Svc", idAddr1, "desc", identityManager.address, svcNodeReg.address], accounts[1]);
      let newDataProvider = await DataProvider.at(dpProxy.address);

      mlog.log("New DataProvider created :", newDataProvider.address);
      assert.equal(await newDataProvider.getSupportedTypesLength(), 0);
      mlog.log("Adding 3 supportedType");
      await addSupportTypes(newDataProvider, accounts);
      assert.equal(await newDataProvider.getSupportedTypesLength(), 3);

      mlog.log("Registering as svc node ..");
      await svcNodeReg.register(newDataProvider.address, 1, 2, { from: accounts[1] });

      mlog.log("Verifying result ..");
      assert.equal(await svcNodeReg.getSvcNodeCount(), 1);

      mlog.log("Unregistering svc node from authorized id..");
      await svcNodeReg.unregister(newDataProvider.address, { from: accounts[2] });

      mlog.log("Verifying result ..");
      assert.equal(await svcNodeReg.getSvcNodeCount(), 0);

    })


    it("should not be able to unregister it's is not authorized or owner", async function() {

      let proxy = await testUtils.createAndInit(SvcNodeRegistry, [], accounts[0]);
      let svcNodeReg = await SvcNodeRegistry.at(proxy.address);
      let identityManager = await testUtils.getIdentityManager();

      mlog.log("Create 1 Identities ..");
      let idAddr1 = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[1]);

      let dpProxy = await testUtils.createAndInit(DataProvider, ["Test Svc", idAddr1, "desc", identityManager.address, svcNodeReg.address], accounts[1]);
      let newDataProvider = await DataProvider.at(dpProxy.address);

      mlog.log("New DataProvider created :", newDataProvider.address);
      assert.equal(await newDataProvider.getSupportedTypesLength(), 0);
      mlog.log("Adding 3 supportedType");
      await addSupportTypes(newDataProvider, accounts);
      assert.equal(await newDataProvider.getSupportedTypesLength(), 3);

      mlog.log("Registering as svc node ..");
      await svcNodeReg.register(newDataProvider.address, 1, 1, { from: accounts[1] });

      mlog.log("Verifying result ..");
      assert.equal(await svcNodeReg.getSvcNodeCount(), 1);

      mlog.log("Unregistering as svc node from unauthorized account..");
      await testUtils.assertThrows(svcNodeReg.unregister(newDataProvider.address, { from: accounts[2] }));

    })

    it("should not be able to unregister if svc address doesn't exist", async function() {

      let proxy = await testUtils.createAndInit(SvcNodeRegistry, [], accounts[0]);
      let svcNodeReg = await SvcNodeRegistry.at(proxy.address);
      let identityManager = await testUtils.getIdentityManager();


      mlog.log("Unregistering svc node that hasn't been registered before");
      await testUtils.assertThrows(svcNodeReg.unregister("0xb89a389fadee55d6d7fcefacec3143c4060aa056", { from: accounts[1] }));

    })
  })

  describe("Request data provider", function() {
    it("should be able to get [ request data provider event ] after request ", async function() {

      let identityManager = await testUtils.getIdentityManager();
      let proxy = await testUtils.createAndInit(SvcNodeRegistry, [], accounts[0]);
      let svcNodeRegistry = await SvcNodeRegistry.at(proxy.address);

      mlog.log("Create 0 Identities ..");
      let newIdAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[1]);

      let dpProxy = await testUtils.createAndInit(DataProvider, ["Test Svc", newIdAddr, "desc", identityManager.address, svcNodeRegistry.address], accounts[1]);
      let newDataProvider = await DataProvider.at(dpProxy.address);

      mlog.log("New DataProvider created :", newDataProvider.address);
      assert.equal(await newDataProvider.getSupportedTypesLength(), 0);

      mlog.log("Adding 3 supportedType");
      await addSupportTypes(newDataProvider, accounts);
      assert.equal(await newDataProvider.getSupportedTypesLength(), 3);

      mlog.log("Create request Identities ..");
      let reqIdAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[0]);

      //mlog.log("Request svc node ..", reqIdAddr, newDataProvider.address);
      // await svcNodeRegistry.requestDataProvider(reqIdAddr, newDataProvider.address, "typeA", 'tag1', "1111", 1, '1', '11', { from: accounts[0] });
      // await svcNodeRegistry.requestDataProvider(reqIdAddr, newDataProvider.address, "typeA", 'tag1', "0e35ee48c9a5020feae65c0494babe31400c4ce4bd1e88fe8f54dbdbb30b30483012d4856818ffd0c2ce30d4ae1408133fae2282419277d6fec7bb826be31280e8e85957e3647b1196fa4f24aefe11a1c9260ba6cc56cbd994bd989c22773aa71a2505a7109f85bfc519f3805581927dac425d372b4d20efe2a8bcd74fad21ba", 28, "0x9d36062b6cf463f6ec800ae7c55331972267f7539b09164323cdf774cec2b9cb", "0x1e6d8fd0b616985e077866785fbcaa3fc410e9c16dee1a1e11025f8c7ef770e1", { from: accounts[0] });

    })
  });

  describe("Get Service By Types", function() {
    it("should be able to get service address list by service type ", async function() {

      let proxy = await testUtils.createAndInit(SvcNodeRegistry, [], accounts[0]);
      let svcNodeReg = await SvcNodeRegistry.at(proxy.address);
      let identityManager = await testUtils.getIdentityManager();

      let results = await testUtils.createIdentityInBatch([
        {type: consts.IdentityType.COMPANY, owner: accounts[1]},
        {type: consts.IdentityType.COMPANY, owner: accounts[2]},
        {type: consts.IdentityType.COMPANY, owner: accounts[3]},
        {type: consts.IdentityType.COMPANY, owner: accounts[4]}
      ]);

      let idAddr1 = results[0].idAddr;
      let idAddr2 = results[1].idAddr;
      let idAddr3 = results[2].idAddr;
      let idAddr4 = results[3].idAddr;

      let dpProxy1 = await testUtils.createAndInit(DataProvider, ["Test Svc1", idAddr1, "desc", identityManager.address, svcNodeReg.address], accounts[1]);
      let newDataProvider1 = await DataProvider.at(dpProxy1.address);

      let dpProxy2 = await testUtils.createAndInit(DataProvider, ["Test Svc2", idAddr2, "desc", identityManager.address, svcNodeReg.address], accounts[2]);
      let newDataProvider2 = await DataProvider.at(dpProxy2.address);

      let fsProxy = await testUtils.createAndInit(FinancialSvc, ["Test Svc2", idAddr3, "desc"], accounts[3]);
      let newFinancialSvc = await FinancialSvc.at(fsProxy.address);

      let asProxy = await testUtils.createAndInit(AttestationSvc, ["Test Attest Svc", idAddr4], accounts[4]);
      let newAttestSvc = await AttestationSvc.at(asProxy.address);

      mlog.log("Registering as svc nodes ..");
      await svcNodeReg.register(newDataProvider1.address, 1, 1, { from: accounts[1] });
      await svcNodeReg.register(newDataProvider2.address, 1, 2, { from: accounts[2] });
      mlog.log("newFinancialSvc owner", await newFinancialSvc.getOwner());
      await svcNodeReg.register(newFinancialSvc.address, 2, 1, { from: accounts[3] });

      mlog.log("newAttestSvc owner", await newAttestSvc.getOwner());
      await svcNodeReg.register(newAttestSvc.address, 3, 1, { from: accounts[4] });

      let result = await svcNodeReg.getSvcByType(1);
      assert.equal(result.length, 2);
      assert.equal(result[0], newDataProvider1.address);
      assert.equal(result[1], newDataProvider2.address);

      result = await svcNodeReg.getSvcByType(3);
      assert.equal(result.length, 1);
      assert.equal(result[0], newAttestSvc.address);
    })
  });
})