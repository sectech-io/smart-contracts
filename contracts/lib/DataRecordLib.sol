pragma solidity ^0.4.18;


library DataRecordLib {

    struct DRArray {
        DataRecord[] records;
    }

    struct DataRecord {
        uint uploadTime;
        address uploaderAddr;
        string ipfsHash;
        bool isDeleted;
    }

    function addData(DRArray storage _self, address _uploaderAddr, string _ipfsHash) internal {
        _self.records.push(DataRecord(now, _uploaderAddr, _ipfsHash, false));
    }

    function findData(DRArray storage _self, string _ipfsHash) internal view returns (int) {
        DataRecord[] storage data = _self.records;
        for (uint i = 0; i < data.length; i++) {
            if (keccak256(data[i].ipfsHash) == keccak256(_ipfsHash)) {
                return int(i);
            }
        }
        return -1;
    }

    function removeDataByIdx(DRArray storage _self, address _actor, uint _idx) internal {
        require(_idx >= 0 && _idx < _self.records.length);
        _self.records[_idx].isDeleted = true;
    }
}
