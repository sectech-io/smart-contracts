pragma solidity ^0.4.18;

interface IIdentityManager {

    function isOwner(address targetAddr, address sender) public view returns(bool result);
    function isOwnerOrAuthorized(address targetAddr, address sender) public view returns(bool);

}