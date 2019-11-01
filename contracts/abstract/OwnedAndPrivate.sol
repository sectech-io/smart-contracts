pragma solidity ^0.4.18;

import "./Owned.sol";

contract OwnedAndPrivate is Owned {

    string[] public privateFor;

    function addPrivateFor(string _newPrivateFor) public onlyOwner {
        privateFor.push(_newPrivateFor);
    }

    function removePrivateFor(string _toBeRemoved) public onlyOwner {
        //removeFromArray(privateFor, _toBeRemoved);
        bool isFound = false;
        for (uint i = 0; i < privateFor.length; i ++) {
            if (keccak256(privateFor[i]) == keccak256(_toBeRemoved)){
                isFound = true;
                break;
            }
        }

        if (!isFound) { // found
            revert();
        } else {
            while (i < privateFor.length - 1) {
                privateFor[i] = privateFor[i+1];
                i++;
            }
            privateFor.length--;
        }
    }

    function privateForCount() public view returns (uint) {
        return privateFor.length;
    }

}