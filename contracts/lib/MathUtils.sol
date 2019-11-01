pragma solidity ^0.4.18;

library MathUtils {

    int256 constant INT256_MIN = int256((uint256(1) << 255));
    int256 constant INT256_MAX = int256(~((uint256(1) << 255)));
    uint256 constant UINT256_MIN = 0;
    uint256 constant UINT256_MAX = ~uint256(0);

    function intMax() public pure returns (int256){
        return INT256_MAX;
    }

    function min (int a, int b) public pure returns (int){
        return (a > b) ? b : a;
    }

    function floor(int _valueToFloor, int _floor) public pure returns (int){
        if (_valueToFloor < _floor) {
            return _floor;
        } else {
            return _valueToFloor;
        }
    }
}
