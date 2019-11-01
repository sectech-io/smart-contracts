pragma solidity ^0.4.18;

import "../IdentityManager.sol";

contract IdentityManagerV2_NewFunc is IdentityManager {
    uint public newUint;

    function registerIdentity(Identity _id, address _owner, address _svcAddr, string _attestType, uint8 _v, bytes32 _r, bytes32 _s) public
    {
        require(identityMap[keccak256(_id.idHash())] == address(0));
        uint attestLevel = 0;
        // TODO 等待test.support.js相关的API test编写完成（用锚节点创建认证服务商）后再解放注释的代码，该任务延后处理
        if (!isAnchorNode(_id.idHash())) {
            address signAccount = ecrecover(keccak256("\x19Ethereum Signed Message:\n32", keccak256(_attestType, "true", _id.idHash())), _v, _r, _s);
            //            require(
            //                svcNodeRegistry.isRegistered(_svcAddr)
            //                && (isAuthorized(IService(_svcAddr).getOwner(), signAccount) || isOwner(IService(_svcAddr).getOwner(), signAccount))
            //            );
            attestLevel = mapAttestTypeToLevel(_svcAddr, _attestType);
        }

        owners[_id] = _owner;
        identityMap[keccak256(_id.idHash())] = _id;
        _id.setIdMgr(this);
        emit IdentityCreatedEvent(_id, _owner);
        emit IdAttestedLog(_id, _svcAddr, attestLevel, block.timestamp, _attestType);
        newUint = 1;
    }

}