pragma solidity ^0.4.18;

import "./abstract/Service.sol";
import "./interfaces/IAttestationSvc.sol";
import "./abstract/AdminableUpgradeable.sol";

contract AttestationSvc is AdminableUpgradeable, Service, IAttestationSvc {

    event OnAttestReqEvent(string data);
    event OnAttestRespEvent(string transactionHashToken, string attestType, uint level, bool attestResult, uint8 v, bytes32 r, bytes32 s);
    event OnSignContractEvent(string data, string dataType, address loanAddress, address idAddr);
    event OnContractSignatureRespEvent(string transactionHashToken, string respData, string dataType, bool callBackResult, uint8 v, bytes32 r, bytes32 s);

    mapping (string => uint) attestLevelMapping; // attestType => attestLevel

    constructor() public {}

    function initialize() public initializeOnceOnly {
        revert(); // Overload this inherited function to prevent accidental execution which would then block initialize(string _name, address _owner, string _desc) from executing
    }

    function initialize(string _name, address _owner) public initializeOnceOnly {
        name = _name;
        owner = _owner;


    }

    function getAttestTypeLevel(string attestType) public view returns (uint length) {
        return attestLevelMapping[attestType];
    }

    function addSupportedAttestationType(string supportedType, uint attestLevel) public onlyOwnerOrAuthorized {
        super.addSupportedTypeInternal(supportedType);
        attestLevelMapping[supportedType] = attestLevel;
    }


  
    function removeSupportedAttestationType(string _supportedType) external onlyOwnerOrAuthorized {
        super.removeSupportedTypeInternal(_supportedType);
        delete attestLevelMapping[_supportedType];
    }

    function getSupportedAttestationType(uint index) public view returns (string, uint) {
        string storage found = supportedTypes[index];
        return (found, attestLevelMapping[found]);
    }


    function request(address sender, string dataType, string ipfsAddr) {
        require(findInternal(dataType) != -1);
        emit OnRequestEvent(sender, ++token, dataType, ipfsAddr);
    }





}
