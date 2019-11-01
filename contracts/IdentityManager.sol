pragma solidity ^0.4.18;

import "./abstract/Owned.sol";
import "./abstract/AdminableUpgradeable.sol";
import "./Identity.sol";
import "./interfaces/IService.sol";
import "./interfaces/ISvcNodeRegistry.sol";
import "./interfaces/IIdentityManager.sol";
import "./lib/StringUtils.sol";
import "./AttestationSvc.sol";

contract IdentityManager is AdminableUpgradeable, IIdentityManager {

    event IdentityCreatedEvent(address indexed identity, address owner);
    event IdOwnershipTransferred(address indexed previousOwner, address indexed newOwner, uint attestLevel);
    event IdAuthorized(address indexed targetId, address indexed authorizedId);
    event IdUnauthorized(address indexed targetId, address indexed authorizedId);
    event IdAttestedLog(address indexed id, address attester, uint attestLevel, uint attestTime, string attestType);

    mapping(bytes32 => address) public identityMap; //idHash->identityAddr
    mapping(address => address) public owners; // 企业－>个人, 个人－> account
    mapping(address => address[]) public authorizeds; // 企业 －> 个人，个人－》account
    ISvcNodeRegistry public svcNodeRegistry;

    constructor() public {}

    function initialize() public initializeOnceOnly {
        revert();
        // Overload this inherited function to prevent accidental execution
    }

    function initialize(address _svcNodeRegistry) public initializeOnceOnly {
        svcNodeRegistry = ISvcNodeRegistry(_svcNodeRegistry);
    }

    function isAnchorNode(string _idHash) public returns (bool) {
        if (keccak256(_idHash) == keccak256("0x55ec4ed4443daad879c50d23a3c492d393c3dfa794b2ced8f8f4ca5cde9b8cec")) {
            return true;
        } else if (keccak256(_idHash) == keccak256("0xdfe9959357e51178f9efe2ae7fb8b030cc49aa0004519a783d6a7385a564fb80")) {
            return true;
        }
        return false;
    }

    function registerIdentity(Identity identity, address owner, address svcAddr, string attestType, uint8 v, bytes32 r, bytes32 s) public
    {

        require(identityMap[keccak256(identity.idHash())] == address(0));
        identity.setIdMgr(this);
        if (!isAnchorNode(identity.idHash())) {
            updateAttestLevel(identity,svcAddr,attestType,v,r,s);
        }
        owners[identity] = owner;
        identityMap[keccak256(identity.idHash())] = identity;
        emit IdentityCreatedEvent(identity, owner);

    }

    function getIdentityByIdHash(string _idHash) public view returns (address result) {
        return identityMap[keccak256(_idHash)];
    }

    function setIdentityMsgPubKey(address idAddr, string _msgPubKey) public onlyOwner(idAddr) {
        Identity(idAddr).setMsgPubKey(_msgPubKey);
    }

    function addIdentityNodeKey(address idAddr, string _nodeKey) public onlyOwner(idAddr) {
        Identity(idAddr).addNodeKey(_nodeKey);
    }

    function removeIdentityNodeKey(address idAddr, string _nodeKey) public onlyOwner(idAddr) {
        Identity(idAddr).removeNodeKey(_nodeKey);
    }

    function updateAttestLevel(Identity identity, address svcAddr, string attestType, uint8 v, bytes32 r, bytes32 s) public {
        require(svcNodeRegistry.isRegistered(svcAddr));
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        address signAccount = ecrecover(keccak256(prefix, keccak256(attestType, "true", identity.idHash())), v, r, s);
        address svcOwner = IService(svcAddr).getOwner();

        require(isAuthorized(svcOwner, signAccount) || isOwner(svcOwner, signAccount));
        uint level = mapAttestTypeToLevel(svcAddr, attestType);
        if (equalOrGreaterToOldLevel(level, identity)) {
            identity.setAttestLevel(level);
        }
        emit IdAttestedLog(identity, svcAddr, level, block.timestamp, attestType);
    }

    function resetOwner(Identity identity, address newOwner, address svcAddr, string attestType, uint8 v, bytes32 r, bytes32 s) public {
        require(svcNodeRegistry.isRegistered(svcAddr));
        require(owners[identity] != newOwner);
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        address signAccount = ecrecover(keccak256(prefix, keccak256(attestType, "true", identity.idHash())), v, r, s);
        address svcOwner = IService(svcAddr).getOwner();
        require(isAuthorized(svcOwner, signAccount) || isOwner(svcOwner, signAccount));

        uint level = mapAttestTypeToLevel(svcAddr, attestType);
        require(equalOrGreaterToOldLevel(level, identity));
        identity.setAttestLevel(level);
        address oldOwner = owners[identity];
        owners[identity] = newOwner;
        emit IdAttestedLog(identity, svcAddr, level, block.timestamp, attestType);
        emit IdOwnershipTransferred(oldOwner, newOwner, level);
    }

    function mapAttestTypeToLevel(address svcAddr, string attestType) public view returns (uint){
        uint level = 0;
        AttestationSvc attestSvc = AttestationSvc(svcAddr);
        for (uint i = 0; i < attestSvc.getSupportedTypesLength(); i++) {
            if (keccak256(attestSvc.supportedTypes(i)) == keccak256(attestType)) {
                level = attestSvc.getAttestTypeLevel(attestSvc.supportedTypes(i));
            }
        }
        return level;
    }

    function equalOrGreaterToOldLevel(uint level, Identity identity) private view returns (bool) {
        bool isEqualCapValue = (keccak256(identity.idType()) == keccak256(Identity.Type.Individual)) ? (level == 4) : (level == 3);
        return (identity.attestLevel() < level || isEqualCapValue);
    }


    function getOwner(address idAddr) public view returns (address) {
        return owners[idAddr];
    }

    function getAuthorizedAddrs(address idAddr) public view returns (address[]) {
        return authorizeds[idAddr];
    }

    function transferOwnerShip(Identity identity, address newOwner) public onlyOwner(identity) {
        address oldOwner = owners[identity];
        owners[identity] = newOwner;
        emit IdOwnershipTransferred(oldOwner, newOwner, identity.attestLevel());
    }

    function authorize(address tagAddr, address authorizedAddr) public onlyOwner(tagAddr) {
        uint length = authorizeds[tagAddr].length;
        bool isExist = false;
        for (uint i = 0; i < length; i++) {
            if (authorizeds[tagAddr][i] == authorizedAddr) {
                isExist = true;
            }
        }
        if (!isExist) {
            authorizeds[tagAddr].push(authorizedAddr);
            emit IdAuthorized(tagAddr, authorizedAddr);
        }
    }

    function unauthorize(address tagAddr, address unauthorizedAddr) public onlyOwner(tagAddr) {
        uint index = authorizeds[tagAddr].length;
        for (uint i = 0; i < authorizeds[tagAddr].length; i++) {
            if (authorizeds[tagAddr][i] == unauthorizedAddr) {
                index = i;
            }
        }
        if (index >= authorizeds[tagAddr].length) return;
        for (uint j = index; j < authorizeds[tagAddr].length - 1; j++) {
            authorizeds[tagAddr][j] = authorizeds[tagAddr][j + 1];
        }
        delete authorizeds[tagAddr][authorizeds[tagAddr].length - 1];
        emit IdUnauthorized(tagAddr, unauthorizedAddr);
        authorizeds[tagAddr].length--;
    }

    //判断操作者是否为owner
    function isOwner(address targetAddr, address sender) public view returns (bool result) {
        address idAddress = owners[targetAddr];
        //如果targetAddr 是个人IdAddr  owners[targetAddr]＝sender
        if (idAddress == sender) {
            return true;
        }
        //如果targetAddr是企业Idaddr    owners[owners[targetAddr]]=sender
        else if (owners[idAddress] == sender) {
            return true;
        } else {
            return false;
        }
    }

    //判断操作者是否为authorize
    function isAuthorized(address targetAddr, address sender) public view returns (bool result) {
        result = false;
        for (uint i = 0; i < authorizeds[targetAddr].length; i++) {
            //如果targetAddr 是个人IdAddr authorizeds[targetAddr] 含有sender
            if (authorizeds[targetAddr][i] == sender) {
                result = true;
            }
            //如果targetAddr 是企业IdAddr owners[authorizeds[targetAddr]] 含有sender
            if (owners[authorizeds[targetAddr][i]] == sender) {
                result = true;
            }
        }
    }

    function isOwnerOrAuthorized(address targetAddr, address sender) public view returns (bool){
        return isOwner(targetAddr, sender) || isAuthorized(targetAddr, sender);
    }

    //只有owner可以操作
    modifier onlyOwner(address targetAddr) {
        require(isOwner(targetAddr, msg.sender));
        _;
    }
    //只有owner或者授权人可以操作
    modifier onlyOwnerOrAuthorized(address targetAddr) {
        require(isOwner(targetAddr, msg.sender) || isAuthorized(targetAddr, msg.sender));
        _;
    }

}
