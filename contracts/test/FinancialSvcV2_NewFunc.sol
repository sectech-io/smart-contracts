pragma solidity ^0.4.18;

import "../abstract/Service.sol";
import "../interfaces/IFinancialSvc.sol";
import "../abstract/AdminableUpgradeable.sol";
import "../FinancialSvc.sol";

contract FinancialSvcV2_NewFunc is FinancialSvc {

    function newGetSvcOwner() external view returns(address) {
        return owner;
    }
}