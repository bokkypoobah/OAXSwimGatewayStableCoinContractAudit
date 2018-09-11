# TransferFeeController

Source file [../../chain/contracts/TransferFeeController.sol](../../chain/contracts/TransferFeeController.sol).

<br />

<hr />

```solidity
// BK Ok
pragma solidity 0.4.23;

// BK Next 2 Ok
import "TransferFeeControllerInterface.sol";
import "dappsys.sol";

// BK NOTE - transferFeeController.address=TransferFeeController:0xeaf5be24df38fe58ce2cb4b9e3a3040da6665b21
// BK NOTE - transferFeeController.authority=GateRoles:0xebc427351d2a8d75d52cb1d904438034309d04a1
// BK NOTE - transferFeeController.owner=0x0000000000000000000000000000000000000000
// BK NOTE - transferFeeController.defaultTransferFeeAbs=0
// BK NOTE - transferFeeController.defaultTransferFeeBps=0
// BK Ok
contract TransferFeeController is TransferFeeControllerInterface, DSMath, DSAuth {
    //transfer fee is calculated by transferFeeAbs+amt*transferFeeBps
    // BK Next 2 Ok
    uint public defaultTransferFeeAbs;
    uint public defaultTransferFeeBps;

    // BK Ok - Event
    event LogSetDefaultTransferFee(uint defaultTransferFeeAbs, uint defaultTransferFeeBps);

    // BK Ok - Constructor
    constructor(DSAuthority _authority, uint defaultTransferFeeAbs_, uint defaultTransferFeeBps_)
    public {
        // BK Ok
        setAuthority(_authority);
        // BK Ok
        setOwner(0x0);
        // BK Next 2 Ok
        defaultTransferFeeAbs = defaultTransferFeeAbs_;
        defaultTransferFeeBps = defaultTransferFeeBps_;
    }

    // BK Ok - View function
    function divRoundUp(uint x, uint y) internal pure returns (uint z) {
        // BK Ok
        require(
            y > 0,
            "Second parameter must be positive"
        );
        // BK NOTE - function mul(uint x, uint y) internal pure returns (uint z) {
        // BK NOTE -   require(y == 0 || (z = x * y) / y == x);
        // BK NOTE - }
        // BK NOTE - z = add(mul(x, 1), y / 2) / y;
        // BK NOTE - z = ((x * 1 / 1) + (y / 2)) / y 
        // BK NOTE - mul(x, 1) can be replaced with 1
        z = add(mul(x, 1), y / 2) / y;
    }

    // BK Ok - View function
    function calculateTransferFee(address /*from*/, address /*to*/, uint wad)
    public
    view
    returns (uint) {
        // BK NOTE - result = defaultTransferFeeAbs + divRoundUp(mul(wad, defaultTransferFeeBps), 10000)
        // BK NOTE - mul(wad, defaultTransferFeeBps) = (wad * defaultTransferFeeBps) / defaultTransferFeeBps
        // BK NOTE - divRoundUp(mul(wad, defaultTransferFeeBps), 10000)
        // BK NOTE -   = (([(wad * defaultTransferFeeBps) / defaultTransferFeeBps] * 1 / 1) + (10000 / 2)) / 10000
        // BK NOTE - result = defaultTransferFeeAbs + (([(wad * defaultTransferFeeBps) / defaultTransferFeeBps] * 1 / 1) + (10000 / 2)) / 10000
        return add(defaultTransferFeeAbs, divRoundUp(mul(wad, defaultTransferFeeBps), 10000));
    }

    // BK Ok - Only sysAdmin can execute
    // BK Ok - gateRoles.RoleCapability code TransferFeeController:0xeaf5be24df38fe58ce2cb4b9e3a3040da6665b21 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000002 for setDefaultTransferFee(uint256,uint256) role SYSTEM_ADMIN:1 true #126942 0x1ecc65820a3cccf254b7e178657a1dc32b2d99c62971b866533aff1b64febb78
    function setDefaultTransferFee(uint defaultTransferFeeAbs_, uint defaultTransferFeeBps_)
    public
    auth
    {
        // BK Ok
        require(
            defaultTransferFeeBps_ <= 10,
            "Default Transfer Fee Bps must be less than or equal to 10"
        );
        // BK NOTE - Should log event of changes
        // BK Next 2 Ok
        defaultTransferFeeAbs = defaultTransferFeeAbs_;
        defaultTransferFeeBps = defaultTransferFeeBps_;
        // BK Ok - Log event
        emit LogSetDefaultTransferFee(defaultTransferFeeAbs, defaultTransferFeeBps);
    }
}

```
