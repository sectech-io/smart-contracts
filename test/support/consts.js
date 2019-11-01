
const globalContractAddrs = require("../../global-contracts-addr.json");

module.exports.IdentityType = {};
module.exports.IdentityType.INDIVIDUAL = 0;
module.exports.IdentityType.COMPANY = 1;

module.exports.Global_Contract = {};
module.exports.Global_Contract.EVENT_BUS = 'EventBus';
module.exports.Global_Contract.AGREEMENT = 'Agreement';

module.exports.Global_Contract.SVC_NODE_REGISTRY = 'SvcNodeRegistry';
module.exports.Global_Contract.DATA_PROVIDER_SVC = 'DataProviderSvc';
module.exports.Global_Contract.FINANCIAL_SVC = 'FinancialSvc';
module.exports.Global_Contract.ATTESTATION_SVC = 'AttestationSvc';
module.exports.Global_Contract.CREDIT_LINE = 'CreditLine';
module.exports.Global_Contract.LOAN = 'Loan';
module.exports.Global_Contract.IDENTITY_MANAGER = 'IdentityManager';
module.exports.Global_Contract.IDENTITY = 'Identity';
module.exports.Global_Contract.CREDIT_REGISTRY = 'CreditRegistry';

module.exports.CreditLine = { Status: {} };
module.exports.CreditLine.Status.PENDING = 0;
module.exports.CreditLine.Status.APPROVED = 1;
module.exports.CreditLine.Status.REJECTED = 2;

module.exports.Global_Address = {};
module.exports.Global_Address.IDENTITY_MANAGER = globalContractAddrs.IdentityManager;
module.exports.Global_Address.EVENT_BUS = globalContractAddrs.EventBus;
module.exports.Global_Address.SVC_NODE_REGISTRY = globalContractAddrs.SvcNodeRegistry;
module.exports.Global_Address.CREDIT_REGISTRY = globalContractAddrs.CreditRegistry;

module.exports.Agreement = { Status: {}, Role: {} };
module.exports.Agreement.Status.PENDING = 0;
module.exports.Agreement.Status.ACCEPTED = 1;
module.exports.Agreement.Status.REJECTED = 2;
module.exports.Agreement.Status.EXITED = 3;

module.exports.Role = {};
module.exports.Role.NO_ROLE = 0;
module.exports.Role.BORROWER = 1;
module.exports.Role.LENDER = 2;
module.exports.Role.GUARANTEE = 3;
module.exports.Role.CHANNEL = 4;
module.exports.Role.ASSETBUYER = 5;
module.exports.Role.WITNESS = 6;

module.exports.Loan = { Status: {}, Payment: { Status: {} } };
module.exports.Loan.Status.PENDING = 0;
module.exports.Loan.Status.APPROVED = 1;
module.exports.Loan.Status.REJECTED = 2;
module.exports.Loan.Status.CANCELLED = 3;
module.exports.Loan.Status.PENDING_ON_CONFIRM_DISBURSEMENT = 4;
module.exports.Loan.Status.REPAYING = 5;
module.exports.Loan.Status.COMPLETED = 6;

module.exports.Loan.Payment.Status.DUE = 0;
module.exports.Loan.Payment.Status.PAYMENT_REQUESTED = 1;
module.exports.Loan.Payment.Status.PAYMENT_CONFIRMED = 2;
module.exports.Loan.Payment.Status.PAYMENT_REJECTED = 3;

module.exports.ServiceType = {};
module.exports.ServiceType.INDUSTRIAL_PLATFORM = 1;
module.exports.ServiceType.FINANCIAL = 2;
module.exports.ServiceType.DATA_PROVIDER = 3;
module.exports.ServiceType.DATA_ANALYTICS = 4;
module.exports.ServiceType.CREDIT_AGENCY = 5;
module.exports.ServiceType.ATTESTATION = 6;
module.exports.ServiceType.SECURITISATION_SVC = 7;
module.exports.ServiceType.GOVERMENTAL = 8;
module.exports.ServiceType.DEBT_RECOVERY = 9;
module.exports.ServiceType.SUBTYPE_DEFAULT = 0;

module.exports.MaxAttestLevel = {}
module.exports.MaxAttestLevel.Individual = 4;
module.exports.MaxAttestLevel.Company = 3;

module.exports.ZERO_ADDRESS = 0;


module.exports.MsgType={}
module.exports.MsgType.COOP_CHAIN_INVITE = "COOP_CHAIN_INVITE";//合作链发送邀请
module.exports.MsgType.COOP_CHAIN_REPLY = "COOP_CHAIN_REPLY";//合作链邀请回复
module.exports.MsgType.COOP_CHAIN_REJECT = "COOP_CHAIN_REJECT";//合作链邀请拒绝
module.exports.MsgType.COOP_CHAIN_APPROVAL = "COOP_CHAIN_APPROVAL";//合作链邀请同意
module.exports.MsgType.COOP_CHAIN_PRODUCT_UPDATED = "COOP_CHAIN_PRODUCT_UPDATED";//合作链产品更新
module.exports.MsgType.CREDIT_SUBMIT = "CREDIT_SUBMIT";//授信提交
module.exports.MsgType.CREDIT_APPROVE = "CREDIT_APPROVE";//授信审核
module.exports.MsgType.CREDIT_AMOUNT_EDIT = "CREDIT_AMOUNT_EDIT";//授信额度修改
module.exports.MsgType.CREDIT_DATA_UPDATED = "CREDIT_DATA_UPDATED";//授信数据更新
module.exports.MsgType.CREDIT_DATA_ASSOCIATE = "CREDIT_DATA_ASSOCIATE";//授信关联更新
module.exports.MsgType.LOAN_SUBMIT = "LOAN_SUBMIT";//贷款提交
module.exports.MsgType.LOAN_APPROVE = "LOAN_APPROVE";//贷款审核
module.exports.MsgType.LOAN_CANCEL = "LOAN_CANCEL";//贷款取消
module.exports.MsgType.LOAN_DATA_UPDATED = "LOAN_DATA_UPDATED";//贷款数据更新
module.exports.MsgType.LOAN_SIGN_CONTRACT = "LOAN_SIGN_CONTRACT";//贷款合约签署
module.exports.MsgType.LOAN_DISBURSE_APPLY = "LOAN_DISBURSE_APPLY";//放款申请
module.exports.MsgType.LOAN_DISBURSE_CONFIRM = "LOAN_DISBURSE_CONFIRM";//放款确认
module.exports.MsgType.LOAN_REAPY_APPLY = "LOAN_REAPY_APPLY";//还款申请
module.exports.MsgType.LOAN_TRANSFER = "LOAN_TRANSFER";//还款申请
module.exports.MsgType.LOAN_REAPY_CONFIRM = "LOAN_REAPY_CONFIRM";//还款确认
module.exports.MsgType.DATA_PROVIDE_RESULT = "DATA_PROVIDE_RESULT";//数据请求回调
module.exports.MsgType.SERVICE_DATA_MSG = "SERVICE_DATA_MSG";//

