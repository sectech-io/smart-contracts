pragma solidity ^0.4.2;

import './AdminableProxied.sol';
import './AdminableUpgradeable.sol';

contract AdminableProxy is AdminableProxied {
    /*
     * @notice Constructor sets the target and emits an event with the first target
     * @param _target - The target Upgradeable contracts address
     */
    constructor(address _target) public {
        upgradeTo(_target);
    }

    /*
     * @notice Upgrades the contract to a different target that has a changed logic. Can only be called by admin
     * @dev See https://github.com/jackandtheblockstalk/upgradeable-proxy for what can and cannot be done in Upgradeable
     * contracts
     * @param _target - The target Upgradeable contracts address
     */
    function upgradeTo(address _target) public onlyAdmin {
        assert(target != _target);

        address oldTarget = target;
        target = _target;

        emit EventUpgrade(_target, oldTarget, msg.sender);
    }

    /*
     * @notice Performs an upgrade and then executes a transaction. Intended use to upgrade and initialize atomically
     */
    function upgradeTo(address _target, bytes _data) public onlyAdmin {
        upgradeTo(_target);
        assert(target.delegatecall(_data));
    }

    /*
     * @notice Fallback function that will execute code from the target contract to process a function call.
     * @dev Will use the delegatecall opcode to retain the current state of the Proxy contract and use the logic
     * from the target contract to process it.
     */
    function () payable public {
        bytes memory data = msg.data;
        address impl = target;

        assembly {
            let result := delegatecall(gas, impl, add(data, 0x20), mload(data), 0, 0)
            let size := returndatasize

            let ptr := mload(0x40)
            returndatacopy(ptr, 0, size)

            switch result
            case 0 { revert(ptr, size) }
            default { return(ptr, size) }
        }
    }
}
