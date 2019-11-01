pragma solidity ^0.4.18;


contract RevertTest{

    uint public newValue;

    function revertFunction() public{
        uint a = 1;
        require(a == 0);
    }
}
