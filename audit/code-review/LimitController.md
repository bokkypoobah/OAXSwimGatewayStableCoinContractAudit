# LimitController

Source file [../../chain/contracts/LimitController.sol](../../chain/contracts/LimitController.sol).

<br />

<hr />

```solidity
// BK Ok
pragma solidity 0.4.23;

// BK Next 2 Ok
import "dappsys.sol";
import "LimitSetting.sol";

// BK NOTE - limitController.address=LimitController:0xb0eeb0a47f153af1da1807db53880e212cdf6c79
// BK NOTE - limitController.authority=FiatTokenGuard:0xfd2dc31157ecf6599df9eafa6871afd33dbea620
// BK NOTE - limitController.owner=0x0000000000000000000000000000000000000000
// BK NOTE - limitController.stopped=false
// BK NOTE - limitController.mintLimitCounter=0
// BK NOTE - limitController.burnLimitCounter=0
// BK NOTE - limitController.lastLimitResetTime=1534291200 Wed, 15 Aug 2018 00:00:00 UTC
// BK NOTE - limitController.limitSetting=LimitSetting:0xa15ac97faf20d873309a67d762acc3968912e688
// BK NOTE - limitController.LogSetAuthority 0 #6992 {"authority":"0xfd2dc31157ecf6599df9eafa6871afd33dbea620"}
// BK NOTE - limitController.LogSetOwner 0 #6992 {"owner":"0xa11aae29840fbb5c86e6fd4cf809eba183aef433"}
// BK NOTE - limitController.LogSetOwner 1 #6992 {"owner":"0x0000000000000000000000000000000000000000"}
contract LimitController is DSMath, DSStop {

    // BK Next 4 Ok
    uint256 public mintLimitCounter;
    uint256 public burnLimitCounter;
    uint256 public lastLimitResetTime;
    LimitSetting public limitSetting;

    // BK Ok - Constructor
    constructor(DSAuthority _authority, LimitSetting limitSetting_) public {
        // BK Ok
        require(
            address(_authority) != address(0),
            "DSAuthority is mandatory"
        );
        // BK Ok
        require(
            address(limitSetting_) != address(0),
            "LimitSetting is mandatory"
        );

        // BK Ok
        limitSetting = limitSetting_;
        // BK Ok
        resetLimit();
        // BK Next 2 Ok
        setAuthority(_authority);
        setOwner(0x0);
    }

    // BK NOTE - Any account can call this function to reset the limits, but it does not matter
    // BK Ok
    function isWithinMintLimit(address guy, uint256 wad) public returns (bool) {
        // BK Ok
        if (now - lastLimitResetTime >= 1 days) {
            // BK Ok
            resetLimit();
        }

        // check if it is within global accumulated limit && custom limit per transaction
        // BK Ok
        return (add(mintLimitCounter, wad) <= limitSetting.getMintDailyLimit(0x0)) &&
            (wad <= limitSetting.getMintDailyLimit(guy));
    }

    // BK NOTE - Any account can call this function to reset the limits, but it does not matter
    // BK Ok
    function isWithinBurnLimit(address guy, uint256 wad) public returns (bool) {
        // BK Ok
        if (now - lastLimitResetTime >= 1 days) {
            // BK Ok
            resetLimit();
        }

        // check if it is within global accumulated limit && custom limit per transaction
        // BK Ok
        return (add(burnLimitCounter, wad) <= limitSetting.getBurnDailyLimit(0x0)) &&
            (wad <= limitSetting.getBurnDailyLimit(guy));
    }

    // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to LimitController:0xb0eeb0a47f153af1da1807db53880e212cdf6c79 for bumpMintLimitCounter(uint256) #7016 0xaee164bd6016cc1fee48b748936c0eef152d307aca4f1fc873a97939879b3547
    // BK Ok - Only GateWithFee (Gate) authorised to execute
    function bumpMintLimitCounter(uint256 wad) public auth {
        // BK Ok
        mintLimitCounter = add(mintLimitCounter, wad);
    }

    // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to LimitController:0xb0eeb0a47f153af1da1807db53880e212cdf6c79 for bumpBurnLimitCounter(uint256) #7016 0xe4e79361855cbe1d73f44ca7956ff9e1eb8af2506e7cb454d3cf9a024a7ff037
    // BK Ok - Only GateWithFee (Gate) authorised to execute
    function bumpBurnLimitCounter(uint256 wad) public auth {
        // BK Ok
        burnLimitCounter = add(burnLimitCounter, wad);
    }

    // BK Ok - Internal function, stoppable
    function resetLimit() internal stoppable {
        // BK Ok
        require(
            now - lastLimitResetTime >= 1 days,
            "Last limit setting time should larger or equal than 1 day to reset the limit counter"
        );
        // BK Ok
        uint256 today = now - (now % 1 days);
        // BK NOTE - `limitSetting.getLimitCounterResetTimeOffset()` returns an `int` and not a `uint`
        // BK Ok
        lastLimitResetTime = uint256(int256(today) + limitSetting.getLimitCounterResetTimeOffset());
        // BK Ok
        mintLimitCounter = 0;
        // BK Ok
        burnLimitCounter = 0;
    }

}

```
