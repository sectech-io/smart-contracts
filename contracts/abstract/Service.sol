pragma solidity ^0.4.18;

import "./Owned.sol";
import "../interfaces/IService.sol";
import "./AccessControlled.sol";

contract Service is Owned, AccessControlled, IService {

    event OnRequestEvent(address indexed sender,uint indexed token, string dataType, string ipfsAddr);
    event OnRespondEvent(address indexed receiver,uint indexed token, string ipfsAddr, string signature);

    string public name;
    string public desc;
    string[] public supportedTypes;
    address public identityManagerAddr;
    address public svcNodeRegistryAddr;
    uint internal token;

    function addSupportedType(string _supportedType) external onlyOwnerOrAuthorized {
        addSupportedTypeInternal(_supportedType);
    }

    function addSupportedTypeInternal(string _supportedType) internal {
        require(findInternal(_supportedType) == -1);
        supportedTypes.push(_supportedType);
    }

    /** 
      * @return -1 if not found, otherwise the index found from the array.
      */
    function findSupportedType(string _supportedType) external view returns (int){
        return findInternal(_supportedType);
    }

    function findInternal(string _supportedType) internal view returns (int){
        for (uint i = 0; i < supportedTypes.length; i++) {
            if (keccak256(supportedTypes[i]) == keccak256(_supportedType)) {
                return int(i);
            }
        }
        return -1;
    }
  
    function removeSupportedType(string _supportedType) external onlyOwnerOrAuthorized {
        removeSupportedTypeInternal(_supportedType);
    }

    function removeSupportedTypeInternal(string _supportedType) internal onlyOwnerOrAuthorized {
        int index = findInternal(_supportedType);
        if (index == -1) {
            return; // not throw any error;
        }

        for (uint j = uint(index); j < supportedTypes.length - 1; j++) {
            supportedTypes[j] = supportedTypes[j + 1];
        }
        delete supportedTypes[supportedTypes.length - 1];
        supportedTypes.length--;
    }

    function getSupportedType(uint _index) external view returns (string) {
        return supportedTypes[_index];
    }

    function getSupportedTypesLength() external view returns(uint) {
        return supportedTypes.length;
    }

    function getOwner() external view returns (address) {
        return owner;
    }
    
    function getBaseAttrs() external view returns (address _owner, string _name, string _desc, uint _supportedTypesCount) {
        return (owner, name, desc, supportedTypes.length);
    }

    function request(address sender, string dataType, string ipfsAddr) public onlyIdOrAuthorized(sender) {
        require(findInternal(dataType) != -1);
        emit OnRequestEvent(sender, ++token, dataType, ipfsAddr);
    }

    function respond(address receiver, uint token, string ipfsAddr, string signature) public onlyOwnerOrAuthorized {
       emit OnRespondEvent(receiver, token, ipfsAddr, signature);
    }


}