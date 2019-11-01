'use strict';

import mlog from 'mocha-logger';

contract("Create Account", function (accounts) {
  it("create accounts to prepare for further test", async function () {
    this.timeout(120000);
    for (let item of accounts) {
        mlog.log(`unlock account ${item}`);
        web3.personal.unlockAccount(item, '', 0);
    }
    mlog.log(`Creating default ${process.env.NUM_OF_ACCOUNT} accounts`);
    for (let i = 0; i < process.env.NUM_OF_ACCOUNT; i++) {
      let account = web3.personal.newAccount("");
      mlog.log(account);
      web3.personal.unlockAccount(account, '', 0); // unlocked for 24 hours
    }
  });
});
