pragma solidity ^0.4.18;

import "./abstract/AccessControlled.sol";
import "./abstract/AdminableUpgradeable.sol";

contract CreditRegistry is AdminableUpgradeable, AccessControlled {

    struct Transfer {
        address from;
        address to;
        uint timestamp;
        uint blocktime;
    }

    mapping(address => address[]) public receivedCreditLines; // Credit Receiver Identity => CreditLine[]
    mapping(address => address[]) public grantedCreditLines; // Credit Granter Identity => CreditLine[]

    mapping(address => Transfer[]) loanTransfer;  //Loan => Transfer[]

    function registerCreditLine(address _granter, address _grantee, address _creditLine) public {
        require(isIdOrAuthorized(_granter) || isIdOrAuthorized(_grantee));
        receivedCreditLines[_grantee].push(_creditLine);
        grantedCreditLines[_granter].push(_creditLine);
    }

    function registerLoan(address _assetOwner, address _loan, uint _timeStamp) public onlyIdOrAuthorized(_assetOwner) {
        require(loanTransfer[_loan].length == 0);
        loanTransfer[_loan].push(Transfer(0, _assetOwner, _timeStamp, now));
    }

    function transferLoan(address _from, address _to, address _loan, uint _timeStamp) public onlyIdOrAuthorized(_from) {
        require(loanTransfer[_loan].length == 0);
        require(_from != 0);
        require(_to != 0);
        require(_loan != 0);
        loanTransfer[_loan].push(Transfer(_from, _to, _timeStamp, now));
    }

    function getReceivedCreditLines (address _id) public view returns(address[]) {
        return receivedCreditLines[_id];
    }

    function getGrantedCreditLines (address _id) public view returns(address[]) {
        return grantedCreditLines[_id];
    }

    function getLoanTransfers (address _loan) public view returns (address[] _from, address[] _to, uint[] _timestamp, uint[] _blocktime) {
        Transfer[] storage transfers = loanTransfer[_loan];
        address[] memory from = new address[](transfers.length);
        address[] memory to = new address[](transfers.length);
        uint[] memory timestamp = new uint[](transfers.length);
        uint[] memory blocktime = new uint[](transfers.length);

        for (uint i = 0; i < transfers.length; i ++){
            Transfer storage transfer = transfers[i];
            from[i] = transfer.from;
            to[i] = transfer.to;
            timestamp[i] = transfer.timestamp;
            blocktime[i] = transfer.blocktime;
        }
        return (from, to, timestamp, blocktime);
    }
}
