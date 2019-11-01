pragma solidity ^0.4.18;

import "../interfaces/IIdentity.sol";
import "../interfaces/IIdentityManager.sol";

contract Owned {
    
    address public owner;

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner != address(0)) {
            owner = newOwner;
        }
    }

    modifier onlyOwner {
        require(IIdentityManager(IIdentity(owner).getIdMgr()).isOwner(owner, msg.sender));
        _;
    }

    modifier onlyOwnerOrAuthorized {
        IIdentityManager identityManager = IIdentityManager(IIdentity(owner).getIdMgr());
        require (identityManager.isOwnerOrAuthorized(owner, msg.sender));
        _;
    }
}
