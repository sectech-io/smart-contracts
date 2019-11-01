pragma solidity ^0.4.18;

library AddressArrayUtils {

    /// @return Returns index and ok of the first occurrence starting from index 0
    function index(address[] addresses, address a) internal pure returns (int) {
        for (uint i = 0; i < addresses.length; i++) {
            if (addresses[i] == a) {
                return int(i);
            }
        }
        return -1;
    }

    function extend(address[] storage a, address[] storage b) internal returns (bool) {
        for (uint i = 0; i < b.length; i++) {
            a.push(b[i]);
        }
        return true;
    }

    /** Removes the given value in an array. */
    function removeByValue(address[] storage values, address value) internal {
        int idx = index(values, value);
        if (idx >= 0){
            removeByIndex(values, uint(idx));
        }
    }

    /** Removes the value at the given index in an array. */
    function removeByIndex(address[] storage values, uint idx) internal {
        uint i = idx;
        while (i < values.length-1) {
            values[i] = values[i+1];
            i++;
        }
        values.length--;
    }

    function duplicationCheck(address[] values) internal pure returns (bool) {
        for (uint i = 0; i < values.length; i++) {
            for (uint y = 0; y < values.length; y++) {
                if (i == y) continue;
                if (values[i] == values [y]) return true;
            }
        }
        return false; 
    }

    function includeCheck(address[] values, address[] toBeIncluded) internal pure returns (bool) {
        bool isFound = false;
        for (uint i = 0; i < toBeIncluded.length; i++) {
            isFound = false;
            for (uint y = 0; y < values.length; y++) {
                if (toBeIncluded[i] == values [y]) {
                    isFound = true;
                    break;
                }
            }
            if (!isFound) return false;
        }
        return true;
    }

    function includeCheckSingle(address[] values, address toBeIncluded) internal pure returns (bool) {
        for (uint y = 0; y < values.length; y++) {
            if (toBeIncluded == values [y]) {
                return true;
            }
        }
        return false;
    }
}