pragma solidity ^0.4.18;
interface IFinancialSvc {
    function addProduct(string _ipfsHash, bool _isEnabled) external;
    function getProductCount() external view returns (uint);
    function getProduct(uint _idx) external view returns (string _ipfsHash, bool _isEnabled);
    function setProductEnabled (uint _idx, bool _isEnabled) external;
    function getSvcOwner() external view returns (address);
    function setProductIpfs (uint _idx, string _ipfsHash, bool _isEnabled) external;
}