var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider(`http://${process.argv[2]}`));
web3.eth.getAccounts().then(function(accounts){
  if(accounts.length){
    web3.eth.personal.unlockAccount(accounts[0], '', 0);
  }
});

