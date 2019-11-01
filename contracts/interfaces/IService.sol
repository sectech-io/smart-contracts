pragma solidity ^0.4.18;

interface IService {

    function addSupportedType(string supportedType) external;
    /** 
      * @return -1 if not found, otherwise the index found from the array.
      */
    function findSupportedType(string supportedType) external view returns (int);
  
    function removeSupportedType(string supportedType) external;

    function getSupportedType(uint index) external view returns (string);

    function getSupportedTypesLength() external view returns(uint);

    function getOwner() external view returns (address);
}