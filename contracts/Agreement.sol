pragma solidity ^0.4.18;

import "./abstract/OwnedAndPrivate.sol";
import "./abstract/AccessControlled.sol";
import "./abstract/AdminableUpgradeable.sol";
import "./lib/AddressArrayUtils.sol";
import "./lib/CommonDef.sol";
import "./interfaces/IIdentity.sol";
import "./lib/StringUtils.sol";

contract Agreement is AdminableUpgradeable, OwnedAndPrivate, AccessControlled {
    
    event ParticipantStatusChangedEvent(address id, ParticipantStatus status); 
    event ProductConfigChangedEvent(string productId, string ipfsAddr, bool isOpened); 

    enum ParticipantStatus {
        Pending,
        Accepted,
        Rejected,
        Exited
    }

    struct ProductConfig {
        string id;
        string ipfsHash;
        bool isOpened;
    }

    struct ProductConfigHistory {
        string ipfsHash;
        uint validFrom;
    }

    address[] public participants;
    mapping(address => string) public participantsNames;
    address[] public approvalWorkflow;
    ProductConfig[] public productConfigs;
    
    mapping (address => CommonDef.Role) public roles;
    mapping (address => ParticipantStatus) public participantStatus;
    mapping (string => ProductConfigHistory[]) productConfigHistory; // Product Id => ProductConfigHistory[]

    string public encryptionKey; //des加密数据key
    uint public createdTime;

    constructor() public {}

    function initialize() public initializeOnceOnly {
        revert(); // Overload this inherited function to prevent accidental execution which would then block initialize(string _name, address _owner, string _desc) from executing
    }

    function initialize(address _owner, address[] _participants, CommonDef.Role[] _roles, address[] _approvalWorkflow, string _encryptionKey) public initializeOnceOnly {
        require(_participants.length == _roles.length);
        require(AddressArrayUtils.duplicationCheck(_participants) == false);
        require(AddressArrayUtils.duplicationCheck(_approvalWorkflow) == false);
        require(AddressArrayUtils.includeCheck(_participants, _approvalWorkflow) == true);
        participants = _participants;
        approvalWorkflow = _approvalWorkflow;
        encryptionKey = _encryptionKey;
        owner = _owner;

        // Initialize roles map
        for (uint i = 0; i < _participants.length; i++) {
            roles[_participants[i]] = _roles[i];
            if (_owner == _participants[i]) {
                participantStatus[_owner] = ParticipantStatus.Accepted;
            } else {
                participantStatus[_participants[i]] = ParticipantStatus.Pending;
            }
        }

        createdTime = now;
    }

    function setParticipantName(address _participant, string _name) external onlyOwnerOrAuthorized {
        require(AddressArrayUtils.includeCheckSingle(participants, _participant));
        bytes32 nameHash = IIdentity(_participant).getNameHash();
        require(nameHash == keccak256(_name));
        participantsNames[_participant] = _name;
    }

    function getAllAttrs() public view returns(address _owner, uint _participantsCount, uint _approvalWorkflowCount, uint _productConfigsCount, string _encryptionKey){
        return (owner, participants.length, approvalWorkflow.length, productConfigs.length, encryptionKey);
    }

    function getParticipantInfo(uint idx) public view returns(address _participants, CommonDef.Role _role, ParticipantStatus _status, string _name){
        address participant = participants[idx];
        return (participant, roles[participant], participantStatus[participant], participantsNames[participant]);
    }

    function getParticipantsCount() public view returns(uint) {
        return participants.length;
    }

    function getApproverCount() public view returns(uint) {
        return approvalWorkflow.length;
    }

    function getProductConfigCount() public view returns(uint) {
        return productConfigs.length;
    }

    function setApprovalWorkflow(address[] _approvalWorkflow) external onlyOwnerOrAuthorized() {
        require(AddressArrayUtils.duplicationCheck(_approvalWorkflow) == false);
        require(AddressArrayUtils.includeCheck(participants, _approvalWorkflow) == true);
        approvalWorkflow = _approvalWorkflow;
    }

    // @Dev If id doesn't exist, then add to the list, otherwise update the 
    //      current product and push the history
    function updateProductConfig(string _id, string _ipfsHash, bool _isOpened) external onlyOwnerOrAuthorized {
        if (productConfigHistory[_id].length != 0) { // if id exists
            uint idx = findProductConfig(_id);
            productConfigs[idx].ipfsHash = _ipfsHash;
            productConfigs[idx].isOpened = _isOpened;
        } else {
            productConfigs.push(ProductConfig(_id, _ipfsHash, _isOpened));
        }
        productConfigHistory[_id].push(ProductConfigHistory(_ipfsHash, block.timestamp));
        emit ProductConfigChangedEvent(_id, _ipfsHash, _isOpened);
    }

    function getProductConfigHistoryCount(string id) public view returns (uint) {
        return productConfigHistory[id].length;
    }

    function getProductConfigHistory(string id, uint idx) external view returns (string ipfsHash, uint validFrom ){
        ProductConfigHistory storage history = productConfigHistory[id][idx];
        return (history.ipfsHash, history.validFrom);
    }

    function setProductConfigOpened(string _id, bool _isOpened) external onlyOwnerOrAuthorized {
        uint idx = findProductConfig(_id);
        ProductConfig storage config = productConfigs[idx];
        config.isOpened = _isOpened;
        emit ProductConfigChangedEvent(_id, config.ipfsHash, config.isOpened);
    }

    function getProductConfig(string _id) external view returns (string ipfsHash, bool isOpened) {
        uint idx = findProductConfig(_id);
        ProductConfig storage pc = productConfigs[idx];
        return (pc.ipfsHash, pc.isOpened);
    }
    
    function findProductConfig (string id) internal view returns (uint) {
        for (uint i = 0; i < productConfigs.length; i++) {
            if (StringUtils.equal(productConfigs[i].id, id)) {
                return i;
            }
        }
        revert(); // should found it by now.
    }

    function setParticipantStatus(address _id, ParticipantStatus _status) external onlyId(_id) {
        address[] memory toCheck = new address[](1);
        toCheck[0] = _id;
        require(AddressArrayUtils.includeCheck(participants, toCheck)); // make sure the id is in participant list
        participantStatus[_id] = _status;
        emit ParticipantStatusChangedEvent(_id, _status);
    }

    function getOverallStatus() external view returns (ParticipantStatus _status) {
        ParticipantStatus status = ParticipantStatus.Accepted;
        for (uint i = 0; i < participants.length; i ++){
            ParticipantStatus statusTmp = participantStatus[participants[i]];
            if ( statusTmp == ParticipantStatus.Rejected) {
                return ParticipantStatus.Rejected;
            }
            if ( statusTmp == ParticipantStatus.Exited) {
                return ParticipantStatus.Exited;
            }
            if ( statusTmp == ParticipantStatus.Pending) {
                status = ParticipantStatus.Pending;
            }
        }
        return status;
    }

}
