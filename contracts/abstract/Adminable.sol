pragma solidity ^0.4.18;


/**
 * @title Adminable
 * @dev The Adminable contract has an admin address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 * @author https://github.com/OpenZeppelin/zeppelin-solidity
 */
contract Adminable {
  address public admin;

  event AdminshipTransferred(address indexed previousAdmin, address indexed newAdmin);


  /**
   * @dev The Adminable constructor sets the original `admin` of the contract to the sender
   * account.
   */
  constructor() public {
    admin = msg.sender;
  }

  /**
   * @dev Throws if called by any account other than the admin.
   */
  modifier onlyAdmin() {
    require(msg.sender == admin);
    _;
  }

  /**
   * @dev Allows the current admin to transfer control of the contract to a newAdmin.
   * @param newAdmin The address to transfer adminship to.
   */
  function transferAdminship(address newAdmin) public onlyAdmin {
    require(newAdmin != address(0));
    emit AdminshipTransferred(admin, newAdmin);
    admin = newAdmin;
  }

}
