pragma solidity ^0.4.18;

import "./abstract/Service.sol";
import "./interfaces/IFinancialSvc.sol";
import "./abstract/AdminableUpgradeable.sol";

contract FinancialSvc is AdminableUpgradeable, Service, IFinancialSvc {

    event ProductAddedEvent(uint idx);

    struct Detail {
        string ipfsHash;
        bool isEnabled;
    }

    Detail[] products;

    constructor() public {}

    function initialize() public initializeOnceOnly {
        revert(); // Overload this inherited function to prevent accidental execution which would then block initialize(string _name, address _owner, string _desc) from executing
    }

    function initialize(string _name, address _owner, string _desc) public initializeOnceOnly {
        name = _name;
        owner = _owner;
        desc = _desc;
    }

    function addProduct(string _ipfsHash, bool _isEnabled) external onlyOwnerOrAuthorized {
        products.push(Detail(_ipfsHash, _isEnabled));
        emit ProductAddedEvent(products.length - 1);
    }

    function getProductCount() external view returns (uint) {
        return products.length;
    }

    function getProduct(uint _idx) external view returns (string _ipfsHash, bool _isEnabled) {
        Detail storage detail = products[_idx];
        return (detail.ipfsHash, detail.isEnabled);
    }

    function setProductEnabled (uint _idx, bool _isEnabled) external onlyOwnerOrAuthorized {
        products[_idx].isEnabled = _isEnabled;
    }

    function setProductIpfs (uint _idx, string _ipfsHash, bool _isEnabled) external onlyOwnerOrAuthorized {
        products[_idx].ipfsHash = _ipfsHash;
        products[_idx].isEnabled = _isEnabled;
    }

    function getSvcOwner() view public returns (address) {
        return owner;
    }

    function getA() view public returns (uint) {
        return 1;
    }

}