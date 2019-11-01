# <img src="http://sectech-static.oss-cn-hangzhou.aliyuncs.com/web/img/logo-rgb_logo.png" width="220"/>
[![](https://img.shields.io/github/license/sectech-io/smart-contracts.svg)](../LICENSE)

[秒钛坊] 是秒钛科技旗下是专为中小型参与者设计的分布式供应链金融交易网络。以区块链为基础搭建可信的交易环境，在连接并赋能产业平台和金融服务机构的同时，让金融服务更高效地服务产业，让产业平台更好地融入优质体验的金融服务以服务其中小企业客户。

秒钛坊智能合约是支持供应链金融信贷周期全流程溯源的区块链智能合约。通过将各个人及企业主体、授信、贷款、数据等信息数字资产化，并将各主体协作流程通过标准化的智能合约记录在链上。由这些智能合约作为基础所构建的供应链金融联盟链可支持跨行业的供应链金融业务需求，并构成一个标准化、开放协同的资产交易网络，为多方提供一个交易机会发现、改善风控效果、提升资产运营效率、以及赋能政府部门监管的供应链金融资产交易平台。

此项目中的智能合约是构建秒钛坊分布式供应链金融交易网络的基础，基于以太坊 Solidity 语言开发，运行于 Quorum 联盟链。

关键特性如下：
* __主体 KYC 认证与操作授权控制__ - 各个人及企业主体由 [Identity] 智能合约在链上代表其唯一身份。每个主体必须通过与链上的认证服务商完成指定的数据交互以完成认证，认证的等级和认证时间由认证服务商通过私钥签名完成记录于 [Identity] 智能合约。[Owned] 及其继承合约可控制特定操作只在允许由特定的角色执行。
* __开放的服务注册机制__ - 各主体可在网络中登记为服务提供商，并在全局唯一的 [SvcNodeRegistry] 智能合约中登记并声明其服务类型，以供网络中服务发现用。服务提供商类型有如：产业平台、金融服务、资产评估及担保、第三方行业数据服务、认证服务等。
* __合作链__ - 在网络中，多个机构间可以自由组成合作链 [Agreement]，以表示多个主体间达成的业务合作关系，并在合作链中定义相互共识的金融产品细节、工作流以及数据流。
* __授信贷款Token化__ - 企业授信智能合约 [CreditLine] 及贷款智能合约 [Loan] 记录企业获得授信及贷款全生命周期，包括多个机构间的审批流转记录、各主体为支持该授信和贷款所提交的所有的数据记录、以及放款还款等行为。 
* __隐私__ - 配合 Quorum 的隐私合约机制，合作链关联的合作细节、企业获得授信、贷款以及相关数据只会在合作链所定义的节点中可见。
* __可满足监管要求__ - 配合监管需求，数据可以同步到监管节点。 
* __合约可升级__ - 各智能合约在 [AdminableUpgradeable] 的支持下，可多方共识下升级，以支持业务灵活性。

## 落地行业
秒钛坊联盟链节点结合新一代供应链金融协同系统已部署于汽配、物流、保险、医疗设备等快速发展的产业互联网场景及金融机构，应用于产业中上下游小微企业应收账款融资、订单融资。

## 如何运行

代码集中含有超过100+测试涵盖了全部重要供应链金融业务场景，执行以下步骤可在 [Truffle Suite] 智能合约开发套件中运行对智能合约集的各功能测试：

操作系统：支持 MacOS, Linux

1. 安装 [Ganache](https://www.trufflesuite.com/ganache) 
2. 安装 [NodeJS](https://nodejs.org/en/) 
3. 安装 [Truffle]   
`$ npm install truffle -g`   
4. 进入项目根目录，安装 NodeJS 依赖包:   
`$ cd smart-contracts`  
`$ npm --registry https://registry.npm.taobao.org install express`  
`$ npm install`
5. 启动 Ganache，在本地启动测试用的以太坊私链，在"设置"中的"CHAIN 菜单" 修改 Gas Limits 为 500000000
6. 运行测试:   
`$ truffle test --network testrpc ./test/mocha.root.level.hooks.js ./test/contracts/*.test.js`

## 加入我们的社区
秒钛坊会持续推动区块链在产业中应用提供支持与帮助，欢迎各行业的产品技术团队加入社区，一起研究和推进区块链应用。

<img src="https://www.sectechio.com/static/image/fansadd.png" width="200" height="200"/>

## 开源协议 License
秒钛坊智能合约的开源协议为[AGPL 3.0](https://www.gnu.org/licenses/agpl-3.0.en.html)。详情参见[LICENSE](../LICENSE)。 

[Identity]: https://github.com/sectech-io/smart-contracts/blob/master/contracts/Identity.sol
[SvcNodeRegistry]: https://github.com/sectech-io/smart-contracts/blob/master/contracts/SvcNodeRegistry.sol
[Agreement]: https://github.com/sectech-io/smart-contracts/blob/master/contracts/Agreement.sol
[CreditLine]: https://github.com/sectech-io/smart-contracts/blob/master/contracts/CreditLine.sol
[AdminableUpgradeable]: https://github.com/sectech-io/smart-contracts/blob/master/contracts/abstract/AdminableUpgradeable.sol
[Loan]: https://github.com/sectech-io/smart-contracts/blob/master/contracts/Loan.sol
[Owned]: https://github.com/sectech-io/smart-contracts/blob/master/contracts/abstract/Owned.sol
[秒钛坊]: https://www.sectechio.com
[Quorum]: https://github.com/jpmorganchase/quorum
[Truffle Suite]: https://www.trufflesuite.com
[Truffle]: https://www.trufflesuite.com/truffle
[license]: https://github.com/sectech-io/smart-contracts/blob/master/LICENSE