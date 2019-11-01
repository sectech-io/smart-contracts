pragma solidity ^0.4.18;

interface IIdentity {
    function getNameHash() external view returns (bytes32);
    function getIdMgr() external view returns (address);
}