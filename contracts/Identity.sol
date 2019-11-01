pragma solidity ^0.4.18;

import "./abstract/AccessControlled.sol";
import "./lib/CommonDef.sol";
import "./abstract/AdminableUpgradeable.sol";

contract Identity is AdminableUpgradeable, IIdentity, AccessControlled {

    event OnNotifyEvent(Identity.EventType eventType, address senderIdAddr, string action, string data);
    event LogAttestationRecord(uint recordId);
    event LogDataChanged(uint dataId);

    enum Type {
        Individual,
        Company
    }
    
    enum EventType {
        ATTEST,
        DATA_PROVIDE
    }


    struct IpfsDataRecord {
        address dataProvider;
        uint uploadTime;
        string ipfsAddr;            
    }
    
    address public idMgr;

    string public idHash;
    bytes32 public nameHash;
    Type public idType;
    uint public attestLevel;
    bool public isSvcNode;
    string public msgPubKey;
    string[] public resideAtNodes;
    CommonDef.DataRecord[] public dataRecords;

    constructor() public {}

    function initialize() public initializeOnceOnly {
        revert(); // Overload this inherited function to prevent accidental execution which would then block initialize(string _name, address _owner, string _desc) from executing
    }

    function initialize(string _idHash, bytes32 _nameHash, bool _isSvcNode, Identity.Type _type, string _msgPubKey, string _nodeKey) public initializeOnceOnly {
        require(keccak256(_msgPubKey) != keccak256("") && keccak256(_nodeKey) != keccak256("") );
        isSvcNode = _isSvcNode;
        idType = _type;
        msgPubKey = _msgPubKey;
        resideAtNodes.push(_nodeKey);
        nameHash = _nameHash;
        idHash = _idHash;
    }

    function getAllAttrs() external view returns (Type _idType, uint _attestLevel, uint _resideAtNodesCount, uint _dataRecordsCount ) {
        return (idType, attestLevel, resideAtNodes.length, dataRecords.length);
    }

    function setIdMgr(address _idMgr) public {
        require(idMgr == address(0));
        idMgr = _idMgr;
    }

    function getIdMgr() external view returns (address) {
        return idMgr;
    }

    function getNameHash() external view returns (bytes32) {
        return nameHash;
    }
  
    function setNameHash(bytes32 _nameHash) public onlyIdMgr {
        nameHash = _nameHash;
    }
  
    function setAttestLevel(uint _attestLevel) public onlyIdMgr {
        attestLevel = _attestLevel;
    }

    function setMsgPubKey(string _msgPubKey) public onlyIdMgr {
        msgPubKey = _msgPubKey;
    }
  
    function setIsSvcNode(bool _isSvcNode) public onlyIdMgr {
        isSvcNode = _isSvcNode;
    }
  
    function addNodeKey(string nodeKey) public onlyIdMgr {
        resideAtNodes.push(nodeKey);
    }
  
    function removeNodeKey(string nodeKey) public onlyIdMgr {
        uint index = resideAtNodes.length;
        for (uint i = 0; i < resideAtNodes.length; i++) {
            if (keccak256(resideAtNodes[i]) == keccak256(nodeKey)) {
                index = i;
            }
        }
        if (index >= resideAtNodes.length) {
            return;
        }
        for (uint j = index; j < resideAtNodes.length - 1; j++) {
            resideAtNodes[j] = resideAtNodes[j + 1];
        }
        delete resideAtNodes[resideAtNodes.length - 1];
        resideAtNodes.length--;
    }
  
    function getResideAtNodesLength() public view returns(uint) {
        return resideAtNodes.length;
    }
  
    function getDataRecordCount() public view returns(uint) {
        return dataRecords.length;
    }
  
    function getDataRecord(uint _idx) public view returns (string _ipfsHash, address _uploader, uint _uploadTime, bool _isDeleted) {
        CommonDef.DataRecord storage record = dataRecords[_idx];
        return (record.ipfsHash, record.uploaderAddr, record.uploadTime, record.isDeleted);
    }
  
    function notify(Identity.EventType eventType, address sender, string action, string data) public {
        emit OnNotifyEvent(eventType, sender, action, data);
    }

    function addDataRecord(address _uploader, string _ipfsHash) public {
        require(idMgr == msg.sender || (isIdOrAuthorized(this) && isIdOrAuthorized(_uploader)));
        dataRecords.push(CommonDef.DataRecord(now, _uploader, _ipfsHash, false));
        emit LogDataChanged(dataRecords.length - 1);
    }

    
    function setDataRecordDeleted(uint _idx, bool _isDeleted) public  {
        require(isIdOrAuthorized(this));
        dataRecords[_idx].isDeleted = _isDeleted;
    }



    modifier onlyIdMgr {
        require(idMgr == msg.sender );
        _;
    }

}
