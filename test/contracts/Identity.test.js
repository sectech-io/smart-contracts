'use strict';

import testUtils from '../support/truffle.test.utils';
import ethJSUtil from 'ethereumjs-util';
import consts from '../support/consts';
import mlog from 'mocha-logger';

var Identity = artifacts.require("./Identity.sol");

contract('IdentityTest', function(accounts) {

  before(async () => {
      await testUtils.initTestEnv(accounts[9]);
    }
  );

  describe("Create and getter test", function() {
    it("should be able to call getters of Identity", async function() {
      mlog.pending("Starting test... ");
      mlog.pending("waiting to return Identity contract address ... ");
      let idAddr = await testUtils.createIdentityWithIdName(1, accounts[0], accounts[0], "namehash", "idhash");

      // check if data hash has been set to Identity
      let identity = Identity.at(idAddr);
      assert.equal(await identity.idType(), 1);
      assert.equal(await identity.idHash(), '0x' + ethJSUtil.sha3('idhash').toString('hex'));
      let queryResult = await identity.getAllAttrs();
      mlog.log("getAllAttrs returned:", JSON.stringify(queryResult));
      assert.equal(queryResult[0], 1);
      assert.equal(queryResult[1], 0);
      assert.equal(queryResult[2], 1);
      assert.equal(queryResult[3], 0);
    })
  });

  describe("Manage Identity Data", function() {
    it("should throw error if not owner to call addIdentityData", async function() {
      mlog.log("Creating Identity with account[0]... ");
      let idAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[0]);
      mlog.log("adding IdentityData ... ");
      await testUtils.assertThrows(Identity.at(idAddr).addDataRecord( idAddr, "0xdatahash...", {
        from: accounts[1]
      }));
    })

    it("should be able to call addIdentityData if it's owner", async function() {
      mlog.log("Creating Identity with account[0]... ");
      let idAddr = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[0]);
      mlog.log("adding IdentityData ... ");
      let identity = Identity.at(idAddr);
      await testUtils.assertThrows(Identity.at(idAddr).addDataRecord(idAddr, "0xdatahash...", {
        from: accounts[1]
      }));

      mlog.pending("adding IdentityData ... ");
      let tx = await identity.addDataRecord(idAddr, "0xdatahash...", {from: accounts[0] });
      assert.equal(tx.logs[0].event, "LogDataChanged");
      assert.equal(tx.logs[0].args.dataId, 0);

      // check if data hash has been set to Identity
      let dataHashesLength = await identity.getDataRecordCount();
      assert.equal(dataHashesLength, 1);
      assert.equal((await identity.getDataRecord(0))[0], "0xdatahash...");
    })

    it("should be able to upload data by delegate", async() => {
      let idAddr1 = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[1]);
      let idAddr2 = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[2]);
      await testUtils.authorize(idAddr1, idAddr2, accounts[1]);

      let identity = Identity.at(idAddr1);
      mlog.pending("adding IdentityData by delegate ... ");
      await identity.addDataRecord(idAddr1, "0xdatahash...", {from: accounts[2] });
      assert.equal(await identity.getDataRecordCount(), 1);
    });

    it("should be able to set data deleted by owner", async() => {
      let idAddr1 = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[1]);
      let identity = Identity.at(idAddr1);
      await identity.addDataRecord(idAddr1, "0xdatahash...", { from: accounts[1] });
      assert.equal(await identity.getDataRecordCount(), 1);
      let record = await identity.getDataRecord(0);
      assert.equal(record[3], false); //_isDeleted

      mlog.pending("set data record delete ... ");
      await identity.setDataRecordDeleted(0, true, { from: accounts[1] });
      assert.equal(await identity.getDataRecordCount(), 1);
      record = await identity.getDataRecord(0);
      assert.equal(record[3], true);
    });

    it("should be able to set data deleted by delegate", async() => {

      let idAddr1 = await testUtils.createIdentity(consts.IdentityType.COMPANY, accounts[1]);
      let idAddr2 = await testUtils.createIdentity(consts.IdentityType.INDIVIDUAL, accounts[2]);
      await testUtils.authorize(idAddr1, idAddr2, accounts[1]);

      let identity = Identity.at(idAddr1);
      await identity.addDataRecord(idAddr1, "0xdatahash...", { from: accounts[1] });

      assert.equal(await identity.getDataRecordCount(), 1);
      let record = await identity.getDataRecord(0);
      assert.equal(record[3], false);

      mlog.pending("set data record delete ... ");
      await identity.setDataRecordDeleted(0, true, { from: accounts[2] });

      assert.equal(await identity.getDataRecordCount(), 1);
      record = await identity.getDataRecord(0);
      assert.equal(record[3], true);
    });
  })
})