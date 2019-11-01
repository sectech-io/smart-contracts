pragma solidity ^0.4.18;

import "./CommonDef.sol";
import "./AddressArrayUtils.sol";

library LoanLib {

    event ActionEvent(address actor, address delegate, LoanAction action, uint blockTime);

    enum RepayState {
        Due,
        PaymentRequested,
        PaymentConfirmed,
        PaymentRejected
    }

    enum LoanAction {
        Apply,
        Approve,
        Reject,
        Cancel,
        DisbursementRequest,
        DisbursementCancel,
        DisbursementConfirm,
        RepaymentRequest,
        RepaymentConfirm,
        RepaymentReject,
        Recall
    }

    enum LoanState {
        PendingOnApproval,
        Approved,
        Rejected,
        Cancelled,
        PendingOnConfirmDisbursement,
        Repaying,
        Completed
    }

    struct ScheduledPayment {
        uint dueTime; //应还时间
        int duePrinciple; //应还本金
        int dueInterest; //应还利息
        bool isCompleted;//是否结清
        address debtor;//应还SecId
        int scheduledPaymentSequence; //应还期数
    }

    struct Payment {
        uint spIdx;
        int paidPrinciple; //已还金额
        int paidInterest;
        uint paidTime; //实际还款时间
        uint confirmBlockTime;//确认还款时间
        bool markScheduledPaymentCompleted;
        RepayState state;
    }

    struct SP {
        ScheduledPayment[] sPayments;
    }

    struct Payments {
        Payment[] payments;
    }

    function validateInput(address[] _participants, CommonDef.Role[] _roles, address[] _approvalWorkflow) internal pure {
        require(_participants.length == _roles.length);
        require(AddressArrayUtils.duplicationCheck(_participants) == false);
        require(AddressArrayUtils.duplicationCheck(_approvalWorkflow) == false);
        require(AddressArrayUtils.includeCheck(_participants, _approvalWorkflow) == true);
    }

    function updatePaymentSchedule(SP storage _sp, uint[] _dueTime, int[] _duePrinciple, int[] _dueInterest, int _principle, address[] _debtor, int[] _scheduledPaymentSequence) internal returns (int) {
        require(_dueTime.length == _duePrinciple.length);
        require(_dueTime.length == _dueInterest.length);
        int mTotalInterests = 0;
        int mTotalPrinciple = 0;
        for (uint i = 0; i < _dueTime.length; i ++) {
            _sp.sPayments.push(ScheduledPayment(_dueTime[i], _duePrinciple[i], _dueInterest[i], false, _debtor[i], _scheduledPaymentSequence[i]));
            mTotalInterests = mTotalInterests + _dueInterest[i];
            mTotalPrinciple = mTotalPrinciple + _duePrinciple[i];
        }
        require(mTotalPrinciple == _principle);
        return mTotalInterests;
    }

    function isScheduledPaymentCompleted(SP storage _sp, uint _idx) public view returns (bool){
        ScheduledPayment storage pmt = _sp.sPayments[_idx];
        return pmt.isCompleted;
    }

    function repayRequest(SP storage _sp, Payments storage _pmts, uint _idx, address _delegate, uint _paidTime, int _paidPrinciple, int _paidInterest, bool _markScheduledPaymentCompleted, address _borrower) internal
    {
        require(isScheduledPaymentCompleted(_sp, _idx) == false);
        _pmts.payments.push(Payment(_idx, _paidPrinciple, _paidInterest, _paidTime, 0, _markScheduledPaymentCompleted, RepayState.PaymentRequested));
        action(_borrower, _delegate, LoanAction.RepaymentRequest);
    }

    function repayConfirm(SP storage _sp, Payments storage _pmts, uint _idx, address _delegate, address _lender) internal
    {
        Payment storage pmt = _pmts.payments[_idx];
        require(isScheduledPaymentCompleted(_sp, pmt.spIdx) == false);
        pmt.state = RepayState.PaymentConfirmed;
        pmt.confirmBlockTime = now;
        if (pmt.markScheduledPaymentCompleted == true) {
            _sp.sPayments[pmt.spIdx].isCompleted = true;
        }
        action(_lender, _delegate, LoanAction.RepaymentConfirm);
    }

    function repayReject(Payments storage _pmts, uint _idx, address _actor, address _delegate) internal
    {
        Payment storage pmt = _pmts.payments[_idx];
        require(pmt.state == RepayState.PaymentRequested);
        pmt.state = RepayState.PaymentRejected;
        action(_actor, _delegate, LoanAction.RepaymentReject);
    }

    function isCompleted(SP storage _sp) public view returns (bool){
        for (uint i = 0; i < _sp.sPayments.length; i++) {
            if (isScheduledPaymentCompleted(_sp, i) == false) {
                return false;
            }
        }
        return true;
    }

    function action(address _actor, address _delegate, LoanAction _action) internal
    {
        emit ActionEvent(_actor, _delegate, _action, now);
    }

}
