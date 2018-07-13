pragma solidity 0.4.23;

import "dappsys.sol";
import "LimitSetting.sol";

contract LimitController is DSMath, DSStop {

    uint256 public mintLimitCounter;
    uint256 public burnLimitCounter;
    uint256 public lastLimitResetTime;
    LimitSetting limitSetting;

    constructor(DSAuthority _authority, LimitSetting limitSetting_) public {
        require(
            address(_authority) != address(0),
            "DSAuthority is mandatory"
        );
        require(
            address(limitSetting_) != address(0),
            "LimitSetting is mandatory"
        );

        limitSetting = limitSetting_;
        resetLimit();
        setAuthority(_authority);
        setOwner(0x0);
    }

    function isWithinMintLimit(address guy, uint256 wad) public returns (bool) {
        //TODO test me and see if this can be split into a separate function
        if (now - lastLimitResetTime >= 1 days) {
            resetLimit();
        }

        //TODO test me with overflows and unexpected state changes
        return (add(mintLimitCounter, wad) <= limitSetting.getMintDailyLimit(guy));
    }

    function isWithinBurnLimit(address guy, uint256 wad) public returns (bool) {
        //TODO test me and see if this can be split into a separate function
        if (now - lastLimitResetTime >= 1 days) {
            resetLimit();
        }

        //TODO test me with overflows and unexpected state changes
        return (add(burnLimitCounter, wad) <= limitSetting.getBurnDailyLimit(guy));
    }

    function bumpMintLimitCounter(uint256 wad) public auth {
        mintLimitCounter = add(mintLimitCounter, wad);
    }

    function bumpBurnLimitCounter(uint256 wad) public auth {
        burnLimitCounter = add(burnLimitCounter, wad);
    }

    function resetLimit() internal stoppable {
        assert(now - lastLimitResetTime >= 1 days);
        uint256 today = now - (now % 1 days);
        lastLimitResetTime = uint256(int256(today) + limitSetting.getLimitCounterResetTimeOffset());
        mintLimitCounter = 0;
        burnLimitCounter = 0;
    }

}
