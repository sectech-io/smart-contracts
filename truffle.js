require('babel-register');
require('babel-polyfill');

console.log("SECHAIN_ENV=" + process.env.SECHAIN_ENV);
var gas = 10000000;

let config = module.exports = {
  networks: {
    testrpc: {
      host: "127.0.0.1",
      port: 8545,
      network_id: '*',
      gas: gas,
      gasPrice: 0
    }
  },
  mocha: {
    reporter: process.env.SECHAIN_ENV == "CI" ? "spec" : "spec",
    reporterOptions: {
      code: true,
      reportTitle: 'Smart Contract Test Report',
    }
  }
};

console.log("Truffle test config: " + JSON.stringify(config, null, 2));
