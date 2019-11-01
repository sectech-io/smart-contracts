pragma solidity ^0.4.18;

import "../Loan.sol";

interface ICreditLine {
    function tap(Loan _loan, int _principle) external;
    function getBorrower() external returns (address);
    function getLender() external returns (address);
}
