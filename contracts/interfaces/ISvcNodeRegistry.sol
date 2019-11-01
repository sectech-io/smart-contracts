pragma solidity ^0.4.18;

interface ISvcNodeRegistry {
    function isRegistered(address svcAddr)  external view returns(bool);
}


