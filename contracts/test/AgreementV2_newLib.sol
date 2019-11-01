pragma solidity ^0.4.18;

import "../Agreement.sol";
import "./lib/New_AddressArrayUtils.sol";

contract AgreementV2_newLib is Agreement{

    uint public newValue;

    function setApprovalWorkflow(address[] _approvalWorkflow) external onlyOwnerOrAuthorized() {
        require(AddressArrayUtils.duplicationCheck(_approvalWorkflow) == false);
        require(AddressArrayUtils.includeCheck(participants, _approvalWorkflow) == true);
        approvalWorkflow = _approvalWorkflow;
        newValue = New_AddressArrayUtils.newFunc();
    }
}
