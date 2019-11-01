pragma solidity ^0.4.18;
import "./Identity.sol";
import "./DataProviderSvc.sol";
import "./interfaces/IService.sol";
import "./interfaces/ISvcNodeRegistry.sol";
import "./abstract/AdminableUpgradeable.sol";


contract SvcNodeRegistry is AdminableUpgradeable, AccessControlled, ISvcNodeRegistry {

    struct SvcNode {
        address svcAddr;
        int svcType;
        int svcSubType;
    }

    SvcNode[] public svcNodes;
  
    function register(address _svcAddr, int _type, int _subtype) public onlyIdOrAuthorized(IService(_svcAddr).getOwner()) {
        int idx = index(_svcAddr);
        require(idx == -1);
        svcNodes.push(SvcNode(_svcAddr, _type, _subtype));
    }

    function unregister(address _svcAddr) public onlyIdOrAuthorized(IService(_svcAddr).getOwner()) {
        int idx = index(_svcAddr);
        require(idx >= 0);
        removeByIndex(idx);
    }

    function getSvcNodeCount() public view returns (uint) {
        return svcNodes.length;
    }

    function getSvcNode(uint _idx) public view returns (address _id, int _svcType, int _svcSubType ) {
        SvcNode storage node = svcNodes[_idx];
        return (node.svcAddr, node.svcType, node.svcSubType);
    }

    function getSvcNodeByAddr(address _svcAddr) public view returns (address _id, int _svcType, int _svcSubType ) {
        int idx = index(_svcAddr);
        require(idx >= 0);
        return getSvcNode(uint(idx));
    }

    function index(address _svcAddr) internal view returns (int) {
        for (uint i = 0; i < svcNodes.length; i++) {
            if (svcNodes[i].svcAddr == _svcAddr) {
                return int(i);
            }
        }
        return -1;
    }

    function getSvcByType(int _type) public view returns (address[]) {
        uint count = 0;
        for (uint i = 0; i < svcNodes.length; i++) {
            if(svcNodes[i].svcType == _type){
                count ++;
            } 
        }
        address[] memory result = new address[](count);
        count = 0;
        for (i = 0; i < svcNodes.length; i++) {
            if(svcNodes[i].svcType == _type){
                result[count] = svcNodes[i].svcAddr;
                count ++;
            } 
        }
        return result;
    } 

    function removeByIndex(int idx) internal {
        uint i = uint(idx);
        while (i < svcNodes.length - 1) {
            svcNodes[i] = svcNodes[i+1];
            i++;
        }
        svcNodes.length--;
    }


    function isRegistered(address svcAddr) external view returns(bool) {
        for (uint i = 0; i < svcNodes.length; i++) {
            if (svcAddr == svcNodes[i].svcAddr) {
                return true;
            }
        }
        return false;
    }
}
