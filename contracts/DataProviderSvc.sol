pragma solidity ^0.4.18;

import "./abstract/Service.sol";
import "./abstract/AccessControlled.sol";
import "./abstract/AdminableUpgradeable.sol";

contract DataProviderSvc is AdminableUpgradeable, Service{

    constructor() public {}

    function initialize() public initializeOnceOnly {
        revert(); // Overload this inherited function to prevent accidental execution which would then block initialize(string _name, address _owner, string _desc) from executing
    }

    function initialize(string _name, address _owner, string _desc) public initializeOnceOnly{
        name = _name;
        owner = _owner;
        desc = _desc;
    }

}