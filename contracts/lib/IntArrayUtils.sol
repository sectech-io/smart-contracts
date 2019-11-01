pragma solidity ^0.4.18;

library IntArrayUtils {

    /// @return Returns index and ok of the first occurrence starting from index 0
    function index(uint[] values, uint a) internal pure returns (int) {
        for (uint i = 0; i < values.length; i++) {
            if (values[i] == a) {
                return int(i);
            }
        }
        return -1;
    }

    function extend(uint[] storage a, uint[] storage b) internal returns (bool) {
        for (uint i = 0; i < b.length; i++) {
            a.push(b[i]);
        }
        return true;
    }

    /** Removes the given value in an array. */
    function removeByValue(uint[] storage values, uint value) internal {
        int idx = index(values, value);
        if (idx >= 0){
            removeByIndex(values, uint(idx));
        }
    }

    /** Removes the value at the given index in an array. */
    function removeByIndex(uint[] storage values, uint idx) internal {
        uint i = idx;
        while (i < values.length-1) {
            values[i] = values[i+1];
            i++;
        }
        values.length--;
    }

    function duplicationCheck(uint[] values) internal pure returns (bool) {
        for (uint i = 0; i < values.length; i++) {
            for (uint y = 0; y < values.length; y++) {
                if (i == y) continue;
                if (values[i] == values [y]) return true;
            }
        }
        return false; 
    }

}