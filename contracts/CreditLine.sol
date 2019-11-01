pragma solidity ^0.4.18;


import "./abstract/OwnedAndPrivate.sol";
import "./lib/AddressArrayUtils.sol";
import "./lib/MathUtils.sol";
import "./lib/CommonDef.sol";
import "./interfaces/ICreditLine.sol";
import "./Agreement.sol";
import "./IdentityManager.sol";
import "./Loan.sol";
import "./abstract/AdminableUpgradeable.sol";

contract CreditLine is AdminableUpgradeable, OwnedAndPrivate, AccessControlled, ICreditLine {

    event LoanCreatedEvent(address addr);
    event ActionEvent(address approver, uint actionId);
    event DataChangedEvent(address actor, uint dataId);

    struct CreditLineHistory {
        address approver;
        address delegate;
        int amount;
        uint validFrom;
        bool isOpened;
        string remark;
    }

    enum ParticipantStatus {
        Active,
        InActive
    }

    enum Status {
        Pending,
        Approved,
        Rejected
    }

    struct CreditLineDetail {
        int amount;
        bool isOpened;
        bool responded;
        uint timestamp;//时间戳
    }

    Agreement public agreement;
    string public productId;

    address public lender;
    address public borrower;
    address[] public participants;
    mapping(address => CommonDef.Role) public roles; // participants => roles
    mapping(address => ParticipantStatus) public participantStatus;
    address[] public approvalWorkflow;
    mapping(address => CreditLineDetail) public details;
    CreditLineHistory[] public history; //额度变更历史
    CommonDef.DataRecord[] public data; //数据源数组
    address[] public loans; //贷款记录

    string public encryptionKey; //des加密数据key
    uint public createdTime;

    function getApprovalDetails() public view returns (address[] _approvalWorkflow, CommonDef.Role[] _roles, bool[] _responded, bool[] _isOpened, int[] _amount,  uint[] _timestamp){
        CommonDef.Role[] memory vroles = new CommonDef.Role[](approvalWorkflow.length);
        bool[] memory vresponded = new bool[](approvalWorkflow.length);
        bool[] memory visOpened = new bool[](approvalWorkflow.length);
        int[] memory vamount = new int[](approvalWorkflow.length);
        uint[] memory vtimestamp = new uint[](approvalWorkflow.length);

        for (uint i = 0; i < approvalWorkflow.length; i++) {
            vroles[i] = roles[approvalWorkflow[i]];
            visOpened[i] = details[approvalWorkflow[i]].isOpened;
            vamount[i] = details[approvalWorkflow[i]].amount;
            vresponded[i] = details[approvalWorkflow[i]].responded;
            vtimestamp[i] = details[approvalWorkflow[i]].timestamp;
        }
        return (approvalWorkflow, vroles, vresponded, visOpened, vamount, vtimestamp);
    }

    constructor() public {}

    function initialize() public initializeOnceOnly {
        revert(); // Overload this inherited function to prevent accidental execution which would then block initialize(string _name, address _owner, string _desc) from executing
    }

    function initialize(address _agreement, address _borrower, address _borrowerDelegate, string _productId, string _encryptionKey) public {
        require(isIdOrAuthorized(_borrower));
        if (_borrowerDelegate != address(0)) {
            require(isIdOrAuthorized(_borrowerDelegate));
        }
        agreement = Agreement(_agreement);
        productId = _productId;
        encryptionKey = _encryptionKey;
        owner = _borrower;
        borrower = _borrower;

        //Initialize participants
        for (uint i = 0; i < agreement.getParticipantsCount(); i++) {
            address participant = agreement.participants(i);
            participants.push(participant);
            roles[participant] = agreement.roles(participant);
            if (agreement.roles(participant) == CommonDef.Role.Lender) {
                lender = participant;
            }
        }

        require(AddressArrayUtils.includeCheckSingle(participants, _borrower) == false);
        participants.push(_borrower);
        roles[_borrower] = CommonDef.Role.Borrower;

        //Initialize approval workflow
        approvalWorkflow.push(_borrower);
        for (i = 0; i < agreement.getApproverCount(); i++) {
            approvalWorkflow.push(agreement.approvalWorkflow(i));
        }
        createdTime = now;
    }

    function submit(address _borrower, address _delegate, int _appliedAmount) external {
        require(roles[_borrower] == CommonDef.Role.Borrower);
        require(isIdOrAuthorized(owner));
        if (_delegate != address(0)) {
            require(isIdOrAuthorized(_delegate));
        }
        action(owner, _delegate, true, _appliedAmount, "Applied Credit Line");
    }

    function getAllAttributes() public view returns (address _owner, address _agreement, string _productId, string _encryptionKey, uint _createdTime, uint _participantsCount,
        uint _approvalWorkflowCount, uint _loansCount, uint _dataCount, uint _historyCount){
        return (owner, agreement, productId, encryptionKey, createdTime, participants.length, approvalWorkflow.length, loans.length, data.length, history.length);
    }

    function getBorrower() external returns (address){
        return borrower;
    }

    function getLender() external returns (address){
        return lender;
    }

    function getParticipantInfo(uint idx) public view returns (address _participant, CommonDef.Role _role, ParticipantStatus _status){
        address participantAddr = participants[idx];
        return (participantAddr, roles[participantAddr], participantStatus[participantAddr]);
    }

    function getEncryptionKey() public view returns (string) {
        return encryptionKey;
    }

    function getParticipantCount() public view returns (uint) {
        return participants.length;
    }

    function getApproverCount() public view returns (uint) {
        return approvalWorkflow.length;
    }

    function addData(address uploaderAddr, string ipfsHash) public {
        require(isAuthorizedUploadData(uploaderAddr));
        data.push(CommonDef.DataRecord(now, uploaderAddr, ipfsHash, false));
        emit DataChangedEvent(uploaderAddr, data.length - 1);
    }

    function getDataLength() public view returns (uint) {
        return data.length;
    }


    function setDataRecordDeleted(uint _idx, bool _isDeleted) public {
        require(isAuthorizedRemoveData(data[_idx].uploaderAddr));
        data[_idx].isDeleted = _isDeleted;
        emit DataChangedEvent(data[_idx].uploaderAddr, _idx);
    }


    function action(address _approver, address _delegate, bool _isOpened, int _amount, string _remark) public onlyIdOrAuthorized(_approver) {
        require(AddressArrayUtils.includeCheckSingle(approvalWorkflow, _approver));
        // approver should be in the approver list
        history.push(CreditLineHistory(_approver, _delegate, _amount, now, _isOpened, _remark));
        details[_approver] = CreditLineDetail(_amount, _isOpened, true, now);
        emit ActionEvent(_approver, history.length - 1);
    }

    function getHistoryLength() public view returns (uint) {
        return history.length;
    }

    function addParticipant(address idAddr, CommonDef.Role role) public onlyIdOrAuthorized(idAddr) {
        require(AddressArrayUtils.includeCheckSingle(participants, idAddr) == false);
        participants.push(idAddr);
        roles[idAddr] = role;
    }

    function setParticipantInactive(address idAddr) public onlyIdOrAuthorized(idAddr) {
        participantStatus[idAddr] = ParticipantStatus.InActive;
    }

    function getParticipantsByRole(CommonDef.Role role) public view returns (address[]){
        address[] memory rtnValue = new address[](participants.length);
        uint y = 0;
        for (uint i = 0; i < participants.length; i++) {
            if (roles[participants[i]] == role) {
                rtnValue[y++] = participants[i];
            }
        }
        return rtnValue;
    }

    function getSingleParticipantByRole(CommonDef.Role role) public view returns (address) {
        for (uint i = 0; i < participants.length; i++) {
            if (roles[participants[i]] == role) {
                return participants[i];
            }
        }
        assert(false);
    }

    function getOverallStatus() public view returns (Status _status) {
        if (approvalWorkflow.length == 0) {
            return Status.Rejected;
        }

        bool hasPending = false;
        for (uint i = 0; i < approvalWorkflow.length; i++) {
            CreditLineDetail storage detail = details[approvalWorkflow[i]];
            if (detail.responded == true) {// any rejection will cause credit line to close
                if (detail.isOpened == false) {
                    return Status.Rejected;
                }
            } else {
                hasPending = true;
            }

        }
        return hasPending ? Status.Pending : Status.Approved;
    }

    function isOpened() public view returns (bool) {
        if (approvalWorkflow.length == 0) {
            return false;
        }

        for (uint i = 0; i < approvalWorkflow.length; i++) {
            if (details[approvalWorkflow[i]].isOpened == false) {// any rejection will cause credit line to close
                return false;
            }
        }
        return true;
    }

    function getApprovedAmount() public view returns (int) {
        if (!isOpened()) return 0;
        int availAmount = MathUtils.intMax();
        for (uint i = 0; i < approvalWorkflow.length; i++) {
            availAmount = MathUtils.min(details[approvalWorkflow[i]].amount, availAmount);
        }
        assert(availAmount < MathUtils.intMax());
        return availAmount;
    }

    function getAvailableAmount() public view returns (int) {
        int approvedAmount = getApprovedAmount();
        int usedAndFrozenAmount = SafeMath.add(getUsedAmount(), getFrozenAmount());
        if (approvedAmount < usedAndFrozenAmount) {
            return 0;
        } else {
            return SafeMath.sub(approvedAmount, usedAndFrozenAmount);
        }
    }

    function getUsedAmount() public view returns (int) {
        int usedAmount = 0;
        for (uint i = 0; i < loans.length; i++) {
            usedAmount = SafeMath.add(usedAmount, Loan(loans[i]).outstandingPrinciple());
        }
        return usedAmount;
    }

    function getFrozenAmount() public view returns (int) {
        int frozenAmount = 0;
        for (uint i = 0; i < loans.length; i++) {
            Loan loan = Loan(loans[i]);
            if (loan.shouldLockOnCredit()) {
                frozenAmount = SafeMath.add(frozenAmount, loan.totalPrinciple());
            }
        }
        return frozenAmount;
    }

    function getAmount() public view returns (int _frozenAmount, int _usedAmount, int _availableAmount, int _approvedAmount){
        return (getFrozenAmount(), getUsedAmount(), getAvailableAmount(), getApprovedAmount());
    }

    function tap(Loan _loan, int _principle) external {
        require(isIdOrAuthorizedWithAcct(borrower, tx.origin));
        require(getAvailableAmount() >= _principle);

        if (isOpened()) {
            loans.push(_loan);
            emit LoanCreatedEvent(address(_loan));
        }
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
        return isIdOrAuthorized(owner) || isIdOrAuthorized(_id);
    }

}
