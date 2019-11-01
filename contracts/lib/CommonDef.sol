pragma solidity ^0.4.18;

library CommonDef
 {
    /* ===================
     *    Shared
     * =================== */
    
    enum IdentityType {
        Individual,
        Company
    }

    enum Role {
        _NoRole,
        Borrower,
        Lender,
        Guarantee,
        Channel,
        AssetBuyer,
        Witness
    }

    struct DataRecord {
        uint uploadTime;
        address uploaderAddr;
        string ipfsHash;
        bool isDeleted;
    }

    /* ===================
     *    Credit Line
     * =================== */

    struct CreditLineHistory {
        address approver;
        address delegate;
        int amount;
        uint validFrom;
        bool isOpened;
        string remark;
    } 


    /* ===================
     *    Loan
     * =================== */
    
    enum PeriodType {
        Day,
        Month,
        Year
    }

    struct Approval {
        bool isApproved;
        bool isResponsed;
        uint timestamp;//时间戳
    }

}
