pragma solidity ^0.4.18;

import "./abstract/AccessControlled.sol";
import "./abstract/AdminableUpgradeable.sol";

contract AssetRegistry is AdminableUpgradeable, AccessControlled {

    struct Asset {
        address owner;
        bool canCancel;
    }

    mapping(bytes32 => Asset) public assets;  

    event AssetTransferEvent(bytes32 indexed _asset, address indexed _from, address indexed _to, uint _blocktime);
    event AssetCancelEvent(bytes32 indexed _asset, uint _blocktime);

    function registerAsset(address _assetOwner, bytes32[] _assets) public onlyIdOrAuthorized(_assetOwner) {
        require(_assetOwner != 0);
        require(_assets.length != 0);
        for (uint i = 0; i < _assets.length; i ++){
            bytes32 _asset = _assets[i];
            assets[_asset] = Asset(_assetOwner, true);

            emit AssetTransferEvent(_asset, 0, _assetOwner, now);
        }
    }

    function unregisterAsset(address _assetOwner, bytes32[] _assets) public onlyIdOrAuthorized(_assetOwner) {
        require(_assetOwner != 0);
        require(_assets.length != 0);
        for (uint i = 0; i < _assets.length; i ++){
            bytes32 _asset = _assets[i];
            require(assets[_asset].owner == _assetOwner);
            require(assets[_asset].canCancel == true);

            delete assets[_asset];
            emit AssetCancelEvent(_asset, now);
        }
    }

    function transferAsset(address _from, address _to, bytes32[] _assets) public onlyIdOrAuthorized(_from) {
        require(_from != 0);
        require(_to != 0);
        require(_assets.length != 0);
        for (uint i = 0; i < _assets.length; i ++){
            bytes32 _asset = _assets[i];
            assets[_asset].canCancel = false;
            emit AssetTransferEvent(_asset, _from, _to, now);
        }
    }

    function getAssertOwner (bytes32 _asset) public view returns(address) {
        return assets[_asset].owner;
    }
}
