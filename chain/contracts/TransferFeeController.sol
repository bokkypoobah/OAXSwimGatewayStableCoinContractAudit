pragma solidity 0.4.19;


import "TransferFeeControllerInterface.sol";
import "dappsys.sol";


contract TransferFeeController is TransferFeeControllerInterface, DSMath, DSAuth {
    //transfer fee is calculated by transferFeeAbs+amt*transferFeeBps
    uint public defaultTransferFeeAbs;

    uint public defaultTransferFeeBps;

    function TransferFeeController(DSAuthority _authority, uint defaultTransferFeeAbs_, uint defaultTransferFeeBps_) 
    public {
        setAuthority(_authority);
        setOwner(0x0);
        defaultTransferFeeAbs = defaultTransferFeeAbs_;
        defaultTransferFeeBps = defaultTransferFeeBps_;
    }

    function calculateTransferFee(address /*from*/, address /*to*/, uint wad)
    public
    view
    returns (uint) {
        return defaultTransferFeeAbs + div(mul(wad, defaultTransferFeeBps), 10000);
    }

    function setDefaultTransferFee(uint defaultTransferFeeAbs_, uint defaultTransferFeeBps_)
    public
    auth
    {
        defaultTransferFeeAbs = defaultTransferFeeAbs_;
        defaultTransferFeeBps = defaultTransferFeeBps_;
    }
}