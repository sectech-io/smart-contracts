pragma solidity ^0.4.18;

import "../interfaces/IIdentity.sol";
import "../interfaces/IIdentityManager.sol";

contract AccessControlled {

    modifier onlyId(address id) {
        require(IIdentityManager(IIdentity(id).getIdMgr()).isOwner(id, msg.sender));
        _;
    }
    
    modifier onlyIdOrAuthorized(address _id) {
        require (isIdOrAuthorized(_id));
        _;
    }

    modifier onlyIdDelegateOrAuthorized(address _id, address _deleagte) {
        require (isIdOrAuthorized(_id));
        if (_deleagte != address(0)){
            require (isIdOrAuthorized(_deleagte));
        }
        _;
    }

    function isIdOrAuthorized(address _id) internal view returns (bool) {
        IIdentityManager identityManager = IIdentityManager(IIdentity(_id).getIdMgr());
        return (identityManager.isOwnerOrAuthorized(_id, msg.sender));
    }

    function isIdOrAuthorizedWithAcct(address _id, address _acct) internal view returns (bool) {
        IIdentityManager identityManager = IIdentityManager(IIdentity(_id).getIdMgr());
        return (identityManager.isOwnerOrAuthorized(_id, _acct));
    }
}
