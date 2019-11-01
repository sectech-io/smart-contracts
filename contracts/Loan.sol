pragma solidity ^0.4.18;

import "./abstract/OwnedAndPrivate.sol";
import "./abstract/AccessControlled.sol";
import "./lib/CommonDef.sol";
import "./lib/LoanLib.sol";
import "./lib/AddressArrayUtils.sol";
import "./lib/DataRecordLib.sol";
import "./lib/SafeMath.sol";
import "./interfaces/ICreditLine.sol";


contract Loan is OwnedAndPrivate, AccessControlled {
    using SafeMath for int;

    event Transfer(address indexed from, address indexed to, int amount, uint validFrom);
    event DataChangedEvent(address actor, uint dataId);
    event OnContractSigned (address indexed signerId, uint idx, uint templateId);
    event ActionEvent(address actor, address delegate, LoanLib.LoanAction action, uint blockTime);

    LoanLib.LoanState public state = LoanLib.LoanState.PendingOnApproval;

    ICreditLine public creditLine;
    uint loanType;

    // Loan Details
    address public lender;
    address public borrower;
    CommonDef.PeriodType public periodType; // Day/Month/Year
    uint public periods; // number of periods
    uint public ratePerPeriod; // in 0.01%
    int public totalPrinciple; // in 0.01 currency
    int public totalInterest;
    int public outstandingPrinciple;
    string public productConfigIpfsHash;
    string public repaymentTypeId;

    address[] public participants;
    mapping(address => CommonDef.Role) public roles; // participants => roles
    address[] public approvalWorkflow;
    mapping(address => CommonDef.Approval) public approvals;

    LoanLib.SP internal sp;
    LoanLib.Payments internal pmts;
    DataRecordLib.DRArray internal data;
    string public encryptionKey; //des加密数据key

    mapping(address => int) public balances; // owner id => amount

    uint public disburseTime;
    uint public interestStartTime;
    uint public createdTime = now;

    constructor(
        address _creditLine,
        address[] _participants,
        CommonDef.Role[] _roles,
        address[] _approvalWorkflow,
        CommonDef.PeriodType _periodType,
        uint _periods,
        uint _ratePerPeriod,
        int _principle,
        string _productConfigIpfsHash,
        string _repaymentTypeId,
        string _encryptionKey
    )
    public
    {
        creditLine = ICreditLine(_creditLine);
        require(isIdOrAuthorized(creditLine.getBorrower()));
        LoanLib.validateInput(_participants, _roles, _approvalWorkflow);

        lender = creditLine.getLender();
        borrower = creditLine.getBorrower();
        participants = _participants;
        owner = borrower;

        //Initialize participants
        for (uint i = 0; i < _participants.length; i++) {
            address participant = _participants[i];
            roles[participant] = _roles[i];
        }

        //Initialize approval workflow
        for (i = 0; i < _approvalWorkflow.length; i++) {
            approvalWorkflow.push(_approvalWorkflow[i]);
        }
        approvalWorkflow.push(borrower);
        periodType = _periodType;
        periods = _periods;
        ratePerPeriod = _ratePerPeriod;
        totalPrinciple = _principle;
        productConfigIpfsHash = _productConfigIpfsHash;
        repaymentTypeId = _repaymentTypeId;

        encryptionKey = _encryptionKey;
    }

    function addPrivateFor(string _newPrivateFor) public onlyOwnerOrAuthorized {
        privateFor.push(_newPrivateFor);
    }


    function approve(address _approver, address _delegate, bool isApprove) external
    atState(LoanLib.LoanState.PendingOnApproval)
    onlyIdDelegateOrAuthorized(_approver, _delegate)
    onlyApprover(_approver)
    transitionNext(isApprove ? LoanLib.LoanAction.Approve : LoanLib.LoanAction.Reject)
    {
        if (borrower == _approver) {
            creditLine.tap(this, totalPrinciple);
        }
        require(!approvals[_approver].isResponsed);
        approvals[_approver] = CommonDef.Approval(isApprove, true, now);
        LoanLib.action(_approver, _delegate, isApprove ? LoanLib.LoanAction.Approve : LoanLib.LoanAction.Reject);

    }

    function getApprovalDetails() public view returns (address[] _approvalWorkflow, CommonDef.Role[] _roles, bool[] _isResponsed, bool[] _isApproved, uint[] _timestamp){
        CommonDef.Role[] memory vroles = new CommonDef.Role[](approvalWorkflow.length);
        bool[] memory vResponded = new bool[](approvalWorkflow.length);
        bool[] memory visApproved = new bool[](approvalWorkflow.length);
        uint[] memory vtimestamp = new uint[](approvalWorkflow.length);

        for (uint i = 0; i < approvalWorkflow.length; i++) {
            vroles[i] = roles[approvalWorkflow[i]];
            visApproved[i] = approvals[approvalWorkflow[i]].isApproved;
            vResponded[i] = approvals[approvalWorkflow[i]].isResponsed;
            vtimestamp[i] = approvals[approvalWorkflow[i]].timestamp;
        }
        return (approvalWorkflow, vroles, vResponded, visApproved, vtimestamp);
    }


    function cancel(address _actor, address _delegate) external
    atStates(LoanLib.LoanState.Approved, LoanLib.LoanState.PendingOnApproval)
    onlyIdDelegateOrAuthorized(_actor, _delegate)
    transitionNext(LoanLib.LoanAction.Cancel)
    {
        require(AddressArrayUtils.includeCheckSingle(approvalWorkflow, _actor) || _actor == borrower);
        LoanLib.action(_actor, _delegate, LoanLib.LoanAction.Cancel);
    }

    function recall(address _actor, address _delegate) external
    atState(LoanLib.LoanState.PendingOnApproval)
    onlyIdDelegateOrAuthorized(_actor, _delegate)
    {
        require(AddressArrayUtils.includeCheckSingle(approvalWorkflow, _actor) || _actor == borrower);
        require(approvals[_actor].isApproved && approvals[_actor].isResponsed);
        delete approvals[_actor];
        LoanLib.action(_actor, _delegate, LoanLib.LoanAction.Recall);
    }





    // Disburse only by lender
    function disburseRequest(address _delegate, uint[] _dueTime, int[] _duePrinciple, int[] _dueInterest, uint _disburseTime, uint _interestStartTime, address[] _debtor, int[] scheduledPaymentSequence) public
    atState(LoanLib.LoanState.Approved)
    onlyIdDelegateOrAuthorized(lender, _delegate)
    transitionNext(LoanLib.LoanAction.DisbursementRequest)
    {
        totalInterest = LoanLib.updatePaymentSchedule(sp, _dueTime, _duePrinciple, _dueInterest, totalPrinciple, _debtor, scheduledPaymentSequence);
        disburseTime = _disburseTime;
        interestStartTime = _interestStartTime;
        LoanLib.action(lender, _delegate, LoanLib.LoanAction.DisbursementRequest);
    }

    function updatePaymentSchedule(address _delegate, uint[] _dueTime, int[] _duePrinciple, int[] _dueInterest, address[] _debtor, int[] scheduledPaymentSequence) public
    atState(LoanLib.LoanState.PendingOnConfirmDisbursement)
    onlyIdDelegateOrAuthorized(lender, _delegate)
    {
        delete sp.sPayments;
        totalInterest = LoanLib.updatePaymentSchedule(sp, _dueTime, _duePrinciple, _dueInterest, totalPrinciple, _debtor, scheduledPaymentSequence);
    }

    function confirmDisburse(address _actor, address _delegate) public
    atState(LoanLib.LoanState.PendingOnConfirmDisbursement)
    onlyIdDelegateOrAuthorized(_actor, _delegate)
    onlyParticipants(_actor)
    transitionNext(LoanLib.LoanAction.DisbursementConfirm)
    {
        outstandingPrinciple = totalPrinciple;
        balances[lender] = totalPrinciple;
        LoanLib.action(_actor, _delegate, LoanLib.LoanAction.DisbursementConfirm);
    }

    function cancelDisburse(address _actor, address _delegate) public
    atState(LoanLib.LoanState.PendingOnConfirmDisbursement)
    onlyIdDelegateOrAuthorized(_actor, _delegate)
    onlyParticipants(_actor)
    transitionNext(LoanLib.LoanAction.DisbursementCancel)
    {
        delete sp.sPayments;
        disburseTime = 0;
        interestStartTime = 0;
        LoanLib.action(lender, _delegate, LoanLib.LoanAction.DisbursementCancel);
    }

    function shouldLockOnCredit() public view returns (bool)  {
        return state == LoanLib.LoanState.PendingOnApproval || state == LoanLib.LoanState.Approved || state == LoanLib.LoanState.PendingOnConfirmDisbursement;
    }

    function getParticipantCount() public view returns (uint) {
        return participants.length;
    }

    function getParticipants() public view returns (address[] _ids, CommonDef.Role[] _roles) {
        CommonDef.Role[] memory rolesArr = new CommonDef.Role[](participants.length);
        for (uint i = 0; i < participants.length; i++) {
            rolesArr[i] = roles[participants[i]];
        }
        return (participants, rolesArr);
    }

    function addData(address uploaderAddr, string ipfsHash) public {
        require(isAuthorizedUploadData(uploaderAddr));
        DataRecordLib.addData(data, uploaderAddr, ipfsHash);
        emit DataChangedEvent(uploaderAddr, data.records.length - 1);
    }

    function getDataLength() public view returns (uint) {
        return data.records.length;
    }

    function getDataRecord(uint _idx) public view returns (string _ipfsHash, address _uploader, uint _uploadTime, bool _isDeleted) {
        DataRecordLib.DataRecord storage record = data.records[_idx];
        return (record.ipfsHash, record.uploaderAddr, record.uploadTime, record.isDeleted);
    }


    function removeDataByIdx(address _actor, uint _idx) public {
        require(isAuthorizedRemoveData(_actor));
        DataRecordLib.removeDataByIdx(data, _actor, _idx);
        emit DataChangedEvent(_actor, _idx);
    }

    function getTargetStateOnPending(LoanLib.LoanAction _action) internal view returns (LoanLib.LoanState) {
        if (_action == LoanLib.LoanAction.Approve || _action == LoanLib.LoanAction.Reject) {
            for (uint i = 0; i < approvalWorkflow.length; i++) {
                CommonDef.Approval storage approval = approvals[approvalWorkflow[i]];
                if (approval.isResponsed && !approval.isApproved) {
                    return LoanLib.LoanState.Rejected;
                }
                if (!approval.isResponsed) {
                    return LoanLib.LoanState.PendingOnApproval;
                }
            }
            return LoanLib.LoanState.Approved;
        }
        if (_action == LoanLib.LoanAction.Cancel) {
            return LoanLib.LoanState.Cancelled;
        }
        revert("Should only allow Cancel/Approve/Reject action in current state");
    }

    function getTargetStateOnApproved(LoanLib.LoanAction _action) internal pure returns (LoanLib.LoanState) {
        if (_action == LoanLib.LoanAction.Cancel) {
            return LoanLib.LoanState.Cancelled;
        }
        if (_action == LoanLib.LoanAction.DisbursementRequest) {
            return LoanLib.LoanState.PendingOnConfirmDisbursement;
        }
        revert("Should only allow Cancel/DisbursementRequest action in current state");
    }

    function getTargetStateOnPendingDisburseConfirm(LoanLib.LoanAction _action) internal pure returns (LoanLib.LoanState) {
        if (_action == LoanLib.LoanAction.DisbursementConfirm) {
            return LoanLib.LoanState.Repaying;
        }
        if (_action == LoanLib.LoanAction.DisbursementCancel) {
            return LoanLib.LoanState.Approved;
        }
        revert("Should only allow DisbursementConfirm action in current state");
    }

    function getTargetStateOnRepaying(LoanLib.LoanAction _action) internal view returns (LoanLib.LoanState) {
        if (_action == LoanLib.LoanAction.RepaymentConfirm) {
            return LoanLib.isCompleted(sp) ? LoanLib.LoanState.Completed : LoanLib.LoanState.Repaying;
        }
        revert("Should only allow DisbursementConfirm action in current state");
    }

    function transitIfDiffer(LoanLib.LoanState _target) internal {
        if (state != _target) {
            state = _target;
        }
    }

    // This modifier goes to the next state
    // after the function is done.
    modifier transitionNext(LoanLib.LoanAction _action)
    {
        _;
        if (state == LoanLib.LoanState.PendingOnApproval) {
            transitIfDiffer(getTargetStateOnPending(_action));
            return;
        }
        if (state == LoanLib.LoanState.Approved) {
            transitIfDiffer(getTargetStateOnApproved(_action));
            return;
        }
        if (state == LoanLib.LoanState.PendingOnConfirmDisbursement) {
            transitIfDiffer(getTargetStateOnPendingDisburseConfirm(_action));
            return;
        }
        if (state == LoanLib.LoanState.Repaying) {
            state = getTargetStateOnRepaying(_action);
            return;
        }

        //if (state == LoanLib.LoanState.Rejected || state == LoanLib.LoanState.Cancelled || state == LoanLib.LoanState.Completed) { revert ("End State");}
    }

    modifier onlyApprover(address _actor)
    {
        AddressArrayUtils.includeCheckSingle(approvalWorkflow, _actor);
        _;
    }

    modifier onlyParticipants(address _actor)
    {
        AddressArrayUtils.includeCheckSingle(participants, _actor);
        _;
    }

    modifier atState(LoanLib.LoanState _state) {
        require(state == _state, "Current state is not in one of permitted state");
        _;
    }

    modifier atStates(LoanLib.LoanState _state1, LoanLib.LoanState _state2) {
        require(state == _state1 || state == _state2, "Current state is not in one of permitted state");
        _;
    }

    function isAuthorizedUploadData(address _id) public view returns (bool) {
        if (!isIdOrAuthorized(_id)) {
            return false;
        }
        for (uint i = 0; i < participants.length; i++) {
            if (isIdOrAuthorized(participants[i])) {
                return true;
            }
        }
        return false;
    }

    function isAuthorizedRemoveData(address _id) public view returns (bool) {
        return isIdOrAuthorized(borrower) || isAuthorizedUploadData(_id);
    }

    function getScheduledPaymentCount() view public returns (uint) {
        return sp.sPayments.length;
    }

    function getPaymentCount() view public returns (uint) {
        return pmts.payments.length;
    }

    function repayRequest(uint _idx, address _delegate, uint _paidTime, int _paidPrinciple, int _paidInterest, bool _markScheduledPaymentCompleted, address debtor) public
    onlyIdDelegateOrAuthorized(debtor, _delegate)
    {
        LoanLib.repayRequest(sp, pmts, _idx, _delegate, _paidTime, _paidPrinciple, _paidInterest, _markScheduledPaymentCompleted, debtor);
    }

    function repayConfirm(uint _idx, address _delegate) public
    onlyIdDelegateOrAuthorized(lender, _delegate)
    transitionNext(LoanLib.LoanAction.RepaymentConfirm)
    {
        LoanLib.repayConfirm(sp, pmts, _idx, _delegate, lender);
        outstandingPrinciple = SafeMath.sub(outstandingPrinciple, pmts.payments[_idx].paidPrinciple);
    }

    function repayReject(uint _idx, address _actor, address _delegate) public
    onlyIdDelegateOrAuthorized(_actor, _delegate)
    {
        LoanLib.repayReject(pmts, _idx, _actor, _delegate);
    }

    function getScheduledPayment(uint _idx) public view returns (uint _dueTime, int duePrinciple, int dueInterest, bool _isCompleted, address debtor, int scheduledPaymentSequence) {
        LoanLib.ScheduledPayment storage pmt = sp.sPayments[_idx];
        return (pmt.dueTime, pmt.duePrinciple, pmt.dueInterest, pmt.isCompleted, pmt.debtor, pmt.scheduledPaymentSequence);
    }

    function getPayment(uint _idx) public view
    returns (uint _spIdx, int _paidPrinciple, int _paidInterest, uint _paidTime, uint _confirmBlockTime, bool _markScheduledPaymentCompleted, LoanLib.RepayState _state)
    {
        LoanLib.Payment storage pmt = pmts.payments[_idx];
        return (pmt.spIdx, pmt.paidPrinciple, pmt.paidInterest, pmt.paidTime, pmt.confirmBlockTime, pmt.markScheduledPaymentCompleted, pmt.state);
    }

    function isCompleted() public view returns (bool) {
        return LoanLib.isCompleted(sp);
    }

    function transfer(address _from, address _to, int _amount, uint _validFrom) public onlyIdOrAuthorized(_from) {
        require(balances[_from] >= _amount);
        require(state == LoanLib.LoanState.Repaying);
        balances[_from] = balances[_from].sub(_amount);
        balances[_to] = balances[_to].add(_amount);
        emit Transfer(_from, _to, _amount, _validFrom);
    }

    function eContractSigned(address signerId, string ipfsHash, uint templateId) public {
        require(isAuthorizedUploadData(signerId));
        addData(signerId, ipfsHash);
        emit OnContractSigned(signerId, data.records.length - 1, templateId);
    }
}
