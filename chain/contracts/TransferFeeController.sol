pragma solidity 0.4.23;

import "TransferFeeControllerInterface.sol";
import "dappsys.sol";

contract TransferFeeController is TransferFeeControllerInterface, DSMath, DSAuth {
    //transfer fee is calculated by transferFeeAbs+amt*transferFeeBps
    uint public defaultTransferFeeAbs;
    uint public defaultTransferFeeBps;

    event LogSetDefaultTransferFee(uint defaultTransferFeeAbs, uint defaultTransferFeeBps);

    constructor(DSAuthority _authority, uint defaultTransferFeeAbs_, uint defaultTransferFeeBps_)
    public {
        setAuthority(_authority);
        setOwner(0x0);
        defaultTransferFeeAbs = defaultTransferFeeAbs_;
        defaultTransferFeeBps = defaultTransferFeeBps_;
    }

    function divRoundUp(uint x, uint y) internal pure returns (uint z) {
        require(
            y > 0,
            "Second parameter must be positive"
        );
        z = add(mul(x, 1), y / 2) / y;
    }

    function calculateTransferFee(address /*from*/, address /*to*/, uint wad)
    public
    view
    returns (uint) {
        return add(defaultTransferFeeAbs, divRoundUp(mul(wad, defaultTransferFeeBps), 10000));
    }

    function setDefaultTransferFee(uint defaultTransferFeeAbs_, uint defaultTransferFeeBps_)
    public
    auth
    {
        require(
            defaultTransferFeeBps_ <= 10,
            "Default Transfer Fee Bps must be less than or equal to 10"
        );
        defaultTransferFeeAbs = defaultTransferFeeAbs_;
        defaultTransferFeeBps = defaultTransferFeeBps_;
        emit LogSetDefaultTransferFee(defaultTransferFeeAbs, defaultTransferFeeBps);
    }
}
