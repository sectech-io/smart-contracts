pragma solidity ^0.4.18;


import "../CreditLine.sol";

contract CreditLineV2_OverrideFunc is CreditLine {

    function newFunc() public pure returns (uint) {
        return 3;
    }
}
